import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Runs once before the e2e suites: apply all migrations to the TEST database
// so its schema matches the dev database. Idempotent — `migrate deploy` is a
// no-op once the migrations are already applied.
export default function globalSetup(): void {
  config();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set');
  }
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    cwd: process.cwd(),
    // dotenv (loaded by prisma.config.ts) won't override an already-set var,
    // so forcing DATABASE_URL here points the CLI at the test database.
    env: { ...process.env, DATABASE_URL: url },
  });
}
