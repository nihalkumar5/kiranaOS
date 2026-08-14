import { InventoryService } from './inventory.service';
import { PurchaseEntryDto } from './dto/purchase-entry.dto';
import { AuditAdjustmentDto } from './dto/audit-adjustment.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    recordPurchase(storeId: string, userId: string, dto: PurchaseEntryDto): Promise<{
        success: boolean;
        message: string;
        data: ({
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
        })[];
    }>;
    recordAudit(storeId: string, userId: string, dto: AuditAdjustmentDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    getHistory(storeId: string): Promise<{
        success: boolean;
        data: ({
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
        })[];
    }>;
    getLowStock(storeId: string): Promise<{
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
}
