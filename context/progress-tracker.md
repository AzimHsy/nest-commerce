# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **🏁 ALL UNITS (0–8) COMPLETE — project done.** First CI run pending Azim's push.

## Current Goal

- Post-completion: push to GitHub → confirm CI green → optional Medusa spike comparison (the purpose-chain follow-up)

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

- 2026-07-05: **Unit 6 CLOSED** — Reference storefront (plain per ui-context: system font, light only, Tailwind defaults, no libs/icons/animation; boilerplate webfonts+dark stripped). Pages: `/` product grid (from-price, sold-out), `/products/[slug]` (variant radio + stock + add-to-cart), `/cart` (qty/remove, display-only subtotal), `/checkout` (name/email/voucher form → POST /orders, 422/409 shown inline), `/orders/[id]` (server-fetched status/items/discount/totals + Fake Pay when PENDING). Client state = one `CartProvider` (localStorage); ALL math/validation server-side (invariant 6). **`/api/fake-pay` Next server route holds `WEBHOOK_SECRET` (no NEXT_PUBLIC), HMAC-signs a fresh eventId and forwards to the API** — browser never sees the secret. **VERIFIED LIVE end-to-end**: home renders 3 seeded products; checkout 2×TEE-BLK-M + WELCOME10 → 9800/-980/8820; order page PENDING→ fake-pay `{"status":"ok"}` → PAID + "Payment received"; product page stock **15→13 visibly**. `pnpm --filter web build` exit 0 (7 routes). API untouched this unit (37 e2e still valid). Effort well under the 20% cap.

- 2026-07-05: **Unit 7 CLOSED** — Reports. Added `Order.paidAt` (set inside the payment `$transaction`; migration `order_paid_at`) so revenue is keyed on payment day, not order day. `/reports` guarded `@Roles(ADMIN, STAFF)` (STAFF may read reports per access model): `daily-revenue` (raw SQL `date_trunc` on `paidAt`, PAID only), `top-products?limit=` (raw SQL join, units + `qty × priceSenSnapshot` revenue — the two spec-sanctioned raw-SQL aggregations; bigint→Number at the edge), `low-stock?threshold=` (typed Prisma `lte`, ascending). Tests: **6 reports e2e** (anon 401, STAFF 200, revenue math 3 orders = 10000 sen with unpaid order excluded, top ordering + snapshot revenue, `?limit`, threshold behavior) — suite **43 e2e + 5 unit**, build exit 0.

- 2026-07-05: **Unit 8 CLOSED — PROJECT COMPLETE.** Hardening: helmet (CSP/HSTS/nosniff/frame-options **verified live**); CORS restricted to `CORS_ORIGINS` (allowed origin echoes ACAO, evil origin gets none — verified live); `@nestjs/throttler` global 100/min env-tunable (**verified live: first 429 at exactly request #97 after 4 probe requests**) + login tightened to 10/min (**verified: 10×401 then 429**), e2e overrides limit via `setup-e2e.ts`. `.github/workflows/ci.yml` = the reusable CI template (postgres:16 service + test-db create, pnpm/node cache, install→generate→lint→build→unit→e2e→`pnpm audit --audit-level high`). Lint brought to zero across both apps (api: unsafe-* rules relaxed for test files only — supertest `res.body` is `any` by design; web: one justified inline disable for cart localStorage hydration). **Fixed latent bug**: `prisma.config.ts` outside `src/` had shifted `nest build` output to `dist/src/main.js`, silently breaking `start:prod` since Unit 1 — excluded prisma files in `tsconfig.build.json`, `dist/main.js` restored, prod boot verified. Honest README written (practice project, run instructions, correctness pillars). Final gate: **43 e2e + 5 unit, build + lint exit 0.**

## In Progress

- None. Project complete.

## Next Up

- Azim: `git push origin main` → watch first CI run
- Optional (purpose chain): spike Medusa v2, compare against these hand-built units 3–5 to make the client-build engine decision evidence-based

## Security Pass (Unit 8 final checklist)

- ✅ Every endpoint validated (global ValidationPipe whitelist+forbid; DTOs on all bodies; ParseIntPipe on query params)
- ✅ Secrets only from env (`JWT_SECRET`, `WEBHOOK_SECRET`); `.env` gitignored both apps, `.env.example` current; webhook secret server-side only in the storefront
- ✅ AuthN/AuthZ: JWT (15m, no refresh by scope), roles enforced via guards; login rate-limited 10/min; same 401 for bad-user/bad-password
- ✅ Webhook: HMAC-SHA256 over raw body, timing-safe compare, idempotency ledger
- ✅ helmet, CORS allowlist, global throttle — all verified live, not assumed
- ✅ SQL: Prisma parameterized throughout; the two raw aggregations use `Prisma.sql` tagged templates (no string interpolation of user input; `limit` is ParseIntPipe-validated)
- ✅ No stack traces/internals in error responses (Nest HTTP exceptions only)

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
