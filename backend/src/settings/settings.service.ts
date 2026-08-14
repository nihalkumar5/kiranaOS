import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        storefrontEnabled: true,
        themeColor: true,
        logoUrl: true,
        bannerUrl: true,
        tagline: true,
        description: true,
      }
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async updateSettings(storeId: string, data: any) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: data.name,
        storefrontEnabled: data.storefrontEnabled,
        themeColor: data.themeColor,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        tagline: data.tagline,
        description: data.description,
      }
    });

    return store;
  }
}
