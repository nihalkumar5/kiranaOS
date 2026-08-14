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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(storeId) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayOrders = await this.prisma.order.findMany({
            where: {
                storeId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                },
            },
        });
        let todaySales = 0;
        let billsCount = todayOrders.length;
        let cashSales = 0;
        let upiSales = 0;
        let cardSales = 0;
        todayOrders.forEach((o) => {
            const amt = Number(o.totalAmount);
            todaySales += amt;
            if (o.paymentMode === 'CASH')
                cashSales += amt;
            else if (o.paymentMode === 'UPI')
                upiSales += amt;
            else
                cardSales += amt;
        });
        const bestSellersGrouped = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    storeId,
                    status: 'COMPLETED',
                },
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 5,
        });
        const bestSellers = await Promise.all(bestSellersGrouped.map(async (item) => {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true, brand: true, unit: true, sellingPrice: true },
            });
            return {
                name: product?.name || 'Unknown Product',
                brand: product?.brand || 'Local',
                unit: product?.unit || 'pcs',
                price: product?.sellingPrice || 0,
                quantitySold: Number(item._sum.quantity || 0),
            };
        }));
        const allCompletedItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    storeId,
                    status: 'COMPLETED',
                },
            },
            include: {
                product: {
                    select: {
                        category: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
        const categoryMap = {};
        allCompletedItems.forEach((item) => {
            const categoryName = item.product?.category?.name || 'Uncategorized';
            const itemTotal = Number(item.price) * Number(item.quantity);
            categoryMap[categoryName] = (categoryMap[categoryName] || 0) + itemTotal;
        });
        const categorySales = Object.entries(categoryMap).map(([name, value]) => ({
            name,
            value,
        }));
        const lowStockCount = await this.prisma.product.count({
            where: {
                storeId,
                stock: {
                    lt: 15.0,
                },
            },
        });
        const lowStockList = await this.prisma.product.findMany({
            where: {
                storeId,
                stock: {
                    lt: 15.0,
                },
            },
            select: {
                id: true,
                name: true,
                stock: true,
                unit: true,
            },
            orderBy: { stock: 'asc' },
            take: 5,
        });
        return {
            todaySales,
            billsCount,
            cashSales,
            upiSales,
            cardSales,
            bestSellers,
            categorySales,
            lowStock: {
                count: lowStockCount,
                items: lowStockList,
            },
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map