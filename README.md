# nest-commerce

The **ops core of an e-commerce backend** — NestJS + Prisma + PostgreSQL — plus a deliberately plain Next.js reference storefront that exercises it end to end.

> **Honesty note:** this is a practice / portfolio project, built to learn NestJS + Prisma and to rehearse the risky parts of a real commerce build (transactions, stock integrity, idempotent payment webhooks, voucher logic). It is **not production software** — no real payment gateway, no deployment story, guest checkout only.

## What it proves (each has a dedicated e2e test)

- **Atomic stock**: decrements happen in one Prisma `$transaction` with a conditional `stockQty >= qty` guard — oversell returns 409 and rolls back everything; stock can never go negative under racing payments
- **Idempotent payment webhook**: HMAC-SHA256 signature over the raw body (timing-safe compare) + a `WebhookEvent` unique-id ledger — replaying a delivery produces zero double effects
- **Price snapshots**: order items store price-at-purchase; editing a variant's price never moves an existing order's totals
- **Voucher engine**: percent/fixed with expiry, usage limit, min spend — validated at order creation (422), usage counted only at payment, inside the same transaction
- **Money as integer sen** end to end; formatting to RM only at the display edge

## Stack

pnpm workspace monorepo:

| App | Stack | Role |
| --- | --- | --- |
| `apps/api` | NestJS 11, Prisma 7 (pg driver adapter), PostgreSQL 16, JWT + Passport, class-validator, helmet + throttler | All business logic |
| `apps/web` | Next.js 16, plain Tailwind | Reference storefront — display and API calls only, zero business rules |

## Run it

```bash
docker compose up -d                 # Postgres 16 (dev + test databases)
pnpm install
pnpm --filter api exec prisma migrate dev
pnpm --filter api exec prisma db seed   # admin/staff users, products, vouchers
pnpm --filter api start:dev          # API on :4000
pnpm --filter web dev                # storefront on :3000
```

Copy `apps/api/.env.example` → `apps/api/.env` and `apps/web/.env.example` → `apps/web/.env.local` first.

**The loop:** browse → add to cart → checkout (try voucher `WELCOME10`) → **Fake Pay** → order flips PAID and stock visibly drops. "Fake Pay" is a Next server route that holds the webhook secret server-side and sends a signed CHIP-style callback to the API — the browser never sees the secret.

Admin surface is API-only (no UI): login via `POST /auth/login` (see seed credentials in `.env.example`), then manage products/variants/vouchers and read reports (`/reports/daily-revenue`, `/reports/top-products`, `/reports/low-stock`).

## Tests

```bash
pnpm --filter api test        # unit
pnpm --filter api test:e2e    # 43 e2e against the dedicated test database
```

CI (GitHub Actions): lint + build + unit + e2e (Postgres service container) + dependency audit, for both apps.

## Spec-driven

Everything was built against the specs in [`context/`](./context) — written and approved before any code, one gated unit at a time. `context/progress-tracker.md` is the honest build log, including the bugs found along the way.
