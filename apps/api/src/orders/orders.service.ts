import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates a PENDING order. Stock is VALIDATED here (fail fast on oversell) but
  // NOT decremented — the atomic decrement happens at payment (webhook), per the
  // architecture. Prices are snapshotted so later price edits never move totals.
  async create(dto: CreateOrderDto): Promise<Order> {
    const variantIds = dto.items.map((i) => i.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException('Duplicate variant in order items');
    }

    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotalSen = 0;
    const itemsData = dto.items.map((item) => {
      const variant = byId.get(item.variantId);
      if (!variant) {
        throw new NotFoundException(`Variant '${item.variantId}' not found`);
      }
      if (item.qty > variant.stockQty) {
        throw new ConflictException(
          `Insufficient stock for variant '${variant.sku}'`,
        );
      }
      subtotalSen += variant.priceSen * item.qty;
      return {
        variantId: variant.id,
        qty: item.qty,
        priceSenSnapshot: variant.priceSen,
      };
    });

    // No voucher in Unit 4 — discount is 0, total equals subtotal (Unit 5 adds it).
    return this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        subtotalSen,
        discountSen: 0,
        totalSen: subtotalSen,
        items: { create: itemsData },
      },
      include: { items: true },
    });
  }

  async findById(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }
    return order;
  }
}
