import { PrismaService } from './prisma/prisma.service';
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getStoreProducts(storeId: string): Promise<({
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
