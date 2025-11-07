# packages/shared

Общий пакет для сервисов `api` и `worker`. Предназначен для хранения повторно используемых модулей, типов и клиентов.

## Содержимое (план)
- `src/dto/` — DTO и схемы валидации (zod/class-validator).
- `src/domain/` — перечисления (JobType, JobStatus, Roles), базовые value objects.
- `src/clients/` — фабрики клиентов (Prisma, Redis, BullMQ, HTTP клиенты внешних провайдеров).
- `src/logger/` — конфигурация Pino, middleware для Nest/worker.
- `src/metrics/` — экспорт prom-client registry и pre-defined метрики.
- `src/crypto/` — обёртки над pgcrypto/Node crypto для шифрования секретов.
- `src/api-client/` — сгенерированный REST клиент по OpenAPI (TBD).

## Рабочее пространство
Пакет будет управляться через npm workspaces/pnpm:
```json
{
  "name": "@zemo/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

Сборка предполагает использование TypeScript `tsc` или `tsup`. Тесты — Vitest.
