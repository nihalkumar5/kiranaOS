import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getStoreProducts(storeId: string): Promise<{
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
