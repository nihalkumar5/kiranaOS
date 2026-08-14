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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSalesAggregate(storeId, startDateStr, endDateStr) {
        const { startDate, endDate } = this.resolveDates(startDateStr, endDateStr);
        const orders = await this.prisma.order.findMany({
            where: {
                storeId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        let totalSales = 0;
        let totalTax = 0;
        let totalDiscount = 0;
        let cashSales = 0;
        let upiSales = 0;
        let cardSales = 0;
        orders.forEach((o) => {
            const amt = Number(o.totalAmount);
            totalSales += amt;
            totalTax += Number(o.gstAmount);
            totalDiscount += Number(o.discount);
            if (o.paymentMode === 'CASH')
                cashSales += amt;
            else if (o.paymentMode === 'UPI')
                upiSales += amt;
            else
                cardSales += amt;
        });
        const dailyMap = {};
        orders.forEach((o) => {
            const dateKey = o.createdAt.toISOString().split('T')[0];
            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = { date: dateKey, sales: 0, bills: 0 };
            }
            dailyMap[dateKey].sales += Number(o.totalAmount);
            dailyMap[dateKey].bills += 1;
        });
        const salesTimeline = Object.values(dailyMap);
        return {
            totalSales,
            totalTax,
            totalDiscount,
            billsCount: orders.length,
            paymentSplit: [
                { mode: 'CASH', value: cashSales },
                { mode: 'UPI', value: upiSales },
                { mode: 'CARD', value: cardSales },
            ],
            salesTimeline,
        };
    }
    async exportSalesCsv(storeId, startDateStr, endDateStr) {
        const { startDate, endDate } = this.resolveDates(startDateStr, endDateStr);
        const orders = await this.prisma.order.findMany({
            where: {
                storeId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                customer: true,
                user: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        let csvContent = 'Bill Number,Date,Cashier,Customer Name,Customer Mobile,Payment Mode,Subtotal,Discount,GST Amount,Total Amount\n';
        orders.forEach((o) => {
            const billNo = o.billNumber;
            const date = o.createdAt.toISOString().split('T')[0];
            const cashier = o.user?.name || 'Unknown';
            const custName = o.customer?.name || 'Walk-in';
            const custMobile = o.customer?.mobile || 'N/A';
            const mode = o.paymentMode;
            const subtotal = Number(o.subtotal).toFixed(2);
            const discount = Number(o.discount).toFixed(2);
            const gst = Number(o.gstAmount).toFixed(2);
            const total = Number(o.totalAmount).toFixed(2);
            const safeCustName = custName.replace(/,/g, ' ');
            csvContent += `"${billNo}","${date}","${cashier}","${safeCustName}","${custMobile}","${mode}",${subtotal},${discount},${gst},${total}\n`;
        });
        return csvContent;
    }
    async createCashTally(storeId, userId, dto) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayCashOrders = await this.prisma.order.findMany({
            where: {
                storeId,
                status: 'COMPLETED',
                paymentMode: 'CASH',
                createdAt: {
                    gte: startOfDay,
                },
            },
        });
        let expectedAmount = 0;
        todayCashOrders.forEach((o) => {
            expectedAmount += Number(o.totalAmount);
        });
        const difference = dto.actualAmount - expectedAmount;
        return this.prisma.cashTally.create({
            data: {
                storeId,
                userId,
                expectedAmount,
                actualAmount: dto.actualAmount,
                difference,
                notes: dto.notes || '',
            },
            include: {
                user: { select: { name: true } },
            },
        });
    }
    async getCashTallies(storeId) {
        return this.prisma.cashTally.findMany({
            where: { storeId },
            include: {
                user: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    resolveDates(startDateStr, endDateStr) {
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        let endDate = new Date();
        if (startDateStr) {
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
        }
        if (endDateStr) {
            endDate = new Date(endDateStr);
            endDate.setHours(23, 59, 59, 999);
        }
        return { startDate, endDate };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map