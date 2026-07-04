import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// The spec allows raw SQL "where aggregations demand it" — date-bucketed and
// multiplied aggregates (qty × price) are exactly that; everything else in the
// project stays on the typed Prisma client. Postgres SUM/COUNT come back as
// bigint, so results are cast to Number at the edge.

export interface DailyRevenueRow {
  day: string; // YYYY-MM-DD
  ordersCount: number;
  revenueSen: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  slug: string;
  unitsSold: number;
  revenueSen: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Revenue per calendar day of payment (PAID orders only, keyed on paidAt).
  async dailyRevenue(): Promise<DailyRevenueRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; orders_count: bigint; revenue_sen: bigint }>
    >(Prisma.sql`
      SELECT date_trunc('day', "paidAt") AS day,
             COUNT(*)                    AS orders_count,
             SUM("totalSen")             AS revenue_sen
      FROM "Order"
      WHERE status = 'PAID' AND "paidAt" IS NOT NULL
      GROUP BY 1
      ORDER BY 1 DESC
    `);
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      ordersCount: Number(r.orders_count),
      revenueSen: Number(r.revenue_sen),
    }));
  }

  // Best sellers by units across PAID orders, revenue from price snapshots.
  async topProducts(limit = 5): Promise<TopProductRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        product_id: string;
        name: string;
        slug: string;
        units_sold: bigint;
        revenue_sen: bigint;
      }>
    >(Prisma.sql`
      SELECT p.id                                AS product_id,
             p.name                              AS name,
             p.slug                              AS slug,
             SUM(oi.qty)                         AS units_sold,
             SUM(oi.qty * oi."priceSenSnapshot") AS revenue_sen
      FROM "OrderItem" oi
      JOIN "Order"   o ON o.id = oi."orderId" AND o.status = 'PAID'
      JOIN "Variant" v ON v.id = oi."variantId"
      JOIN "Product" p ON p.id = v."productId"
      GROUP BY p.id, p.name, p.slug
      ORDER BY units_sold DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      slug: r.slug,
      unitsSold: Number(r.units_sold),
      revenueSen: Number(r.revenue_sen),
    }));
  }

  // Variants at or below the restock threshold — plain typed query.
  lowStock(threshold = 5) {
    return this.prisma.variant.findMany({
      where: { stockQty: { lte: threshold } },
      orderBy: { stockQty: 'asc' },
      select: {
        id: true,
        sku: true,
        name: true,
        stockQty: true,
        product: { select: { name: true, slug: true } },
      },
    });
  }
}
