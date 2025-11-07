# Migration and Rollback Plan

This document describes the sequential transition from the existing Zemo monolith to the modular architecture.

## Migration Phases

### Phase 0 - Preparation
- [x] Approve ADR and architectural artifacts.
- [x] Create repository and directory structure (current step).
- [ ] Set up common practices (CI, linters, formatters, pre-commit).
- [ ] Configure development environment and tooling.

### Phase 1 - Infrastructure Foundation
1. Deploy updated `docker-compose` (PostgreSQL, Redis, phpmorphy) on staging.
2. Set up PostgreSQL backups + monitoring (Prometheus/Grafana).
3. Enable `pgcrypto`, `pgvector`, `uuid-ossp` extensions.
4. Prepare `.env` template and secrets (Docker secrets/Vault).
5. Set up OpenTelemetry collector and monitoring dashboards.

### Phase 2 - Data and Migrations
1. Convert existing SQLite schemas to Prisma schema.
2. Generate and apply initial migrations to new database.
3. Implement ETL pipeline for historical data migration (SQLite → PostgreSQL) — separate temporary worker.
4. Introduce dual-write mode in monolith and validate data integrity.
5. Set up data validation and comparison scripts.

### Phase 3 - API Service
1. Implement NestJS API (`apps/api`):
   - Identity, settings, prompts, jobs, analytics modules.
   - SSR templates (minimal pages: dashboard, job list, log viewing).
   - Swagger/OpenAPI generation.
   - Pino logging + requestId correlation.
2. Connect Redis for job queuing, implement rate limiting.
3. Set up Socket.IO/SSE gateway for job log streaming.
4. Introduce feature flag to switch clients from monolith to new API.
5. Implement health checks and metrics endpoints.

### Phase 4 - Worker Service
1. Implement BullMQ workers (`apps/worker`): consumers for `serp`, `scrape`, `analyze`, `generate`, `pipeline`.
2. Set up Puppeteer pool, concurrency limits, and backoff strategies.
3. Encapsulate SerpApi and LLM integrations in adapters (with retry, rate limiting).
4. Connect pgcrypto for API key decryption, implement job progress logging.
5. Set up worker monitoring and alerting.

### Phase 5 - Traffic Migration
1. Conduct end-to-end tests on staging, measure latency, verify SLO compliance.
2. Enable shadow traffic mode in production (duplicate requests) for API and workers.
3. After successful monitoring, switch main traffic to new services.
4. Keep monolith in read-only mode for 1-2 weeks, collecting metrics and logs.
5. Decommission monolith, update documentation and runbooks.
6. Conduct post-migration review and optimization.

## Risks and Mitigations

| Risk | Impact | Mitigation Actions |
|------|---------|-------------------|
| Data schema mismatch | Data loss | Automated migration tests, checksum verification, manual validation of key tables. |
| External API limitations | Task delays | Built-in backoff, caching, fallback queues. |
| Puppeteer load | Worker crashes | Session limits, automatic restart, resource monitoring. |
| Secrets exposure | Data compromise | Use Docker secrets/Vault, access rights audit. |
| Observability gaps | Incident investigation difficulties | Standardized logs, mandatory traceId/jobId, prepared dashboards. |
| Database migration failure | Service outage | Pre-migration backups, rollback procedures, migration dry-runs. |
| Queue processing bottlenecks | Performance degradation | Horizontal scaling, queue monitoring, priority management. |

## Rollback Plan

### 1. API Service
- Switch ingress/DNS back to monolith.
- Disable job queuing in new queues (pause BullMQ).
- Save Redis snapshot for recovery.
- Preserve new API logs for analysis.

### 2. Worker Service
- Complete current tasks, export logs.
- Activate old background processes in monolith (if preserved).
- Stop new worker instances.

### 3. Database
- Restore last stable PostgreSQL backup.
- If necessary, fallback to SQLite (only after manual loss assessment).
- Validate data integrity after rollback.

### 4. Communication
- Notify stakeholders, document incident and rollback steps in runbook.
- Conduct post-mortem analysis.

### 5. Monitoring
- Ensure all monitoring and alerting is restored.
- Verify service health after rollback.

## Control Points
- [x] Approved ADR and architectural documents.
- [ ] Initial migration package applied to PostgreSQL.
- [ ] API implemented with OpenAPI coverage.
- [ ] Queues and worker processes configured with monitoring.
- [ ] Availability (>=99.5%) confirmed during shadow traffic phase.
- [ ] Performance benchmarks met or exceeded.
- [ ] Security audit completed.
- [ ] Documentation and runbooks updated.

## Timeline Estimates
- **Phase 0**: 1 week
- **Phase 1**: 2 weeks
- **Phase 2**: 3 weeks
- **Phase 3**: 4 weeks
- **Phase 4**: 3 weeks
- **Phase 5**: 2 weeks
- **Total**: ~15 weeks (3.5 months)

## Success Criteria
1. **Functional**: All existing features work in new architecture
2. **Performance**: Response times <= 110% of monolith
3. **Reliability**: 99.5% uptime during migration period
4. **Data Integrity**: Zero data loss during migration
5. **Observability**: Full visibility into system health and performance

This plan will be updated based on development results and pilot launches.