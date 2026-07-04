# Code Standards

## General

- Keep modules small and single-purpose; one Nest module per business domain
- Fix root causes, do not layer workarounds
- This is a LEARNING project: prefer the idiomatic framework way over clever shortcuts — when Nest has a canonical pattern (guards, pipes, interceptors, exception filters), use it, even if a plainer hack would be shorter

## TypeScript

- Strict mode everywhere, both apps
- No `any` — explicit types; let Prisma's generated types flow through services
- Validate ALL external input at the boundary before any logic runs

## NestJS (`apps/api`)

- Controllers: HTTP concerns only (routing, DTOs, status codes) — zero business logic
- Services: all business logic; injected via constructor DI
- Validation: **class-validator + class-transformer DTOs with a global `ValidationPipe`** (`whitelist: true, forbidNonWhitelisted: true`) — the canonical Nest idiom (deliberately NOT Zod here; this project practices Nest conventions)
- Auth: Passport JWT strategy + `@UseGuards(JwtAuthGuard, RolesGuard)` with a `@Roles()` decorator
- Errors: throw Nest HTTP exceptions (`ConflictException` for oversell/duplicate, `UnprocessableEntityException` for invalid vouchers, etc.) — consistent JSON error shape
- Config via `@nestjs/config`; secrets only from env; `.env.example` kept current

## Prisma

- `schema.prisma` is the single source of truth; every change lands via `prisma migrate dev` (no db push)
- **Prisma 7**: no `url` in `schema.prisma`. CLI reads it from `prisma.config.ts`; the app connects through a `@prisma/adapter-pg` driver adapter (`new PrismaClient({ adapter })`). CLI commands need env loaded — run via `pnpm --filter api exec prisma …` from `apps/api`
- Multi-step money/stock mutations ALWAYS inside `$transaction`
- Conditional updates for stock (`updateMany` with `stockQty: { gte: qty }` guard, check affected count) — never read-then-write races

## Next.js (`apps/web`)

- Server components by default; `"use client"` only for cart state and forms
- All API access through a single tiny `lib/api.ts` fetch wrapper reading `NEXT_PUBLIC_API_URL`
- No business rules in the storefront (see architecture invariant 6)

## Testing

- e2e per unit with Jest + supertest against `nest_commerce_test` (migrate-reset per suite)
- Every correctness invariant gets an explicit test: oversell 409, webhook replay no-op, voucher rejection cases, price-snapshot immutability
- Tests must pass before a unit is called done — no completion claims without fresh verification evidence

## Money

- Integer sen end to end. Field names carry the unit (`priceSen`, `totalSen`). Formatting helper lives in `apps/web` only

## File Organization

- `apps/api/src/<domain>/` — `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `*.spec` colocated
- `apps/api/prisma/` — schema + migrations + `seed.ts` (few products/variants/vouchers + one admin user)
- `apps/api/test/` — e2e suites
- `apps/web/app/` — routes; `apps/web/components/` — shared JSX; `apps/web/lib/` — api client + RM formatter
- Root: `docker-compose.yml`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`
