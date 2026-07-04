import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { createHmac, randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;

  const admin = { email: 'admin.rep@test.local', password: 'admin1234' };
  const staff = { email: 'staff.rep@test.local', password: 'staff1234' };

  const pay = (orderId: string) => {
    const body = JSON.stringify({ eventId: randomUUID(), orderId });
    const signature = createHmac('sha256', process.env.WEBHOOK_SECRET as string)
      .update(body)
      .digest('hex');
    return request(app.getHttpServer())
      .post('/webhooks/payment')
      .set('x-webhook-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body);
  };

  const makeProductWithVariant = async (
    name: string,
    priceSen: number,
    stockQty: number,
  ): Promise<string> => {
    const product = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, slug: `r-${randomUUID().slice(0, 8)}` })
      .expect(201);
    const variant = await request(app.getHttpServer())
      .post(`/products/${product.body.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: `R-${randomUUID().slice(0, 8)}`,
        name: 'Std',
        priceSen,
        stockQty,
      })
      .expect(201);
    return variant.body.id as string;
  };

  const orderAndPay = async (variantId: string, qty: number) => {
    const order = await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerName: 'B',
        customerEmail: 'b@test.local',
        items: [{ variantId, qty }],
      })
      .expect(201);
    await pay(order.body.id as string).expect(200);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.order.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.createMany({
      data: [
        {
          email: admin.email,
          passwordHash: await hash(admin.password, 10),
          role: Role.ADMIN,
        },
        {
          email: staff.email,
          passwordHash: await hash(staff.password, 10),
          role: Role.STAFF,
        },
      ],
    });
    adminToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(admin)
        .expect(200)
    ).body.accessToken;
    staffToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(staff)
        .expect(200)
    ).body.accessToken;

    // Fixture: bestseller (3+2 units @ 1000), runner-up (1 unit @ 5000, ends
    // low stock), plus an UNPAID order that must not count anywhere.
    const bestseller = await makeProductWithVariant('Bestseller', 1000, 50);
    const runnerUp = await makeProductWithVariant('Runner Up', 5000, 3);
    await orderAndPay(bestseller, 3);
    await orderAndPay(bestseller, 2);
    await orderAndPay(runnerUp, 1);
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerName: 'Never Pays',
        customerEmail: 'np@test.local',
        items: [{ variantId: bestseller, qty: 10 }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.order.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('requires auth: anonymous 401', async () => {
    await request(app.getHttpServer())
      .get('/reports/daily-revenue')
      .expect(401);
  });

  it('STAFF can read reports (200)', async () => {
    await request(app.getHttpServer())
      .get('/reports/daily-revenue')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('daily-revenue: today shows 3 paid orders totalling 10000 sen; pending excluded', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/daily-revenue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // 3000 + 2000 + 5000 = 10000; the unpaid 10-unit order must not appear.
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ ordersCount: 3, revenueSen: 10000 });
    expect(res.body[0].day).toBe(new Date().toISOString().slice(0, 10));
  });

  it('top-products: ordered by units sold, revenue from snapshots, unpaid excluded', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/top-products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      name: 'Bestseller',
      unitsSold: 5,
      revenueSen: 5000,
    });
    expect(res.body[1]).toMatchObject({
      name: 'Runner Up',
      unitsSold: 1,
      revenueSen: 5000,
    });
  });

  it('top-products honours ?limit=', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/top-products?limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('low-stock lists variants at/below threshold, ascending', async () => {
    // Runner Up started at 3, sold 1 → 2 left. Bestseller 50 − 5 = 45.
    const res = await request(app.getHttpServer())
      .get('/reports/low-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      stockQty: 2,
      product: { name: 'Runner Up' },
    });

    const wide = await request(app.getHttpServer())
      .get('/reports/low-stock?threshold=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(wide.body).toHaveLength(2);
    expect(wide.body[0].stockQty).toBeLessThanOrEqual(wide.body[1].stockQty);
  });
});
