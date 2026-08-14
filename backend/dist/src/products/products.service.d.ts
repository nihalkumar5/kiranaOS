import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(storeId: string, dto: CreateProductDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        barcode: string | null;
        image: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        brand: string | null;
        gst: import("@prisma/client-runtime-utils").Decimal;
        categoryId: string | null;
    }>;
    findAll(storeId: string, search?: string): Promise<({
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        barcode: string | null;
        image: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        brand: string | null;
        gst: import("@prisma/client-runtime-utils").Decimal;
        categoryId: string | null;
    })[]>;
    findOne(storeId: string, id: string): Promise<{
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        barcode: string | null;
        image: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        brand: string | null;
        gst: import("@prisma/client-runtime-utils").Decimal;
        categoryId: string | null;
    }>;
    findOneByBarcode(storeId: string, barcode: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        barcode: string | null;
        image: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        brand: string | null;
        gst: import("@prisma/client-runtime-utils").Decimal;
        categoryId: string | null;
    }>;
    update(storeId: string, id: string, dto: UpdateProductDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        barcode: string | null;
        image: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        brand: string | null;
        gst: import("@prisma/client-runtime-utils").Decimal;
        categoryId: string | null;
    }>;
    remove(storeId: string, id: string): Promise<{
        success: boolean;
    }>;
}
