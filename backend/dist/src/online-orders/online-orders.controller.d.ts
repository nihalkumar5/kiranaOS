import { OnlineOrdersService } from './online-orders.service';
import { UpdateOnlineOrderStatusDto } from './dto/update-online-order-status.dto';
export declare class OnlineOrdersController {
    private readonly onlineOrdersService;
    constructor(onlineOrdersService: OnlineOrdersService);
    getOnlineOrders(storeId: string): Promise<{
        success: boolean;
        data: ({
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
        })[];
    }>;
    updateOrderStatus(storeId: string, userId: string, id: string, dto: UpdateOnlineOrderStatusDto): Promise<{
        success: boolean;
        message: string;
        data: {
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                quantity: import("@prisma/client-runtime-utils").Decimal;
                productId: string;
                price: import("@prisma/client-runtime-utils").Decimal;
                onlineOrderId: string;
            }[];
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
