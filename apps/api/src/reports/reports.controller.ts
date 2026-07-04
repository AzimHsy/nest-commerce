import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Reports are readable by BOTH roles (access model: STAFF reads reports).
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('daily-revenue')
  dailyRevenue() {
    return this.reports.dailyRevenue();
  }

  @Get('top-products')
  topProducts(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.reports.topProducts(limit);
  }

  @Get('low-stock')
  lowStock(
    @Query('threshold', new DefaultValuePipe(5), ParseIntPipe)
    threshold: number,
  ) {
    return this.reports.lowStock(threshold);
  }
}
