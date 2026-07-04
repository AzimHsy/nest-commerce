import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product '${slug}' not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.create({ data: dto });
    } catch (error) {
      throw toWriteError(error, 'slug');
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.ensureExists(id);
    try {
      return await this.prisma.product.update({ where: { id }, data: dto });
    } catch (error) {
      throw toWriteError(error, 'slug');
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // Variants cascade-delete via the schema relation.
    await this.prisma.product.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.product.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Product '${id}' not found`);
    }
  }
}

// Maps a Prisma unique-constraint violation (P2002) to a 409; rethrows anything
// else untouched. Shared by products and variants.
export function toWriteError(error: unknown, field: string): Error {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new ConflictException(`A record with that ${field} already exists`);
  }
  return error instanceof Error ? error : new Error(String(error));
}
