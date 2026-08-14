import { PrismaService } from '../prisma/prisma.service';
import { PurchaseEntryDto } from './dto/purchase-entry.dto';
import { AuditAdjustmentDto } from './dto/audit-adjustment.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    recordPurchase(storeId: string, userId: string, dto: PurchaseEntryDto): Promise<({
        product: {
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
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        type: import("@prisma/client").$Enums.InventoryTransactionType;
        quantity: import("@prisma/client-runtime-utils").Decimal;
        beforeStock: import("@prisma/client-runtime-utils").Decimal;
        afterStock: import("@prisma/client-runtime-utils").Decimal;
        productId: string;
        userId: string;
    })[]>;
    recordAuditAdjustment(storeId: string, userId: string, dto: AuditAdjustmentDto): Promise<{
        user: {
            id: string;
            name: string;
        };
        product: {
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
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        type: import("@prisma/client").$Enums.InventoryTransactionType;
        quantity: import("@prisma/client-runtime-utils").Decimal;
        beforeStock: import("@prisma/client-runtime-utils").Decimal;
        afterStock: import("@prisma/client-runtime-utils").Decimal;
        productId: string;
        userId: string;
    }>;
    getTransactionHistory(storeId: string): Promise<({
        user: {
            id: string;
            name: string;
        };
        product: {
            id: string;
            name: string;
            barcode: string | null;
            unit: string;
        };
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        type: import("@prisma/client").$Enums.InventoryTransactionType;
        quantity: import("@prisma/client-runtime-utils").Decimal;
        beforeStock: import("@prisma/client-runtime-utils").Decimal;
        afterStock: import("@prisma/client-runtime-utils").Decimal;
        productId: string;
        userId: string;
    })[]>;
    getLowStockAlerts(storeId: string): Promise<({
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
}
