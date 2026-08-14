import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateCashTallyDto } from './dto/create-cash-tally.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-aggregate')
  @Roles(Role.ADMIN)
  async getSalesAggregate(
    @GetUser('storeId') storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getSalesAggregate(storeId, startDate, endDate);
    return {
      success: true,
      data,
    };
  }

  @Get('export')
  @Roles(Role.ADMIN)
  async exportCsv(
    @GetUser('storeId') storeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: any,
  ) {
    const csv = await this.reportsService.exportSalesCsv(storeId, startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales_report_${Date.now()}.csv`);
    return res.send(csv);
  }

  @Post('cash-tally')
  @Roles(Role.ADMIN)
  async createCashTally(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Body() dto: CreateCashTallyDto,
  ) {
    const tally = await this.reportsService.createCashTally(storeId, userId, dto);
    return {
      success: true,
      message: 'Cash Tally audit record logged successfully',
      data: tally,
    };
  }

  @Get('cash-tally')
  @Roles(Role.ADMIN)
  async getCashTallies(@GetUser('storeId') storeId: string) {
    const tallies = await this.reportsService.getCashTallies(storeId);
    return {
      success: true,
      data: tallies,
    };
  }
}
