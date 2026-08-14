import { OnlineOrdersService } from './online-orders.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
export declare class PublicStoreController {
    private readonly onlineOrdersService;
    constructor(onlineOrdersService: OnlineOrdersService);
    getPublicProducts(storeId: string): Promise<{
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
    createOnlineOrder(storeId: string, dto: CreateOnlineOrderDto): Promise<{
        success: boolean;
        message: string;
        data: {
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                storeId: string;
                mobile: string;
            };
            items: ({
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
                createdAt: Date;
                updatedAt: Date;
                quantity: import("@prisma/client-runtime-utils").Decimal;
                productId: string;
                price: import("@prisma/client-runtime-utils").Decimal;
                onlineOrderId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            customerId: string;
            status: import("@prisma/client").$Enums.OnlineOrderStatus;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            paymentMode: import("@prisma/client").$Enums.OnlinePaymentMode;
            paymentStatus: import("@prisma/client").$Enums.OnlinePaymentStatus;
        };
    }>;
}
