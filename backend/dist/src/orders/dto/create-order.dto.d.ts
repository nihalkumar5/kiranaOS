import { PaymentMode } from '@prisma/client';
declare class OrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    customerId?: string;
    discount?: number;
    paymentMode: PaymentMode;
    items: OrderItemDto[];
}
export {};
