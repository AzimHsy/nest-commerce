import 'dotenv/config';
import { PrismaClient, Role, VoucherType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

// Idempotent seed: upsert one ADMIN and one STAFF user so the API is usable
// (and so later units can test role restrictions) without duplicating rows on
// re-run. Credentials come from env; the .env.example documents the defaults.
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const seedUser = async (
      email: string,
      password: string,
      role: Role,
    ): Promise<void> => {
      const passwordHash = await hash(password, 10);
      await prisma.user.upsert({
        where: { email },
        update: { passwordHash, role },
        create: { email, passwordHash, role },
      });
      console.log(`seeded ${role} ${email}`);
    };

    await seedUser(
      process.env.SEED_ADMIN_EMAIL ?? 'admin@nest-commerce.local',
      process.env.SEED_ADMIN_PASSWORD ?? 'admin1234',
      Role.ADMIN,
    );
    await seedUser(
      process.env.SEED_STAFF_EMAIL ?? 'staff@nest-commerce.local',
      process.env.SEED_STAFF_PASSWORD ?? 'staff1234',
      Role.STAFF,
    );

    // A few products/variants so the storefront (Unit 6) has something to show.
    const products: Array<{
      name: string;
      slug: string;
      description: string;
      variants: Array<{ sku: string; name: string; priceSen: number; stockQty: number }>;
    }> = [
      {
        name: 'Classic Tee',
        slug: 'classic-tee',
        description: 'Plain cotton tee. The reference product.',
        variants: [
          { sku: 'TEE-BLK-S', name: 'Black / S', priceSen: 4900, stockQty: 20 },
          { sku: 'TEE-BLK-M', name: 'Black / M', priceSen: 4900, stockQty: 15 },
          { sku: 'TEE-WHT-M', name: 'White / M', priceSen: 5200, stockQty: 5 },
        ],
      },
      {
        name: 'Canvas Tote',
        slug: 'canvas-tote',
        description: 'Sturdy tote bag, one size.',
        variants: [
          { sku: 'TOTE-NAT', name: 'Natural', priceSen: 3500, stockQty: 30 },
        ],
      },
      {
        name: 'Enamel Mug',
        slug: 'enamel-mug',
        description: 'Camping-style mug. Low stock on purpose.',
        variants: [
          { sku: 'MUG-BLU', name: 'Blue', priceSen: 2800, stockQty: 2 },
          { sku: 'MUG-RED', name: 'Red', priceSen: 2800, stockQty: 0 },
        ],
      },
    ];
    for (const p of products) {
      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          variants: { create: p.variants },
        },
      });
      console.log(`seeded product ${p.slug}`);
    }

    const vouchers = [
      {
        code: 'WELCOME10',
        type: VoucherType.PERCENT,
        value: 10,
        minSpendSen: 5000,
      },
      { code: 'RM5OFF', type: VoucherType.FIXED, value: 500, usageLimit: 100 },
    ];
    for (const v of vouchers) {
      await prisma.voucher.upsert({
        where: { code: v.code },
        update: {},
        create: v,
      });
      console.log(`seeded voucher ${v.code}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
