import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseEntryDto } from './dto/purchase-entry.dto';
import { AuditAdjustmentDto } from './dto/audit-adjustment.dto';
import { InventoryTransactionType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async recordPurchase(storeId: string, userId: string, dto: PurchaseEntryDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Purchase entry must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const currentStock = Number(product.stock);
        const purchaseQty = item.quantity;
        const newStock = currentStock + purchaseQty;

        // Prepare updates
        const updateData: any = { stock: newStock };
        if (item.purchasePrice !== undefined) {
          updateData.purchasePrice = item.purchasePrice;
        }

        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: updateData,
        });

        const log = await tx.inventoryTransaction.create({
          data: {
            storeId,
            productId: product.id,
            userId,
            type: InventoryTransactionType.PURCHASE,
            quantity: purchaseQty,
            beforeStock: product.stock,
            afterStock: newStock,
            description: `Purchase entry restock. ${item.purchasePrice !== undefined ? `Updated purchase price to ₹${item.purchasePrice}` : ''}`,
          },
          include: {
            product: true,
          },
        });

        results.push(log);
      }

      return results;
    });
  }

  async recordAuditAdjustment(storeId: string, userId: string, dto: AuditAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.productId, storeId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }

      const currentStock = Number(product.stock);
      const targetStock = dto.actualStock;
      const difference = targetStock - currentStock;

      if (difference === 0) {
        throw new BadRequestException('Target stock is identical to current stock, no adjustment needed');
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: targetStock },
      });

      const log = await tx.inventoryTransaction.create({
        data: {
          storeId,
          productId: product.id,
          userId,
          type: InventoryTransactionType.AUDIT_ADJUSTMENT,
          quantity: difference,
          beforeStock: product.stock,
          afterStock: targetStock,
          description: dto.reason || 'Manual stock audit check',
        },
        include: {
          product: true,
          user: { select: { id: true, name: true } },
        },
      });

      return log;
    });
  }

  async getTransactionHistory(storeId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { storeId },
      include: {
        product: { select: { id: true, name: true, barcode: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLowStockAlerts(storeId: string) {
    return this.prisma.product.findMany({
      where: {
        storeId,
        stock: {
          lt: 15.0, // Threshold: Stock under 15 units is marked as low stock
        },
      },
      include: {
        category: true,
      },
      orderBy: { stock: 'asc' },
    });
  }
}
