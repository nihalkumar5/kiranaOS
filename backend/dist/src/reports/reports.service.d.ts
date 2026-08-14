import { PrismaService } from '../prisma/prisma.service';
import { CreateCashTallyDto } from './dto/create-cash-tally.dto';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSalesAggregate(storeId: string, startDateStr?: string, endDateStr?: string): Promise<{
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
    }>;
    exportSalesCsv(storeId: string, startDateStr?: string, endDateStr?: string): Promise<string>;
    createCashTally(storeId: string, userId: string, dto: CreateCashTallyDto): Promise<{
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
    }>;
    getCashTallies(storeId: string): Promise<({
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
    })[]>;
    private resolveDates;
}
