import { OnlinePaymentMode } from '@prisma/client';
declare class OnlineOrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOnlineOrderDto {
    customerMobile: string;
    customerName: string;
    paymentMode: OnlinePaymentMode;
    items: OnlineOrderItemDto[];
}
export {};
