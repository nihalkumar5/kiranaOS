import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getStoreProducts(storeId: string) {
    return this.prisma.product.findMany({
      where: { storeId },
      include: { category: true }
    });
  }
}
