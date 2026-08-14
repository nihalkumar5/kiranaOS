import { ReportsService } from './reports.service';
import { CreateCashTallyDto } from './dto/create-cash-tally.dto';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getSalesAggregate(storeId: string, startDate?: string, endDate?: string): Promise<{
        success: boolean;
        data: {
            totalSales: number;
            totalTax: number;
            totalDiscount: number;
            billsCount: number;
            paymentSplit: {
                mode: string;
                value: number;
            }[];
            salesTimeline: {
                date: string;
                sales: number;
                bills: number;
            }[];
        };
    }>;
    exportCsv(storeId: string, startDate: string, endDate: string, res: any): Promise<any>;
    createCashTally(storeId: string, userId: string, dto: CreateCashTallyDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            actualAmount: import("@prisma/client-runtime-utils").Decimal;
            notes: string | null;
            tallyDate: Date;
            expectedAmount: import("@prisma/client-runtime-utils").Decimal;
            difference: import("@prisma/client-runtime-utils").Decimal;
        };
    }>;
    getCashTallies(storeId: string): Promise<{
        success: boolean;
        data: ({
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            storeId: string;
            userId: string;
            actualAmount: import("@prisma/client-runtime-utils").Decimal;
            notes: string | null;
            tallyDate: Date;
            expectedAmount: import("@prisma/client-runtime-utils").Decimal;
            difference: import("@prisma/client-runtime-utils").Decimal;
        })[];
    }>;
}
