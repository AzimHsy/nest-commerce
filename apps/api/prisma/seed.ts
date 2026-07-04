import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
