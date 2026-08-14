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
exports.OnlineOrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const events_gateway_1 = require("../events/events.gateway");
let OnlineOrdersService = class OnlineOrdersService {
    prisma;
    eventsGateway;
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async getPublicStoreProducts(storeId) {
        const storeExists = await this.prisma.store.findUnique({
            where: { id: storeId },
        });
        if (!storeExists) {
            throw new common_1.NotFoundException('Store not found');
        }
        return this.prisma.product.findMany({
            where: {
                storeId,
                stock: {
                    gt: 0,
                },
            },
            include: {
                category: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async createOnlineOrder(storeId, dto) {
        if (dto.items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        const order = await this.prisma.$transaction(async (tx) => {
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
            let accumulatedTotal = 0;
            const orderItemsData = [];
            for (const item of dto.items) {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, storeId },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${item.productId} not found`);
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
            return tx.onlineOrder.create({
                data: {
                    storeId,
                    customerId: customer.id,
                    status: client_1.OnlineOrderStatus.PENDING,
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
        this.eventsGateway.sendToStore(storeId, 'new-online-order', order);
        return order;
    }
    async findAll(storeId) {
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
    async updateStatus(storeId, userId, orderId, status) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.onlineOrder.findFirst({
                where: { id: orderId, storeId },
                include: { items: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Online order not found');
            }
            const prevStatus = order.status;
            if (prevStatus === status) {
                return order;
            }
            if (prevStatus === client_1.OnlineOrderStatus.PENDING && (status === client_1.OnlineOrderStatus.APPROVED || status === client_1.OnlineOrderStatus.READY)) {
                for (const item of order.items) {
                    const product = await tx.product.findFirst({
                        where: { id: item.productId, storeId },
                    });
                    if (!product) {
                        throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                    }
                    const currentStock = Number(product.stock);
                    const orderQty = Number(item.quantity);
                    if (currentStock < orderQty) {
                        throw new common_1.BadRequestException(`Insufficient stock to approve order for product: ${product.name}. Available: ${currentStock}, Requested: ${orderQty}`);
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
                            type: client_1.InventoryTransactionType.SALE,
                            quantity: -orderQty,
                            beforeStock: product.stock,
                            afterStock: newStock,
                            description: `Online Order Approved: #${order.id.slice(0, 8)}`,
                        },
                    });
                }
            }
            if ((prevStatus === client_1.OnlineOrderStatus.APPROVED || prevStatus === client_1.OnlineOrderStatus.READY) && status === client_1.OnlineOrderStatus.CANCELLED) {
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
                                type: client_1.InventoryTransactionType.RETURN,
                                quantity: orderQty,
                                beforeStock: product.stock,
                                afterStock: newStock,
                                description: `Online Order Cancelled: #${order.id.slice(0, 8)}`,
                            },
                        });
                    }
                }
            }
            return tx.onlineOrder.update({
                where: { id: orderId },
                data: {
                    status,
                    paymentStatus: status === client_1.OnlineOrderStatus.PICKED_UP ? 'PAID' : undefined,
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
};
exports.OnlineOrdersService = OnlineOrdersService;
exports.OnlineOrdersService = OnlineOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], OnlineOrdersService);
//# sourceMappingURL=online-orders.service.js.map