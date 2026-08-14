import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(storeId: string): Promise<{
        success: boolean;
        data: {
            todaySales: number;
            billsCount: number;
            cashSales: number;
            upiSales: number;
            cardSales: number;
            bestSellers: {
                name: string;
                brand: string;
                unit: string;
                price: number | import("@prisma/client-runtime-utils").Decimal;
                quantitySold: number;
            }[];
            categorySales: {
                name: string;
                value: number;
            }[];
            lowStock: {
                count: number;
                items: {
                    id: string;
                    name: string;
                    stock: import("@prisma/client-runtime-utils").Decimal;
                    unit: string;
                }[];
            };
        };
    }>;
}
