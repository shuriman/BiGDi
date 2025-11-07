# Repository Guide

This document describes the target structure and code organization rules for Zemo's modular architecture.

## Directory Overview
```
apps/
  api/          # HTTP API + SSR (NestJS)
  worker/       # BullMQ consumers and background tasks
packages/
  shared/       # Common types, DTOs, provider clients
infra/
  compose/      # docker-compose.yml, env templates, backup scripts
  migrations/   # SQL/Prisma migrations and helper scripts
docs/
  architecture/ # ADRs, diagrams, specifications
```

### apps/api
- `src/main.ts` — NestJS entry point, Fastify/Express adapter configuration.
- `src/app.module.ts` — Root module.
- Bounded context directories: `identity/`, `settings/`, `jobs/`, `prompts/`, `analytics/`, `text-processing/`.
- Inside each module: `controllers/`, `services/`, `dtos/`, `entities/`, `infrastructure/`.
- SSR: `views/` (ejs/nunjucks) + rendering adapter. SSR pages don't access database directly, only REST layers.
- WebSocket/SSE: `realtime/` module with Gateway, Redis Stream integration.

### apps/worker
- `src/bootstrap.ts` — BullMQ queue registration.
- `src/queues/<queue-name>/` — Queue configuration.
- `src/processors/<job-type>.processor.ts` — Job handlers.
- `src/services/` — Adapters for SerpApi, LLM, Puppeteer, logger.
- `src/domain/` — Core business logic (duplication allowed, common types → `packages/shared`).
- Ensure job idempotency, store progress in Redis/Postgres.

### packages/shared
- `src/dto/` — DTOs and validation schemas (zod/class-transformer). Used by API and worker.
- `src/domain/` — Domain types (JobType, JobStatus, RBAC roles).
- `src/clients/` — Common clients (Redis, PostgreSQL, SerpApi SDK) with interfaces.
- `src/utils/` — Utilities (logging, correlation id, error helpers).
- Package published within monorepo (npm workspace).

### infra/compose
- `docker-compose.yml` — Service description with healthchecks, volumes, resource limits.
- `env/` (future) — Environment variable templates (`.env.example`).
- Backup scenarios: `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` (TBD).

### infra/migrations
- If using Prisma — main migration directory will be in `packages/shared/prisma/`. The `infra/migrations` folder is for common SQL scripts (enable extensions, hotfixes).

## Dependency Rules
- `apps/api` and `apps/worker` can use `packages/shared`, but not depend on each other directly.
- Within one application, modules interact through public interfaces (Nest providers). Circular dependencies are forbidden.
- PostgreSQL access is through Prisma Client, configured in `packages/shared/prisma/`.
- Any external integrations (SerpApi, LLM, phpmorphy) are encapsulated in adapters with interfaces for mocking.

## Testing
| Level | Tools | Directory |
|---------|---------|-----------|
| Unit    | Vitest/Jest | `*.spec.ts` next to code |
| Integration | Pactum/Supertest (API), Testcontainers (DB/Redis) | `apps/api/test/` |
| E2E     | Playwright/Puppeteer | `tests/e2e/` (TBD) |

## Code Style
- TypeScript strict mode, `tsconfig` points to `configs/` (planned).
- ESLint + Prettier. Common rules stored in `configs/eslint/`.
- Comments only for complex logic.
- File names in kebab-case, classes — PascalCase, functions/variables — camelCase.

## Secret Management
- All secrets read from `process.env`, but in Docker Compose connected via `secrets:` or external storage (Vault/Doppler).
- Database secrets stored encrypted (pgcrypto). Decryption happens in worker/API services as needed.

## Observability and Logging
- Pino configuration in `packages/shared/logger/` and used by all services.
- Required fields: `timestamp`, `level`, `service`, `requestId`, `jobId`, `actorId`.
- Metrics `prom-client` registered in `packages/shared/metrics/` and imported into services.
- OpenTelemetry SDK initialized in `apps/*/src/telemetry.ts`.

## Development Process
1. Create ADR or update existing when changing architectural decisions.
2. Development in feature branches, PR with mandatory review.
3. Automatic migration application on CI before running tests.
4. Documentation updated with code (not later than PR).

## Module Organization Principles

### API Modules
Each bounded context should be a self-contained module with:
- **Controller**: HTTP endpoints, validation, response formatting
- **Service**: Business logic, external integrations
- **DTO**: Request/response schemas
- **Entities**: Database models (if needed)
- **Tests**: Unit and integration tests

### Worker Processors
Each job type has dedicated processor with:
- **BaseProcessor**: Common functionality (logging, progress tracking)
- **Type-specific logic**: Actual job implementation
- **Error handling**: Retry logic and error reporting
- **Resource management**: Connection pooling, cleanup

### Shared Package
Common functionality organized by concern:
- **Domain**: Core business types and enums
- **DTOs**: Shared request/response schemas
- **Clients**: Database and external service clients
- **Utils**: Logging, metrics, encryption utilities

## CI/CD Integration
- Automated builds for all packages
- Migration testing on PR
- Security scanning for dependencies
- Container image building and pushing
- Environment-specific deployments

## Documentation Standards
- ADRs for major decisions
- API documentation auto-generated from OpenAPI
- README files for each major component
- Architecture diagrams kept up-to-date
- Runbooks for operational procedures

Following this guide ensures consistency and maintainability as the team scales.