import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(storeId: string, dto: CreateProductDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    findAll(storeId: string, search?: string): Promise<{
        success: boolean;
        data: ({
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
        })[];
    }>;
    findOneByBarcode(storeId: string, barcode: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    findOne(storeId: string, id: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    update(storeId: string, id: string, dto: UpdateProductDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    remove(storeId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
