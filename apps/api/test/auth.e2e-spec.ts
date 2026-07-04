import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const admin = { email: 'admin.e2e@test.local', password: 'admin1234' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the production pipe so validation behaves identically in tests.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: admin.email,
        passwordHash: await hash(admin.password, 10),
        role: Role.ADMIN,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('POST /auth/login issues an access token for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(admin)
      .expect(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('POST /auth/login rejects a wrong password with 401', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /auth/login rejects a malformed body with 400', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('GET /auth/me returns 401 without a bearer token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me returns the principal for a valid token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(admin)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ email: admin.email, role: 'ADMIN' });
    expect(res.body.id).toEqual(expect.any(String));
  });
});
