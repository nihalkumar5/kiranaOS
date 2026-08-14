declare class PurchaseItemDto {
    productId: string;
    quantity: number;
    purchasePrice?: number;
}
export declare class PurchaseEntryDto {
    items: PurchaseItemDto[];
}
export {};
