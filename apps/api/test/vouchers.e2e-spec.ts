import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { createHmac, randomUUID } from 'node:crypto';
import { Role, VoucherType } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Vouchers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;

  const admin = { email: 'admin.vch@test.local', password: 'admin1234' };
  const staff = { email: 'staff.vch@test.local', password: 'staff1234' };

  const pay = (payload: object) => {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', process.env.WEBHOOK_SECRET as string)
      .update(body)
      .digest('hex');
    return request(app.getHttpServer())
      .post('/webhooks/payment')
      .set('x-webhook-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body);
  };

  // One product, one variant with plenty of stock; price 1000 sen per unit.
  const makeVariant = async (priceSen = 1000): Promise<string> => {
    const slug = `v-${randomUUID().slice(0, 8)}`;
    const product = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Voucher Test Product', slug })
      .expect(201);
    const variant = await request(app.getHttpServer())
      .post(`/products/${product.body.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: `VSKU-${randomUUID().slice(0, 8)}`,
        name: 'V',
        priceSen,
        stockQty: 100,
      })
      .expect(201);
    return variant.body.id as string;
  };

  const createOrder = (variantId: string, qty: number, voucherCode?: string) =>
    request(app.getHttpServer())
      .post('/orders')
      .send({
        customerName: 'Buyer',
        customerEmail: 'buyer@test.local',
        items: [{ variantId, qty }],
        ...(voucherCode ? { voucherCode } : {}),
      });

  const createVoucher = (body: object) =>
    request(app.getHttpServer())
      .post('/vouchers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

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
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(admin)
      .expect(200);
    adminToken = loginRes.body.accessToken;
    const staffRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(staff)
      .expect(200);
    staffToken = staffRes.body.accessToken;
  });

  afterEach(async () => {
    await prisma.order.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('admin can create/list/update/delete a voucher; duplicate code is 409', async () => {
    const created = await createVoucher({
      code: 'SAVE10',
      type: VoucherType.PERCENT,
      value: 10,
    }).expect(201);

    await createVoucher({
      code: 'SAVE10',
      type: VoucherType.FIXED,
      value: 100,
    }).expect(409);

    const list = await request(app.getHttpServer())
      .get('/vouchers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/vouchers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 15 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/vouchers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('STAFF gets 403 on voucher routes; anonymous gets 401', async () => {
    await request(app.getHttpServer())
      .get('/vouchers')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
    await request(app.getHttpServer()).get('/vouchers').expect(401);
  });

  it('rejects a PERCENT voucher with value > 100 (400)', () => {
    return createVoucher({
      code: 'TOOBIG',
      type: VoucherType.PERCENT,
      value: 150,
    }).expect(400);
  });

  it('applies a PERCENT discount with floor rounding', async () => {
    // 3 × 333 sen = 999; 10% = 99.9 → floor 99.
    const variantId = await makeVariant(333);
    await createVoucher({
      code: 'PCT10',
      type: VoucherType.PERCENT,
      value: 10,
    }).expect(201);

    const order = await createOrder(variantId, 3, 'PCT10').expect(201);
    expect(order.body.subtotalSen).toBe(999);
    expect(order.body.discountSen).toBe(99);
    expect(order.body.totalSen).toBe(900);
  });

  it('caps a FIXED discount at the subtotal (total never negative)', async () => {
    const variantId = await makeVariant(1000);
    await createVoucher({
      code: 'BIGFIX',
      type: VoucherType.FIXED,
      value: 99999,
    }).expect(201);

    const order = await createOrder(variantId, 1, 'BIGFIX').expect(201);
    expect(order.body.discountSen).toBe(1000);
    expect(order.body.totalSen).toBe(0);
  });

  it('rejects an expired voucher with 422', async () => {
    const variantId = await makeVariant();
    await createVoucher({
      code: 'EXPIRED',
      type: VoucherType.FIXED,
      value: 100,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }).expect(201);
    return createOrder(variantId, 1, 'EXPIRED').expect(422);
  });

  it('rejects a voucher at its usage limit with 422', async () => {
    const variantId = await makeVariant();
    const v = await createVoucher({
      code: 'MAXED',
      type: VoucherType.FIXED,
      value: 100,
      usageLimit: 1,
    }).expect(201);
    await prisma.voucher.update({
      where: { id: v.body.id },
      data: { usedCount: 1 },
    });
    return createOrder(variantId, 1, 'MAXED').expect(422);
  });

  it('rejects a voucher below its min spend with 422', async () => {
    const variantId = await makeVariant(1000);
    await createVoucher({
      code: 'MIN50',
      type: VoucherType.FIXED,
      value: 100,
      minSpendSen: 5000,
    }).expect(201);
    return createOrder(variantId, 1, 'MIN50').expect(422);
  });

  it('rejects an unknown voucher code with 422', async () => {
    const variantId = await makeVariant();
    return createOrder(variantId, 1, 'NOPE').expect(422);
  });

  it('counts usage at payment, not at creation; replay does not double-count', async () => {
    const variantId = await makeVariant(1000);
    const v = await createVoucher({
      code: 'COUNTME',
      type: VoucherType.PERCENT,
      value: 10,
    }).expect(201);

    const order = await createOrder(variantId, 1, 'COUNTME').expect(201);
    // Pending order has not consumed a use (invariant 5).
    let voucher = await prisma.voucher.findUniqueOrThrow({
      where: { id: v.body.id },
    });
    expect(voucher.usedCount).toBe(0);

    const eventId = randomUUID();
    await pay({ eventId, orderId: order.body.id }).expect(200);
    voucher = await prisma.voucher.findUniqueOrThrow({
      where: { id: v.body.id },
    });
    expect(voucher.usedCount).toBe(1);

    // Replay: no double count.
    await pay({ eventId, orderId: order.body.id }).expect(200);
    voucher = await prisma.voucher.findUniqueOrThrow({
      where: { id: v.body.id },
    });
    expect(voucher.usedCount).toBe(1);
  });
});
