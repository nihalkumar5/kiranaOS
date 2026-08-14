import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, InventoryTransactionType, Role } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(storeId: string, userId: string, dto: CreateOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Generate readable sequential bill number for the store
      const lastOrder = await tx.order.findFirst({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });

      let nextNum = 1001;
      if (lastOrder && lastOrder.billNumber) {
        const parts = lastOrder.billNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      const billNumber = `KOS-${nextNum}`;

      // 2. Process items, check stock, calculate totals and GST (inclusive pricing model)
      let accumulatedSubtotal = 0;
      let accumulatedGstAmount = 0;
      let accumulatedTotalAmount = 0;
      const orderItemsData = [];
      const stockUpdates = [];
      const inventoryTransactionsData = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const stockNum = Number(product.stock);
        if (stockNum < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${stockNum} ${product.unit}(s), Requested: ${item.quantity}`
          );
        }

        const sellingPrice = Number(product.sellingPrice);
        const gstRate = Number(product.gst);

        // inclusive price math
        const itemTotal = sellingPrice * item.quantity;
        const basePrice = sellingPrice / (1 + gstRate / 100);
        const itemGst = (sellingPrice - basePrice) * item.quantity;
        const itemSubtotal = itemTotal - itemGst;

        accumulatedSubtotal += itemSubtotal;
        accumulatedGstAmount += itemGst;
        accumulatedTotalAmount += itemTotal;

        // Prepare order item payload
        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.sellingPrice,
          gstRate: product.gst,
          gstAmount: itemGst,
        });

        // Prepare inventory stock decrement and transaction log
        stockUpdates.push({
          id: product.id,
          newStock: stockNum - item.quantity,
        });

        inventoryTransactionsData.push({
          storeId,
          productId: product.id,
          userId,
          type: InventoryTransactionType.SALE,
          quantity: -item.quantity, // negative for sale
          beforeStock: product.stock,
          afterStock: stockNum - item.quantity,
          description: `POS Bill checkout: ${billNumber}`,
        });
      }

      // Apply flat discount
      const discount = dto.discount || 0;
      const finalTotalAmount = Math.max(0, accumulatedTotalAmount - discount);

      // 3. Perform stock updates in DB
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.id },
          data: { stock: update.newStock },
        });
      }

      // 4. Perform inventory logs in DB
      for (const log of inventoryTransactionsData) {
        await tx.inventoryTransaction.create({
          data: log,
        });
      }

      // 5. Create Order
      const order = await tx.order.create({
        data: {
          billNumber,
          storeId,
          userId,
          customerId: dto.customerId || null,
          subtotal: accumulatedSubtotal,
          discount,
          gstAmount: accumulatedGstAmount,
          totalAmount: finalTotalAmount,
          paymentMode: dto.paymentMode,
          status: OrderStatus.COMPLETED,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: {
            select: { id: true, name: true },
          },
        },
      });

      // 6. Update customer aggregates if customer attached
      if (dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            // Spend and visit aggregation will be checked dynamically, but we update timestamp
            updatedAt: new Date(),
          },
        });
      }

      return order;
    });

    this.eventsGateway.sendToStore(storeId, 'new-order', order);
    return order;
  }

  async findAll(storeId: string) {
    return this.prisma.order.findMany({
      where: { storeId },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(storeId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, storeId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancel(storeId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, storeId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order is already cancelled');
      }

      // Restock items and log inventory returns
      for (const item of order.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (product) {
          const currentStock = Number(product.stock);
          const returnedQty = Number(item.quantity);
          const newStock = currentStock + returnedQty;

          await tx.product.update({
            where: { id: product.id },
            data: { stock: newStock },
          });

          await tx.inventoryTransaction.create({
            data: {
              storeId,
              productId: product.id,
              userId,
              type: InventoryTransactionType.RETURN,
              quantity: returnedQty,
              beforeStock: product.stock,
              afterStock: newStock,
              description: `Cancelled Order: ${order.billNumber}`,
            },
          });
        }
      }

      // Update order status
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
      });
    });
  }
}
