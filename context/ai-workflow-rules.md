# AI Workflow Rules

## Approach

Build incrementally, spec-driven. The context files define what to build and how; implement against them — do not infer or invent behavior. This is also a **teaching project**: when introducing a NestJS concept for the first time, briefly map it to its Spring Boot equivalent (Azim knows Spring), then show the idiomatic Nest usage.

## Unit Plan (fixed order — one at a time)

0. **Prerequisite**: Docker Desktop installed, `docker compose up -d` brings up Postgres (dev + test dbs)
1. Scaffold: pnpm workspace, Nest app, Prisma init, health endpoint, repo pushed
2. Auth: users, bcrypt, JWT login, roles guards (+ seed admin)
3. Products + variants CRUD with validation
4. Orders + stock: create-order flow, `$transaction` decrement, oversell 409, idempotent signed payment webhook
5. Voucher engine: validation at order creation, usage count at payment
6. Reference storefront: full visible loop (browse → cart → voucher checkout → fake-pay → stock drop)
7. Reports: daily revenue, top products, low stock
8. Hardening: throttler, helmet, CORS tightened, CI workflow, final security pass

## Scoping Rules

- One unit at a time; do not start the next until the current one's gate passes
- Prefer small verifiable increments; if a change can't be verified end to end quickly, split it
- Storefront work is capped at ≤ 20% of total effort — surface it if the cap is threatened

## When to Split Work

Split a step if it combines: API changes + storefront changes · multiple domain modules · behavior not defined in the context files.

## Handling Missing Requirements

- Do not invent product behavior; resolve ambiguity in the relevant context file FIRST
- Missing requirement → add to Open Questions in `progress-tracker.md`, ask Azim, then continue
- Real design forks get surfaced to Azim with options + a recommendation before implementing

## Protected Files

- `apps/api/prisma/migrations/*` — never hand-edit applied migrations
- Generated Prisma client output

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes architecture, storage, standards, or scope. Update `progress-tracker.md` after every unit.

## Before Moving to the Next Unit (gate)

1. The unit works end to end within its scope — demonstrated fresh (run the command/test, read the output; no completion claims without verification evidence)
2. e2e tests for the unit's invariants pass (`pnpm --filter api test:e2e`)
3. Both apps build: `pnpm -r build`
4. No `architecture.md` invariant violated
5. `progress-tracker.md` updated
