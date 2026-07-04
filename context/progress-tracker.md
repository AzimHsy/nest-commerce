# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Unit 3 (products + variants CRUD) — DONE. Next: Unit 4 (orders + stock).**

## Current Goal

- Unit 4: create-order flow, `$transaction` stock decrement, oversell 409, idempotent signed payment webhook

## Completed

- 2026-07-04: Discussion phase (stack strategy session → NestJS+Prisma chosen → project shape agreed: ops-core API + plain reference storefront, pnpm monorepo, Docker Postgres, public repo)
- 2026-07-04: Repo created from `AzimHsy/context-kit` template; all six context files filled from the discussion
- 2026-07-04: Specs approved by Azim (committed + pushed as `4d012e3`) — hard gate cleared
- 2026-07-04: Unit 0 install — VirtualMachinePlatform feature enabled (DISM exit 0), WSL 2.7.10 + Docker Desktop 4.80.0 installed via winget (elevated, all exit 0); binaries verified on disk
- 2026-07-04: **Unit 0 CLOSED** — rebooted, WSL2 default, Docker engine 29.6.1 up, `docker run --rm hello-world` prints "Hello from Docker!" exit 0 (fresh verification)
- 2026-07-04: **Unit 1 CLOSED** — pnpm workspace (`apps/api` Nest 11 + `apps/web` Next 16, plain Tailwind); `docker-compose.yml` Postgres 16 (dev `nest_commerce` + test `nest_commerce_test` via init script), container healthy; Prisma 7 wired on the **pg driver adapter** (`prisma.config.ts` + `PrismaService` with `@prisma/adapter-pg`); global `PrismaModule`; `GET /health` does `SELECT 1` → `{status:ok, db:up}`; e2e routed to test db (`setup-e2e.ts`) and **passing**; `pnpm -r build` exit 0. Strict TS on. pnpm build approvals set (sharp, unrs-resolver, prisma, @prisma/engines)

- 2026-07-04: **Unit 2 CLOSED** — Auth. `User` model + `Role` enum (ADMIN/STAFF), first migration `init_auth` applied. `POST /auth/login` (bcryptjs verify → signed JWT), `GET /auth/me` (JwtAuthGuard). Passport JwtStrategy; global ValidationPipe (whitelist/forbidNonWhitelisted/transform); `@Roles`/`@CurrentUser` decorators. Seed upserts admin+staff (verified). Tests: 6 e2e + 5 RolesGuard unit. `pnpm -r build` exit 0.
- 2026-07-04: **Unit 3 CLOSED** — Products + Variants CRUD. `Product` (slug unique) + `Variant` (sku unique, priceSen, stockQty, cascade delete) models, migration `products_variants`. Public reads (`GET /products`, `GET /products/:slug` with variants, 404 on miss). Admin-only writes via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMIN)`: product POST/PATCH/DELETE, variant POST (under product) / PATCH / DELETE. class-validator DTOs + `PartialType` for updates. P2002 → 409 conflict, missing → 404. Tests: **12 products e2e** (public list/detail, admin create, **STAFF→403 = RolesGuard end-to-end**, 401 no-token, 409 dup slug/sku, 400 invalid/negative price, 404 missing, update+delete 204) — total suite now **18 e2e + 5 unit**, `pnpm -r build` exit 0.

## In Progress

- None — at Unit 3/4 boundary.

## Next Up

- Unit 4: Orders + stock — create-order flow, atomic `$transaction` decrement with `stockQty >= qty` guard, oversell → 409, idempotent signed payment webhook (`WebhookEvent` ledger), voucher check hook (voucher engine is Unit 5)

## Open Questions

- None.

## Notes / Deviations

- **bcryptjs instead of native bcrypt** (2026-07-04) — native bcrypt needs node-gyp; on Windows + Node 24 that's a build gamble with no benefit. bcryptjs is pure-JS, same `hash`/`compare` API. Spec said "bcrypt" generically; intent preserved.
- **Prisma 7 gotcha**: `migrate dev` auto-generate can lag the schema (client embedded a stale schema once). Always run an explicit `prisma generate` after a migration. Baked into the workflow.
- **RolesGuard wiring corrected in Unit 3**: Unit 2 registered RolesGuard as a global `APP_GUARD`, but global guards run BEFORE method-level `@UseGuards(JwtAuthGuard)`, so `request.user` wouldn't be set when a role check ran. Aligned to the spec (`code-standards.md`): removed the global registration; protected routes now use `@UseGuards(JwtAuthGuard, RolesGuard)` (guards execute in listed order → auth then role) + `@Roles(...)`. Verified end-to-end by the STAFF→403 e2e test.

## Architecture Decisions

- **Money as integer sen** — avoids float money bugs; unit suffix in field names (`priceSen`)
- **class-validator over Zod** — deliberately practicing canonical Nest idiom, not porting habits from the Next+Supabase stack
- **No refresh tokens** — access-token-only auth; refresh flow is real-world necessary but out of learning scope here
- **Storefront owns zero business rules** — all math/validation server-side; this is the decoupled-architecture lesson
- **Idempotency via `WebhookEvent` unique ledger** — pattern lifted from the Heartzira double-webhook lesson, formalized properly
- **pnpm workspace monorepo** — first use of the pnpm house rule (2026-07-04) + workspace learning
- **Prisma 7 with pg driver adapter** (Azim's call, 2026-07-04) — `@latest` installed Prisma 7, which drops `url` from `schema.prisma` and requires a driver adapter. Chose to adopt 7 (upstream alignment) over pinning to 6: URL now in `prisma.config.ts` (CLI) + `@prisma/adapter-pg` in `PrismaService` (runtime). architecture.md + code-standards.md updated to match

## Session Notes

- Purpose chain: this project rehearses the risky 30% of an upcoming ops-grade e-commerce client build and makes the Medusa-vs-Shopify-vs-custom decision evidence-based (build units 3–5 by hand → then spike Medusa → compare)
- Azim's background map for teaching: Spring Boot (`@RestController`→`@Controller`, `@Service`→`@Injectable`, `@Autowired`→constructor DI, Spring Security filters→Guards)
