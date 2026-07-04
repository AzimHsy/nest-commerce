# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Unit 1 (scaffold) — DONE. Next: Unit 2 (auth).**

## Current Goal

- Unit 2: users table, bcrypt, JWT login, roles guards (ADMIN/STAFF), seed admin

## Completed

- 2026-07-04: Discussion phase (stack strategy session → NestJS+Prisma chosen → project shape agreed: ops-core API + plain reference storefront, pnpm monorepo, Docker Postgres, public repo)
- 2026-07-04: Repo created from `AzimHsy/context-kit` template; all six context files filled from the discussion
- 2026-07-04: Specs approved by Azim (committed + pushed as `4d012e3`) — hard gate cleared
- 2026-07-04: Unit 0 install — VirtualMachinePlatform feature enabled (DISM exit 0), WSL 2.7.10 + Docker Desktop 4.80.0 installed via winget (elevated, all exit 0); binaries verified on disk
- 2026-07-04: **Unit 0 CLOSED** — rebooted, WSL2 default, Docker engine 29.6.1 up, `docker run --rm hello-world` prints "Hello from Docker!" exit 0 (fresh verification)
- 2026-07-04: **Unit 1 CLOSED** — pnpm workspace (`apps/api` Nest 11 + `apps/web` Next 16, plain Tailwind); `docker-compose.yml` Postgres 16 (dev `nest_commerce` + test `nest_commerce_test` via init script), container healthy; Prisma 7 wired on the **pg driver adapter** (`prisma.config.ts` + `PrismaService` with `@prisma/adapter-pg`); global `PrismaModule`; `GET /health` does `SELECT 1` → `{status:ok, db:up}`; e2e routed to test db (`setup-e2e.ts`) and **passing**; `pnpm -r build` exit 0. Strict TS on. pnpm build approvals set (sharp, unrs-resolver, prisma, @prisma/engines)

## In Progress

- None — at Unit 1/2 boundary.

## Next Up

- Unit 2: Auth (users, bcrypt, JWT login, roles guards, seed admin)

## Open Questions

- None at spec time.

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
