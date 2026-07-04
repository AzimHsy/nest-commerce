# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Specs written — awaiting Azim's approval (HARD GATE: no code until approved)**

## Current Goal

- Get the six context files approved, then start Unit 0 (Docker prerequisite) + Unit 1 (scaffold)

## Completed

- 2026-07-04: Discussion phase (stack strategy session → NestJS+Prisma chosen → project shape agreed: ops-core API + plain reference storefront, pnpm monorepo, Docker Postgres, public repo)
- 2026-07-04: Repo created from `AzimHsy/context-kit` template; all six context files filled from the discussion

## In Progress

- None.

## Next Up

- Unit 0: Install Docker Desktop (WSL2 backend) — verified NOT currently installed (`docker` not on PATH as of 2026-07-04)
- Unit 1: pnpm workspace scaffold (`apps/api` Nest + `apps/web` Next), Prisma init, docker-compose.yml, health endpoint

## Open Questions

- None at spec time.

## Architecture Decisions

- **Money as integer sen** — avoids float money bugs; unit suffix in field names (`priceSen`)
- **class-validator over Zod** — deliberately practicing canonical Nest idiom, not porting habits from the Next+Supabase stack
- **No refresh tokens** — access-token-only auth; refresh flow is real-world necessary but out of learning scope here
- **Storefront owns zero business rules** — all math/validation server-side; this is the decoupled-architecture lesson
- **Idempotency via `WebhookEvent` unique ledger** — pattern lifted from the Heartzira double-webhook lesson, formalized properly
- **pnpm workspace monorepo** — first use of the pnpm house rule (2026-07-04) + workspace learning

## Session Notes

- Purpose chain: this project rehearses the risky 30% of an upcoming ops-grade e-commerce client build and makes the Medusa-vs-Shopify-vs-custom decision evidence-based (build units 3–5 by hand → then spike Medusa → compare)
- Azim's background map for teaching: Spring Boot (`@RestController`→`@Controller`, `@Service`→`@Injectable`, `@Autowired`→constructor DI, Spring Security filters→Guards)
