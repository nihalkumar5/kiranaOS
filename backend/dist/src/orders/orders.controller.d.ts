import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(storeId: string, userId: string, dto: CreateOrderDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                name: string;
            };
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                storeId: string;
                mobile: string;
            } | null;
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
                gstAmount: import("@prisma/client-runtime-utils").Decimal;
                price: import("@prisma/client-runtime-utils").Decimal;
                gstRate: import("@prisma/client-runtime-utils").Decimal;
                orderId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            customerId: string | null;
            status: import("@prisma/client").$Enums.OrderStatus;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            billNumber: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            discount: import("@prisma/client-runtime-utils").Decimal;
            gstAmount: import("@prisma/client-runtime-utils").Decimal;
            paymentMode: import("@prisma/client").$Enums.PaymentMode;
            whatsappSent: boolean;
        };
    }>;
    findAll(storeId: string): Promise<{
        success: boolean;
        data: ({
            user: {
                id: string;
                name: string;
            };
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                storeId: string;
                mobile: string;
            } | null;
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
                gstAmount: import("@prisma/client-runtime-utils").Decimal;
                price: import("@prisma/client-runtime-utils").Decimal;
                gstRate: import("@prisma/client-runtime-utils").Decimal;
                orderId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            customerId: string | null;
            status: import("@prisma/client").$Enums.OrderStatus;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            billNumber: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            discount: import("@prisma/client-runtime-utils").Decimal;
            gstAmount: import("@prisma/client-runtime-utils").Decimal;
            paymentMode: import("@prisma/client").$Enums.PaymentMode;
            whatsappSent: boolean;
        })[];
    }>;
    findOne(storeId: string, id: string): Promise<{
        success: boolean;
        data: {
            user: {
                id: string;
                name: string;
            };
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                storeId: string;
                mobile: string;
            } | null;
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
                gstAmount: import("@prisma/client-runtime-utils").Decimal;
                price: import("@prisma/client-runtime-utils").Decimal;
                gstRate: import("@prisma/client-runtime-utils").Decimal;
                orderId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            customerId: string | null;
            status: import("@prisma/client").$Enums.OrderStatus;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            billNumber: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            discount: import("@prisma/client-runtime-utils").Decimal;
            gstAmount: import("@prisma/client-runtime-utils").Decimal;
            paymentMode: import("@prisma/client").$Enums.PaymentMode;
            whatsappSent: boolean;
        };
    }>;
    cancel(storeId: string, userId: string, id: string): Promise<{
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
            } | null;
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
                gstAmount: import("@prisma/client-runtime-utils").Decimal;
                price: import("@prisma/client-runtime-utils").Decimal;
                gstRate: import("@prisma/client-runtime-utils").Decimal;
                orderId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            customerId: string | null;
            status: import("@prisma/client").$Enums.OrderStatus;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            billNumber: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            discount: import("@prisma/client-runtime-utils").Decimal;
            gstAmount: import("@prisma/client-runtime-utils").Decimal;
            paymentMode: import("@prisma/client").$Enums.PaymentMode;
            whatsappSent: boolean;
        };
    }>;
}
