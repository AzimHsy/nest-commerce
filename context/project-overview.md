# nest-commerce

## Overview

A practice/portfolio project: the **ops core of an e-commerce backend** built with NestJS + Prisma, plus a deliberately plain Next.js reference storefront that exercises it end-to-end. Built by Azim to (a) learn NestJS + Prisma ahead of a real ops-grade e-commerce client project, (b) rehearse the risky 30% of that build — transactions, stock integrity, idempotent payment webhooks, voucher logic — and (c) produce a public portfolio artifact. **Not production software**, and the README says so honestly.

## Goals

1. Write idiomatic NestJS (modules, DI, guards, pipes) by mapping from known Spring Boot concepts — measurable: every unit's code passes review against Nest conventions, no framework-fighting
2. Learn Prisma end to end: schema modeling, relations, migrations, `$transaction` — measurable: all data access goes through Prisma, zero raw SQL except where aggregations demand it
3. Prove commerce ops correctness with tests: atomic stock decrement, oversell rejection (409), webhook idempotency (duplicate delivery = no double effects), voucher rules — measurable: each has a dedicated e2e test
4. Learn decoupled frontend↔API architecture (CORS, env-based API URL) — new territory vs. the usual Next+Supabase monolith
5. Produce a reusable GitHub Actions CI template (build/lint/test/audit across a two-app workspace)

## Core User Flow (reference storefront)

1. Visitor browses the product list → opens a product page (variants with per-variant price and stock)
2. Adds variant(s) to a client-side cart
3. Checkout: enters name/email, optionally applies a voucher code → API validates voucher + stock and creates the order (status `PENDING`)
4. Clicks **"Fake Pay"** → storefront triggers the payment webhook (simulating a CHIP-style signed callback)
5. API verifies the signature, transitions the order to `PAID` exactly once (idempotent), atomically decrements variant stock, counts voucher usage
6. Storefront shows the confirmation; the product page now shows reduced stock

## Admin Flow (API-only — no admin UI)

1. Admin/staff logs in via `POST /auth/login` → JWT
2. Manages products, variants, and vouchers via REST endpoints (exercised through an HTTP client and e2e tests)
3. Reads reports: daily revenue, top products, low stock

## Features

### Backend (`apps/api` — the point of the project)

- JWT auth with `ADMIN` / `STAFF` roles enforced by guards
- Products with per-variant SKU, price, and stock (proper variant modeling — deliberately fixing the Heartzira one-row-per-design shortcut)
- Orders with per-item price snapshots taken at purchase time
- Atomic stock handling inside Prisma `$transaction`; oversell → 409
- Idempotent payment webhook with signature verification, backed by a `WebhookEvent` ledger
- Voucher engine: percent/fixed, expiry, usage limit, min spend
- Reports via aggregation queries
- Rate limiting, helmet, strict validation on every endpoint

### Reference storefront (`apps/web` — supporting cast only)

- Product list, product page, cart, checkout with voucher field, fake-pay button, order confirmation
- Guest checkout only, plain Tailwind
- **Hard constraint: no Framer Motion / GSAP / Lenis / shadcn / design polish.** Budget ≤ 20% of total project effort

## Scope

### In Scope

- Everything listed under Features
- Docker Compose Postgres for dev + test databases
- e2e tests (Jest + supertest) per backend unit; CI running them

### Out of Scope

- Admin UI, customer accounts, wishlist, search, emails, real payment gateway, shipping logic, refunds/returns, i18n, deployment/hosting of any kind

## Success Criteria

1. Full storefront loop works locally: browse → cart → voucher checkout → fake-pay → stock visibly decremented
2. e2e proof of the three correctness pillars: oversell returns 409 and leaves data untouched; replayed webhook produces no double decrement/usage; expired/over-limit/min-spend voucher is rejected at order creation
3. CI is green on GitHub (build + lint + test + audit for both apps)
4. All 9 units (0–8) completed with the tracker updated per unit
