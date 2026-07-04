# Architecture Context

## Stack

| Layer    | Technology                          | Role                                                   |
| -------- | ----------------------------------- | ------------------------------------------------------ |
| Monorepo | pnpm workspaces                     | `apps/api` + `apps/web`, shared root tooling           |
| Backend  | NestJS (latest) + TypeScript strict | The ops core — ALL business logic lives here           |
| ORM      | Prisma 7 (pg driver adapter)        | Schema, migrations, typed client, `$transaction`       |
| Database | PostgreSQL 16 via Docker Compose    | Dev database + separate test database, local only      |
| Frontend | Next.js (latest) + Tailwind         | Reference storefront — exercises the API, nothing more |
| Auth     | `@nestjs/jwt` + Passport + bcrypt   | JWT access tokens; roles enforced by guards            |
| Testing  | Jest + supertest                    | e2e tests per unit against the test database           |
| CI       | GitHub Actions                      | build + lint + test + `pnpm audit`, both apps          |

## System Boundaries

- `apps/api/src/<domain>/` — one Nest module per domain: `auth`, `products`, `orders`, `vouchers`, `webhooks`, `reports`. Controllers handle HTTP only; services hold business logic; modules import each other's public module, never internals
- `apps/api/prisma/` — `schema.prisma` + migrations. The ONLY place the data model is defined. Prisma 7: the connection URL lives in `apps/api/prisma.config.ts` (CLI) and the runtime client gets a `@prisma/adapter-pg` adapter built from `DATABASE_URL` in `src/prisma/prisma.service.ts` — not in `schema.prisma`
- `apps/web/` — storefront. Talks to the API exclusively via `NEXT_PUBLIC_API_URL`; owns zero business rules (no price math, no stock logic, no voucher validation — display and API calls only)
- `docker-compose.yml` (root) — Postgres with `nest_commerce` (dev) and `nest_commerce_test` (test) databases

## Storage Model

- **PostgreSQL via Prisma**: everything — `User`, `Product`, `Variant`, `Order`, `OrderItem`, `Voucher`, `WebhookEvent`
- **No blob/file storage.** Product images are a plain optional `imageUrl` string (may be empty or point anywhere); this project does not handle uploads

## Data Model (summary — `schema.prisma` becomes canonical once written)

- `User` — email (unique), passwordHash, role `ADMIN | STAFF`
- `Product` — name, slug (unique), description, imageUrl? → has many `Variant`
- `Variant` — sku (unique), name, `priceSen Int`, `stockQty Int` → belongs to `Product`
- `Order` — status `PENDING | PAID | CANCELLED`, customerName, customerEmail, `subtotalSen`, `discountSen`, `totalSen`, voucherId?, timestamps → has many `OrderItem`
- `OrderItem` — variantId, qty, `priceSenSnapshot` (price at purchase, never recomputed)
- `Voucher` — code (unique), type `PERCENT | FIXED`, value, expiresAt?, usageLimit?, usedCount, minSpendSen?
- `WebhookEvent` — externalEventId (unique), processedAt — the idempotency ledger

## Auth and Access Model

- Admin/staff authenticate with email+password → short-lived JWT access token (no refresh tokens — out of scope for practice)
- `ADMIN`: full CRUD on products/variants/vouchers + reports. `STAFF`: read products/orders + reports only
- All public storefront endpoints (list/detail products, create order, webhook) are unauthenticated; the webhook is protected by signature verification instead
- **Fake-pay signing**: the storefront button calls a Next server route inside `apps/web` (`app/api/fake-pay/route.ts`) which holds the shared webhook secret **server-side** and sends the signed webhook to the API — the browser never sees the secret. This keeps signature verification real end to end

## Invariants

1. **All money is integer sen.** No floats anywhere in money paths; formatting to RM happens only at the display edge in `apps/web`
2. **Stock changes happen only inside a Prisma `$transaction`** with a conditional decrement (`stockQty >= qty`). Any violation → 409 and the entire order mutation rolls back
3. **An order transitions to PAID at most once.** Webhook flow: verify signature → try to insert `WebhookEvent` (unique externalEventId) → on conflict, return 200 with no side effects → otherwise transition + decrement + voucher-usage count, all in ONE transaction
4. **OrderItem prices are snapshots** — changing a variant's price never changes an existing order's totals
5. **Voucher validity is checked at order creation; usage is counted at payment** — a pending order never consumes a use
6. **The storefront owns no business rules** — totals, discounts, and stock states always come from the API

## Environments

- Dev: `docker compose up -d` → `pnpm --filter api start:dev` + `pnpm --filter web dev`
- Test: e2e suites run against `nest_commerce_test` with a migrate-reset before each suite
- No production. This project does not deploy
