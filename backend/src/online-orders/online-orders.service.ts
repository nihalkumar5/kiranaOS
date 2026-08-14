import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { OnlineOrderStatus, InventoryTransactionType } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OnlineOrdersService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async getPublicStoreProducts(storeId: string) {
    const storeExists = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!storeExists) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.product.findMany({
      where: {
        storeId,
        stock: {
          gt: 0, // Online customers can only browse in-stock products
        },
      },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createOnlineOrder(storeId: string, dto: CreateOnlineOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer by mobile
      let customer = await tx.customer.findFirst({
        where: { mobile: dto.customerMobile, storeId },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            mobile: dto.customerMobile,
            name: dto.customerName,
            storeId,
          },
        });
      }

      // 2. Validate products and calculate totals
      let accumulatedTotal = 0;
      const orderItemsData = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const price = Number(product.sellingPrice);
        const itemTotal = price * item.quantity;
        accumulatedTotal += itemTotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.sellingPrice,
        });
      }

      // 3. Create Online Order
      return tx.onlineOrder.create({
        data: {
          storeId,
          customerId: customer.id,
          status: OnlineOrderStatus.PENDING,
          subtotal: accumulatedTotal,
          totalAmount: accumulatedTotal,
          paymentMode: dto.paymentMode,
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
        },
      });
    });

    // 4. Emit WebSocket event to Admin client in real-time
    this.eventsGateway.sendToStore(storeId, 'new-online-order', order);

    return order;
  }

  async findAll(storeId: string) {
    return this.prisma.onlineOrder.findMany({
      where: { storeId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    storeId: string,
    userId: string,
    orderId: string,
    status: OnlineOrderStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.onlineOrder.findFirst({
        where: { id: orderId, storeId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Online order not found');
      }

      const prevStatus = order.status;

      // Avoid redundant state changes
      if (prevStatus === status) {
        return order;
      }

      // State Transition logic: Deduct stock when APPROVED
      if (prevStatus === OnlineOrderStatus.PENDING && (status === OnlineOrderStatus.APPROVED || status === OnlineOrderStatus.READY)) {
        // Deduct inventory
        for (const item of order.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, storeId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }

          const currentStock = Number(product.stock);
          const orderQty = Number(item.quantity);

          if (currentStock < orderQty) {
            throw new BadRequestException(
              `Insufficient stock to approve order for product: ${product.name}. Available: ${currentStock}, Requested: ${orderQty}`
            );
          }

          const newStock = currentStock - orderQty;

          await tx.product.update({
            where: { id: product.id },
            data: { stock: newStock },
          });

          await tx.inventoryTransaction.create({
            data: {
              storeId,
              productId: product.id,
              userId,
              type: InventoryTransactionType.SALE,
              quantity: -orderQty,
              beforeStock: product.stock,
              afterStock: newStock,
              description: `Online Order Approved: #${order.id.slice(0, 8)}`,
            },
          });
        }
      }

      // State Transition logic: Restore stock if APPROVED order is CANCELLED
      if ((prevStatus === OnlineOrderStatus.APPROVED || prevStatus === OnlineOrderStatus.READY) && status === OnlineOrderStatus.CANCELLED) {
        // Restore inventory
        for (const item of order.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, storeId },
          });

          if (product) {
            const currentStock = Number(product.stock);
            const orderQty = Number(item.quantity);
            const newStock = currentStock + orderQty;

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
                quantity: orderQty,
                beforeStock: product.stock,
                afterStock: newStock,
                description: `Online Order Cancelled: #${order.id.slice(0, 8)}`,
              },
            });
          }
        }
      }

      // Update Order record
      return tx.onlineOrder.update({
        where: { id: orderId },
        data: {
          status,
          paymentStatus: status === OnlineOrderStatus.PICKED_UP ? 'PAID' : undefined,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }
}
