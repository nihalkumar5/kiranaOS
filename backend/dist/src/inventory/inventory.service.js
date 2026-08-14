"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordPurchase(storeId, userId, dto) {
        if (dto.items.length === 0) {
            throw new common_1.BadRequestException('Purchase entry must contain at least one item');
        }
        return this.prisma.$transaction(async (tx) => {
            const results = [];
            for (const item of dto.items) {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, storeId },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${item.productId} not found`);
                }
                const currentStock = Number(product.stock);
                const purchaseQty = item.quantity;
                const newStock = currentStock + purchaseQty;
                const updateData = { stock: newStock };
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
                        type: client_1.InventoryTransactionType.PURCHASE,
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
    async recordAuditAdjustment(storeId, userId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
                where: { id: dto.productId, storeId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with ID ${dto.productId} not found`);
            }
            const currentStock = Number(product.stock);
            const targetStock = dto.actualStock;
            const difference = targetStock - currentStock;
            if (difference === 0) {
                throw new common_1.BadRequestException('Target stock is identical to current stock, no adjustment needed');
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
                    type: client_1.InventoryTransactionType.AUDIT_ADJUSTMENT,
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
    async getTransactionHistory(storeId) {
        return this.prisma.inventoryTransaction.findMany({
            where: { storeId },
            include: {
                product: { select: { id: true, name: true, barcode: true, unit: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getLowStockAlerts(storeId) {
        return this.prisma.product.findMany({
            where: {
                storeId,
                stock: {
                    lt: 15.0,
                },
            },
            include: {
                category: true,
            },
            orderBy: { stock: 'asc' },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map