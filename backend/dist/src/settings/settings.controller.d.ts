import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getPublicSettings(storeId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            storefrontEnabled: boolean;
            themeColor: string;
            logoUrl: string | null;
            bannerUrl: string | null;
            tagline: string | null;
            description: string | null;
        };
    }>;
    getSettings(storeId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            storefrontEnabled: boolean;
            themeColor: string;
            logoUrl: string | null;
            bannerUrl: string | null;
            tagline: string | null;
            description: string | null;
        };
    }>;
    updateSettings(storeId: string, updateData: any): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
}
