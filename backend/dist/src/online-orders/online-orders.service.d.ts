import { PrismaService } from '../prisma/prisma.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { OnlineOrderStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
export declare class OnlineOrdersService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    getPublicStoreProducts(storeId: string): Promise<({
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
    createOnlineOrder(storeId: string, dto: CreateOnlineOrderDto): Promise<{
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
    }>;
    findAll(storeId: string): Promise<({
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
    })[]>;
    updateStatus(storeId: string, userId: string, orderId: string, status: OnlineOrderStatus): Promise<{
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
    }>;
}
