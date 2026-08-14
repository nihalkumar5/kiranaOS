import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(storeId: string): Promise<{
        id: string;
        name: string;
        storefrontEnabled: boolean;
        themeColor: string;
        logoUrl: string | null;
        bannerUrl: string | null;
        tagline: string | null;
        description: string | null;
    }>;
    updateSettings(storeId: string, data: any): Promise<{
        id: string;
        name: string;
        phone: string | null;
        address: string | null;
        gstin: string | null;
        storefrontEnabled: boolean;
        themeColor: string;
        logoUrl: string | null;
        bannerUrl: string | null;
        tagline: string | null;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
