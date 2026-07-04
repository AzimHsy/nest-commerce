import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Voucher, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toWriteError } from '../products/products.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Voucher[]> {
    return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    this.assertValueSane(dto.type, dto.value);
    try {
      return await this.prisma.voucher.create({
        data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null },
      });
    } catch (error) {
      throw toWriteError(error, 'code');
    }
  }

  async update(id: string, dto: UpdateVoucherDto): Promise<Voucher> {
    const existing = await this.prisma.voucher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Voucher '${id}' not found`);
    }
    this.assertValueSane(dto.type ?? existing.type, dto.value ?? existing.value);
    try {
      return await this.prisma.voucher.update({
        where: { id },
        data: {
          ...dto,
          expiresAt:
            dto.expiresAt === undefined ? undefined : new Date(dto.expiresAt),
        },
      });
    } catch (error) {
      throw toWriteError(error, 'code');
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.voucher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Voucher '${id}' not found`);
    }
    await this.prisma.voucher.delete({ where: { id } });
  }

  // Order-time validation (architecture invariant 5: validity is checked at
  // order creation; usage is counted at payment). All rejections are 422 —
  // the request is well-formed, the voucher just isn't applicable.
  async validateForOrder(code: string, subtotalSen: number): Promise<Voucher> {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    if (!voucher) {
      throw new UnprocessableEntityException(`Voucher '${code}' is not valid`);
    }
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException(`Voucher '${code}' has expired`);
    }
    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      throw new UnprocessableEntityException(
        `Voucher '${code}' has reached its usage limit`,
      );
    }
    if (voucher.minSpendSen !== null && subtotalSen < voucher.minSpendSen) {
      throw new UnprocessableEntityException(
        `Voucher '${code}' requires a minimum spend of ${voucher.minSpendSen} sen`,
      );
    }
    return voucher;
  }

  // Integer sen math only. PERCENT floors; FIXED is capped at the subtotal so
  // a total can never go negative.
  computeDiscountSen(voucher: Voucher, subtotalSen: number): number {
    if (voucher.type === VoucherType.PERCENT) {
      return Math.floor((subtotalSen * voucher.value) / 100);
    }
    return Math.min(voucher.value, subtotalSen);
  }

  private assertValueSane(type: VoucherType, value: number): void {
    if (type === VoucherType.PERCENT && value > 100) {
      throw new BadRequestException('PERCENT voucher value cannot exceed 100');
    }
  }
}
