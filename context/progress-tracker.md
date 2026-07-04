# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Unit 5 (voucher engine) — DONE. Next: Unit 6 (reference storefront).**

## Current Goal

- Unit 6: plain Next.js storefront — browse → cart → voucher checkout → fake-pay (Next server route signs webhook) → confirmation, stock visibly drops. ≤20% effort cap, ui-context constraints.

## Completed

- 2026-07-04: Discussion phase (stack strategy session → NestJS+Prisma chosen → project shape agreed: ops-core API + plain reference storefront, pnpm monorepo, Docker Postgres, public repo)
- 2026-07-04: Repo created from `AzimHsy/context-kit` template; all six context files filled from the discussion
- 2026-07-04: Specs approved by Azim (committed + pushed as `4d012e3`) — hard gate cleared
- 2026-07-04: Unit 0 install — VirtualMachinePlatform feature enabled (DISM exit 0), WSL 2.7.10 + Docker Desktop 4.80.0 installed via winget (elevated, all exit 0); binaries verified on disk
- 2026-07-04: **Unit 0 CLOSED** — rebooted, WSL2 default, Docker engine 29.6.1 up, `docker run --rm hello-world` prints "Hello from Docker!" exit 0 (fresh verification)
- 2026-07-04: **Unit 1 CLOSED** — pnpm workspace (`apps/api` Nest 11 + `apps/web` Next 16, plain Tailwind); `docker-compose.yml` Postgres 16 (dev `nest_commerce` + test `nest_commerce_test` via init script), container healthy; Prisma 7 wired on the **pg driver adapter** (`prisma.config.ts` + `PrismaService` with `@prisma/adapter-pg`); global `PrismaModule`; `GET /health` does `SELECT 1` → `{status:ok, db:up}`; e2e routed to test db (`setup-e2e.ts`) and **passing**; `pnpm -r build` exit 0. Strict TS on. pnpm build approvals set (sharp, unrs-resolver, prisma, @prisma/engines)

- 2026-07-04: **Unit 2 CLOSED** — Auth. `User` model + `Role` enum (ADMIN/STAFF), first migration `init_auth` applied. `POST /auth/login` (bcryptjs verify → signed JWT), `GET /auth/me` (JwtAuthGuard). Passport JwtStrategy; global ValidationPipe (whitelist/forbidNonWhitelisted/transform); `@Roles`/`@CurrentUser` decorators. Seed upserts admin+staff (verified). Tests: 6 e2e + 5 RolesGuard unit. `pnpm -r build` exit 0.
- 2026-07-04: **Unit 3 CLOSED** — Products + Variants CRUD. `Product` (slug unique) + `Variant` (sku unique, priceSen, stockQty, cascade delete) models, migration `products_variants`. Public reads (`GET /products`, `GET /products/:slug` with variants, 404 on miss). Admin-only writes via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMIN)`: product POST/PATCH/DELETE, variant POST (under product) / PATCH / DELETE. class-validator DTOs + `PartialType` for updates. P2002 → 409 conflict, missing → 404. Tests: **12 products e2e** (public list/detail, admin create, **STAFF→403 = RolesGuard end-to-end**, 401 no-token, 409 dup slug/sku, 400 invalid/negative price, 404 missing, update+delete 204) — total suite now **18 e2e + 5 unit**, `pnpm -r build` exit 0.

- 2026-07-05: **Unit 4 CLOSED** — Orders + stock + payment webhook (the risky-30% core). Models: `Order` (PENDING/PAID/CANCELLED, money fields, voucherId? placeholder) + `OrderItem` (`priceSenSnapshot`) + `WebhookEvent` (unique `externalEventId` ledger); migration `orders_stock_webhooks`. `POST /orders` (public): validates stock (fail-fast 409, NOT reserved), snapshots prices, computes totals server-side. `GET /orders/:id`. `POST /webhooks/payment`: HMAC-SHA256 signature guard over **raw body** (`rawBody: true` + timing-safe compare), then idempotent processing — ledger insert + conditional `updateMany` decrement (`stockQty >= qty`, count!==1 → 409 rollback) + status→PAID, all in ONE `$transaction`; duplicate event → 200 `already_processed` (fast path + P2002 race path). Tests: **9 orders e2e** (pending order w/ snapshot totals, creation oversell 409 stock-untouched, happy pay decrements once, replay no-op, payment-race 409 + never-negative, bad/missing signature 401 leaves PENDING, unknown order 404, price-edit never moves existing totals) — suite now **27 e2e + 5 unit**, `pnpm -r build` exit 0.

- 2026-07-05: **Unit 5 CLOSED** — Voucher engine. `Voucher` model (`code` unique, PERCENT|FIXED, `value`, `expiresAt?`, `usageLimit?`, `usedCount`, `minSpendSen?`) + real `Order.voucher` relation; migration `vouchers`. ADMIN-only CRUD (`/vouchers` — STAFF 403 per access model); PERCENT value >100 → 400. Order creation takes optional `voucherCode`: validated there (unknown/expired/at-limit/min-spend → **422**), discount computed server-side (PERCENT floors; FIXED capped at subtotal so total ≥ 0), `voucherId` stored. Payment webhook increments `usedCount` inside the SAME `$transaction` (invariant 5: pending order never consumes a use) — unconditional increment; documented trade-off: a race between two pending orders on a nearly-exhausted voucher can slightly exceed `usageLimit` (can't decline received money at webhook time). Seed extended: 3 products/6 variants + `WELCOME10` (10% min-RM50) + `RM5OFF` (fixed). Tests: **10 voucher e2e** (CRUD+409, 403/401, >100% 400, percent-floor math 999→99, fixed cap → total 0, expired/limit/min-spend/unknown 422, usedCount 0-until-paid → 1 → replay stays 1) — suite **37 e2e + 5 unit**, build exit 0.

## In Progress

- None — at Unit 5/6 boundary.

## Next Up

- Unit 6: Reference storefront (`apps/web`) — full visible loop: browse → cart → voucher checkout → fake-pay → stock drop. Fake-pay = Next server route holding `WEBHOOK_SECRET` server-side, signs + forwards to the API. HARD: no polish, ≤20% effort cap.

## Open Questions

- None.

## Notes / Deviations

- **bcryptjs instead of native bcrypt** (2026-07-04) — native bcrypt needs node-gyp; on Windows + Node 24 that's a build gamble with no benefit. bcryptjs is pure-JS, same `hash`/`compare` API. Spec said "bcrypt" generically; intent preserved.
- **Prisma 7 gotcha**: `migrate dev` auto-generate can lag the schema (client embedded a stale schema once). Always run an explicit `prisma generate` after a migration. Baked into the workflow.
- **Nest testing gotcha (Unit 4)**: `NestFactory.create(AppModule, { rawBody: true })` in main.ts does NOT apply to e2e fixtures — `moduleFixture.createNestApplication({ rawBody: true })` must repeat the option, or `req.rawBody` is undefined and signature verification 401s only in tests.
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
