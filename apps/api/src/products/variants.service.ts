import { Injectable, NotFoundException } from '@nestjs/common';
import { Variant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { toWriteError } from './products.service';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(productId: string, dto: CreateVariantDto): Promise<Variant> {
    // Explicit 404 for a missing product instead of a raw FK error.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }
    try {
      return await this.prisma.variant.create({ data: { ...dto, productId } });
    } catch (error) {
      throw toWriteError(error, 'sku');
    }
  }

  async update(id: string, dto: UpdateVariantDto): Promise<Variant> {
    await this.ensureExists(id);
    try {
      return await this.prisma.variant.update({ where: { id }, data: dto });
    } catch (error) {
      throw toWriteError(error, 'sku');
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.variant.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.variant.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Variant '${id}' not found`);
    }
  }
}
