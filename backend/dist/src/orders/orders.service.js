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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const events_gateway_1 = require("../events/events.gateway");
let OrdersService = class OrdersService {
    prisma;
    eventsGateway;
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async create(storeId, userId, dto) {
        if (dto.items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        const order = await this.prisma.$transaction(async (tx) => {
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
                    throw new common_1.NotFoundException(`Product with ID ${item.productId} not found`);
                }
                const stockNum = Number(product.stock);
                if (stockNum < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for product ${product.name}. Available: ${stockNum} ${product.unit}(s), Requested: ${item.quantity}`);
                }
                const sellingPrice = Number(product.sellingPrice);
                const gstRate = Number(product.gst);
                const itemTotal = sellingPrice * item.quantity;
                const basePrice = sellingPrice / (1 + gstRate / 100);
                const itemGst = (sellingPrice - basePrice) * item.quantity;
                const itemSubtotal = itemTotal - itemGst;
                accumulatedSubtotal += itemSubtotal;
                accumulatedGstAmount += itemGst;
                accumulatedTotalAmount += itemTotal;
                orderItemsData.push({
                    productId: product.id,
                    quantity: item.quantity,
                    price: product.sellingPrice,
                    gstRate: product.gst,
                    gstAmount: itemGst,
                });
                stockUpdates.push({
                    id: product.id,
                    newStock: stockNum - item.quantity,
                });
                inventoryTransactionsData.push({
                    storeId,
                    productId: product.id,
                    userId,
                    type: client_1.InventoryTransactionType.SALE,
                    quantity: -item.quantity,
                    beforeStock: product.stock,
                    afterStock: stockNum - item.quantity,
                    description: `POS Bill checkout: ${billNumber}`,
                });
            }
            const discount = dto.discount || 0;
            const finalTotalAmount = Math.max(0, accumulatedTotalAmount - discount);
            for (const update of stockUpdates) {
                await tx.product.update({
                    where: { id: update.id },
                    data: { stock: update.newStock },
                });
            }
            for (const log of inventoryTransactionsData) {
                await tx.inventoryTransaction.create({
                    data: log,
                });
            }
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
                    status: client_1.OrderStatus.COMPLETED,
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
            if (dto.customerId) {
                await tx.customer.update({
                    where: { id: dto.customerId },
                    data: {
                        updatedAt: new Date(),
                    },
                });
            }
            return order;
        });
        this.eventsGateway.sendToStore(storeId, 'new-order', order);
        return order;
    }
    async findAll(storeId) {
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
    async findOne(storeId, id) {
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
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async cancel(storeId, userId, id) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: { id, storeId },
                include: { items: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.status === client_1.OrderStatus.CANCELLED) {
                throw new common_1.BadRequestException('Order is already cancelled');
            }
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
                            type: client_1.InventoryTransactionType.RETURN,
                            quantity: returnedQty,
                            beforeStock: product.stock,
                            afterStock: newStock,
                            description: `Cancelled Order: ${order.billNumber}`,
                        },
                    });
                }
            }
            return tx.order.update({
                where: { id },
                data: { status: client_1.OrderStatus.CANCELLED },
                include: {
                    items: {
                        include: { product: true },
                    },
                    customer: true,
                },
            });
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map