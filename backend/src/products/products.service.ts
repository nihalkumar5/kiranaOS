import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        storeId,
      },
    });
  }

  async findAll(storeId: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        storeId,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(storeId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOneByBarcode(storeId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, storeId },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return product;
  }

  async update(storeId: string, id: string, dto: UpdateProductDto) {
    // Verify existence
    await this.findOne(storeId, id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(storeId: string, id: string) {
    await this.findOne(storeId, id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { success: true };
  }
}
