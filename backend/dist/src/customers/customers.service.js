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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(storeId, dto) {
        const existing = await this.prisma.customer.findFirst({
            where: { mobile: dto.mobile, storeId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Customer with this mobile number already exists');
        }
        return this.prisma.customer.create({
            data: {
                ...dto,
                storeId,
            },
        });
    }
    async findByMobile(storeId, mobile) {
        const customer = await this.prisma.customer.findFirst({
            where: { mobile, storeId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async findOne(storeId, id) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, storeId },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const aggregate = await this.prisma.order.aggregate({
            where: { customerId: id, storeId, status: 'COMPLETED' },
            _sum: { totalAmount: true },
            _count: true,
        });
        const lastOrder = customer.orders[0] || null;
        return {
            ...customer,
            totalSpend: aggregate._sum.totalAmount || 0,
            totalVisits: aggregate._count || 0,
            lastVisit: lastOrder ? lastOrder.createdAt : null,
        };
    }
    async findAll(storeId, search) {
        return this.prisma.customer.findMany({
            where: {
                storeId,
                OR: search
                    ? [
                        { name: { contains: search, mode: 'insensitive' } },
                        { mobile: { contains: search, mode: 'insensitive' } },
                    ]
                    : undefined,
            },
            orderBy: { name: 'asc' },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map