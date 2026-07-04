import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Products & Variants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;

  const admin = { email: 'admin.prod@test.local', password: 'admin1234' };
  const staff = { email: 'staff.prod@test.local', password: 'staff1234' };

  const login = async (creds: {
    email: string;
    password: string;
  }): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(200);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.variant.deleteMany();
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
    adminToken = await login(admin);
    staffToken = await login(staff);
  });

  afterEach(async () => {
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  const productBody = {
    name: 'Classic Tee',
    slug: 'classic-tee',
    description: 'A plain cotton tee',
  };

  const createProduct = async (body = productBody) => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
    return res.body as { id: string; slug: string };
  };

  it('GET /products is public and returns an array', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('admin can create a product; it then appears on the public detail route', async () => {
    const created = await createProduct();
    expect(created.id).toEqual(expect.any(String));

    const res = await request(app.getHttpServer())
      .get(`/products/${productBody.slug}`)
      .expect(200);
    expect(res.body).toMatchObject({ slug: productBody.slug });
    expect(res.body.variants).toEqual([]);
  });

  it('rejects product creation by STAFF with 403 (RolesGuard)', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(productBody)
      .expect(403);
  });

  it('rejects product creation without a token with 401', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send(productBody)
      .expect(401);
  });

  it('rejects a duplicate slug with 409', async () => {
    await createProduct();
    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productBody)
      .expect(409);
  });

  it('rejects an invalid product body with 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', slug: 'Not A Slug' })
      .expect(400);
  });

  it('returns 404 for an unknown product slug', () => {
    return request(app.getHttpServer())
      .get('/products/does-not-exist')
      .expect(404);
  });

  it('admin can add a variant; it shows on the product detail', async () => {
    const product = await createProduct();
    const variantBody = {
      sku: 'TEE-BLK-M',
      name: 'Black / M',
      priceSen: 4900,
      stockQty: 10,
    };
    const res = await request(app.getHttpServer())
      .post(`/products/${product.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(variantBody)
      .expect(201);
    expect(res.body).toMatchObject({ sku: 'TEE-BLK-M', priceSen: 4900 });

    const detail = await request(app.getHttpServer())
      .get(`/products/${product.slug}`)
      .expect(200);
    expect(detail.body.variants).toHaveLength(1);
  });

  it('rejects a duplicate variant sku with 409', async () => {
    const product = await createProduct();
    const variantBody = {
      sku: 'TEE-BLK-M',
      name: 'Black / M',
      priceSen: 4900,
      stockQty: 10,
    };
    await request(app.getHttpServer())
      .post(`/products/${product.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(variantBody)
      .expect(201);
    return request(app.getHttpServer())
      .post(`/products/${product.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(variantBody)
      .expect(409);
  });

  it('rejects a negative price with 400', async () => {
    const product = await createProduct();
    return request(app.getHttpServer())
      .post(`/products/${product.id}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'X', name: 'X', priceSen: -1, stockQty: 0 })
      .expect(400);
  });

  it('returns 404 when adding a variant to a missing product', () => {
    return request(app.getHttpServer())
      .post('/products/00000000-0000-0000-0000-000000000000/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'Y', name: 'Y', priceSen: 100, stockQty: 1 })
      .expect(404);
  });

  it('admin can update then delete a product (204), after which detail is 404', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Tee' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    return request(app.getHttpServer())
      .get(`/products/${product.slug}`)
      .expect(404);
  });
});
