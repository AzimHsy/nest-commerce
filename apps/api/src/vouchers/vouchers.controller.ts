import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Vouchers are entirely ADMIN territory (access model: STAFF reads
// products/orders/reports only) — guard the whole controller.
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get()
  findAll() {
    return this.vouchers.findAll();
  }

  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.vouchers.remove(id);
  }
}
