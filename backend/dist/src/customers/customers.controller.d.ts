import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(storeId: string, dto: CreateCustomerDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            mobile: string;
        };
    }>;
    findAll(storeId: string, search?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            mobile: string;
        }[];
    }>;
    findByMobile(storeId: string, mobile: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            mobile: string;
        };
    }>;
    findOne(storeId: string, id: string): Promise<{
        success: boolean;
        data: {
            totalSpend: number | import("@prisma/client-runtime-utils").Decimal;
            totalVisits: number;
            lastVisit: Date | null;
            orders: {
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
            }[];
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            mobile: string;
        };
    }>;
}
