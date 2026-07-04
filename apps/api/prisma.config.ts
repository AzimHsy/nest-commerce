import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 moved CLI connection config out of schema.prisma into this file.
// Only the CLI (migrate, db, generate introspection) reads this; the running
// app connects via the pg driver adapter in src/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
