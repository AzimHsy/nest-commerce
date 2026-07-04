import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { createHmac, randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Orders & Payment webhook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  const admin = { email: 'admin.ord@test.local', password: 'admin1234' };

  const sign = (payload: object) => {
    const body = JSON.stringify(payload);
    const secret = process.env.WEBHOOK_SECRET as string;
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    return { body, signature };
  };

  const pay = (payload: object, signature?: string) => {
    const signed = sign(payload);
    return request(app.getHttpServer())
      .post('/webhooks/payment')
      .set('x-webhook-signature', signature ?? signed.signature)
      .set('Content-Type', 'application/json')
      .send(signed.body);
  };

  // Creates a product with a single variant of the given stock/price.
  const makeVariant = async (
    stockQty: number,
    priceSen = 1000,
  ): Promise<{ productId: string; slug: string; variantId: string }> => {
    const slug = `p-${randomUUID().slice(0, 8)}`;
    const product = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Product', slug })
      .expect(201);
    const variant = await request(app.getHttpServer())
      .post(`/products/${product.body.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `SKU-${randomUUID().slice(0, 8)}`, name: 'V', priceSen, stockQty })
      .expect(201);
    return {
      productId: product.body.id,
      slug,
      variantId: variant.body.id,
    };
  };

  const createOrder = (variantId: string, qty: number) =>
    request(app.getHttpServer())
      .post('/orders')
      .send({
        customerName: 'Buyer',
        customerEmail: 'buyer@test.local',
        items: [{ variantId, qty }],
      });

  const stockOf = async (slug: string): Promise<number> => {
    const res = await request(app.getHttpServer())
      .get(`/products/${slug}`)
      .expect(200);
    return res.body.variants[0].stockQty as number;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // rawBody must be enabled here too — main.ts's NestFactory option doesn't
    // apply to the test fixture, and the signature guard reads req.rawBody.
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
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: admin.email,
        passwordHash: await hash(admin.password, 10),
        role: Role.ADMIN,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(admin)
      .expect(200);
    adminToken = login.body.accessToken;
  });

  afterEach(async () => {
    await prisma.order.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('creates a PENDING order with snapshotted line prices and correct total', async () => {
    const { variantId } = await makeVariant(10, 2500);
    const res = await createOrder(variantId, 2).expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.subtotalSen).toBe(5000);
    expect(res.body.totalSen).toBe(5000);
    expect(res.body.items[0].priceSenSnapshot).toBe(2500);
  });

  it('rejects an order that exceeds stock with 409, leaving stock untouched', async () => {
    const { slug, variantId } = await makeVariant(3);
    await createOrder(variantId, 5).expect(409);
    expect(await stockOf(slug)).toBe(3);
    const orders = await prisma.order.count();
    expect(orders).toBe(0);
  });

  it('pays a pending order: 200, order PAID, stock decremented exactly once', async () => {
    const { slug, variantId } = await makeVariant(10);
    const order = await createOrder(variantId, 4).expect(201);

    const res = await pay({ eventId: randomUUID(), orderId: order.body.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    expect(await stockOf(slug)).toBe(6);
    const paid = await request(app.getHttpServer())
      .get(`/orders/${order.body.id}`)
      .expect(200);
    expect(paid.body.status).toBe('PAID');
  });

  it('is idempotent: replaying the same event does not decrement twice', async () => {
    const { slug, variantId } = await makeVariant(10);
    const order = await createOrder(variantId, 4).expect(201);
    const eventId = randomUUID();

    const first = await pay({ eventId, orderId: order.body.id });
    expect(first.body.status).toBe('ok');
    const second = await pay({ eventId, orderId: order.body.id });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('already_processed');

    expect(await stockOf(slug)).toBe(6);
  });

  it('handles the payment-time race: second payment fails 409, stock never goes negative', async () => {
    const { slug, variantId } = await makeVariant(5);
    // Both orders validate at creation (stock is not reserved until payment).
    const orderA = await createOrder(variantId, 5).expect(201);
    const orderB = await createOrder(variantId, 5).expect(201);

    const payA = await pay({ eventId: randomUUID(), orderId: orderA.body.id });
    expect(payA.body.status).toBe('ok');

    const payB = await pay({ eventId: randomUUID(), orderId: orderB.body.id });
    expect(payB.status).toBe(409);

    expect(await stockOf(slug)).toBe(0);
    const b = await request(app.getHttpServer())
      .get(`/orders/${orderB.body.id}`)
      .expect(200);
    expect(b.body.status).toBe('PENDING');
  });

  it('rejects a webhook with an invalid signature (401) and does not pay', async () => {
    const { variantId } = await makeVariant(10);
    const order = await createOrder(variantId, 1).expect(201);

    const res = await pay(
      { eventId: randomUUID(), orderId: order.body.id },
      'deadbeef',
    );
    expect(res.status).toBe(401);

    const still = await request(app.getHttpServer())
      .get(`/orders/${order.body.id}`)
      .expect(200);
    expect(still.body.status).toBe('PENDING');
  });

  it('rejects a webhook with no signature header (401)', async () => {
    const { variantId } = await makeVariant(10);
    const order = await createOrder(variantId, 1).expect(201);
    return request(app.getHttpServer())
      .post('/webhooks/payment')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ eventId: randomUUID(), orderId: order.body.id }))
      .expect(401);
  });

  it('returns 404 when paying an unknown order (valid signature)', async () => {
    const res = await pay({ eventId: randomUUID(), orderId: randomUUID() });
    expect(res.status).toBe(404);
  });

  it('snapshots price: editing a variant price never moves an existing order total', async () => {
    const { productId: _productId, variantId } = await makeVariant(10, 1000);
    const order = await createOrder(variantId, 2).expect(201);
    expect(order.body.totalSen).toBe(2000);

    await request(app.getHttpServer())
      .patch(`/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priceSen: 9999 })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get(`/orders/${order.body.id}`)
      .expect(200);
    expect(after.body.totalSen).toBe(2000);
    expect(after.body.items[0].priceSenSnapshot).toBe(1000);
  });
});
