import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { mobile: dto.mobile, storeId },
    });

    if (existing) {
      throw new BadRequestException('Customer with this mobile number already exists');
    }

    return this.prisma.customer.create({
      data: {
        ...dto,
        storeId,
      },
    });
  }

  async findByMobile(storeId: string, mobile: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { mobile, storeId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async findOne(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Return derived profile fields (spend, last visit)
    const aggregate = await this.prisma.order.aggregate({
      where: { customerId: id, storeId, status: 'COMPLETED' },
      _sum: { totalAmount: true },
      _count: true,
    });

    const lastOrder = customer.orders[0] || null;

    return {
      ...customer,
      totalSpend: aggregate._sum.totalAmount || 0,
      totalVisits: aggregate._count || 0,
      lastVisit: lastOrder ? lastOrder.createdAt : null,
    };
  }

  async findAll(storeId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        storeId,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { name: 'asc' },
    });
  }
}
