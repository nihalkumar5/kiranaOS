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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(storeId, dto) {
        return this.prisma.product.create({
            data: {
                ...dto,
                storeId,
            },
        });
    }
    async findAll(storeId, search) {
        return this.prisma.product.findMany({
            where: {
                storeId,
                OR: search
                    ? [
                        { name: { contains: search, mode: 'insensitive' } },
                        { barcode: { contains: search, mode: 'insensitive' } },
                        { brand: { contains: search, mode: 'insensitive' } },
                    ]
                    : undefined,
            },
            include: {
                category: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(storeId, id) {
        const product = await this.prisma.product.findFirst({
            where: { id, storeId },
            include: { category: true },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async findOneByBarcode(storeId, barcode) {
        const product = await this.prisma.product.findFirst({
            where: { barcode, storeId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with barcode ${barcode} not found`);
        }
        return product;
    }
    async update(storeId, id, dto) {
        await this.findOne(storeId, id);
        return this.prisma.product.update({
            where: { id },
            data: dto,
        });
    }
    async remove(storeId, id) {
        await this.findOne(storeId, id);
        await this.prisma.product.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map