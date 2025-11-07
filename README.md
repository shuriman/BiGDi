# Zemo Modular Architecture

This repository contains the architectural artifacts for transitioning Zemo from a Node.js/SQLite monolith to a modular system with separate HTTP API, background task processing, PostgreSQL, and Redis. The documents describe the target architecture, technology choices, and migration plans.

## Architecture Goals
- Separate web/API layer from heavy background task processing
- Transition to PostgreSQL with managed data migrations
- Introduce API-first approach for future UI development
- Improve observability, security, and system manageability

## Target Services
- **api** — HTTP API, basic SSR pages, Socket.IO/SSE, job queuing
- **worker** — BullMQ consumers, Puppeteer execution, LLM calls, text processing
- **postgres** — Primary database (Prisma migrations, pgcrypto for encryption)
- **redis** — Job broker, cache, and coordination layer for realtime
- **phpmorphy** — Morphology analysis container (reuse existing)

## Repository Structure
```
.
├── apps/
│   ├── api/          # HTTP API + SSR (NestJS)
│   └── worker/       # BullMQ consumers and background tasks
├── packages/
│   └── shared/       # Common types, DTOs, provider clients
├── infra/
│   ├── compose/       # docker-compose.yml, env templates, backup scripts
│   └── migrations/   # SQL/Prisma migrations and helper scripts
├── docs/
│   └── architecture/ # ADRs, diagrams, specifications
├── scripts/          # Development and utility scripts
└── README.md
```

## Key Documents
- [ADR Decisions](docs/architecture/adr/) — Framework, ORM, queues, logging, UI strategy, and secret management choices
- [C4 Diagrams](docs/architecture/c4-diagrams.md) — Context, container, and component levels
- [ER Diagram and Migration Strategy](docs/architecture/er-diagram.md)
- [OpenAPI Specification](docs/architecture/openapi.yaml) for key REST routes
- [NFR and SLO](docs/architecture/nfr.md) — Performance and observability standards
- [Migration and Rollback Plan](docs/architecture/migration-plan.md)
- [Repository Guide](docs/architecture/repo-guide.md) — Directories, layers, and dependency rules

## Technology Stack
- **Runtime**: Node.js 20+ with TypeScript
- **API Framework**: NestJS with Fastify adapter
- **Database**: PostgreSQL with Prisma ORM
- **Queues**: BullMQ with Redis
- **Background Processing**: Puppeteer, OpenAI/Claude/Gemini LLMs
- **Monitoring**: Pino logging, Prometheus metrics, OpenTelemetry
- **Containerization**: Docker Compose for single-host deployment

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL client tools (optional)

### Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd zemo-modular
./scripts/setup-dev.sh

# Configure environment
cp infra/compose/.env.api.example infra/compose/.env.api
cp infra/compose/.env.worker.example infra/compose/.env.worker
# Edit the .env files with your API keys and settings

# Start infrastructure
npm run docker:up

# Start services
npm run dev:api      # Terminal 1
npm run dev:worker    # Terminal 2
```

### Production Deployment
```bash
# Build and deploy
npm run build
npm run docker:build
docker-compose -f infra/compose/docker-compose.yml up -d

# Apply migrations
npm run migrate:deploy
```

## Development Commands
```bash
npm run build         # Build all packages
npm run dev:api      # Start API service in development mode
npm run dev:worker    # Start Worker service in development mode
npm run test          # Run all tests
npm run lint          # Lint all packages
npm run docker:up     # Start infrastructure services
npm run docker:down   # Stop infrastructure services
npm run docker:logs   # View infrastructure logs
npm run migrate        # Apply database migrations
```

## API Documentation
- **Development**: http://localhost:3000/docs (Swagger UI)
- **OpenAPI Spec**: [docs/architecture/openapi.yaml](docs/architecture/openapi.yaml)

## Monitoring
- **Health Checks**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics (Prometheus format)
- **Grafana**: http://localhost:3001 (after docker:up)
- **Prometheus**: http://localhost:9090 (after docker:up)

## Architecture Decisions
Key architectural decisions are documented as ADRs:
1. [Framework Selection - NestJS vs Express](docs/architecture/adr/001-framework-selection.md)
2. [ORM Selection - Prisma vs TypeORM](docs/architecture/adr/002-orm-selection.md)
3. [Queue System - BullMQ vs Alternatives](docs/architecture/adr/003-queue-system.md)
4. [Logging Strategy - Pino vs Winston](docs/architecture/adr/004-logging-strategy.md)
5. [UI Strategy - SSR First with SPA Migration Path](docs/architecture/adr/005-ui-strategy.md)
6. [Secret Management - Encryption Strategy](docs/architecture/adr/006-secret-management.md)

## Migration Plan
The transition from monolith to modular architecture is planned in phases:
1. **Phase 0**: Preparation ✅
2. **Phase 1**: Infrastructure Foundation
3. **Phase 2**: Data and Migrations
4. **Phase 3**: API Service
5. **Phase 4**: Worker Service
6. **Phase 5**: Traffic Migration

See [Migration Plan](docs/architecture/migration-plan.md) for detailed timeline and rollback procedures.

## Contributing
1. Create feature branches from `main`
2. Follow the [Repository Guide](docs/architecture/repo-guide.md) for code organization
3. Create ADRs for major architectural changes
4. Submit PRs with tests and documentation updates
5. Ensure all CI checks pass

## Support
- **Documentation**: [docs/architecture/](docs/architecture/)
- **Issues**: Use project issue tracker
- **Architecture Questions**: Create ADRs or update existing ones

Documents will be updated as architecture is detailed and implementation begins.
