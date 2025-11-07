# Гайд по репозиторию

Документ описывает целевую структуру и правила организации кода для модульной архитектуры Zemo.

## Общий обзор каталогов
```
apps/
  api/          # HTTP API + SSR (NestJS)
  worker/       # BullMQ consumers и фоновые задачи
packages/
  shared/       # Общие типы, DTO, клиенты провайдеров
infra/
  compose/      # docker-compose.yml, env-шаблоны, скрипты бэкапов
  migrations/   # SQL/Prisma миграции и вспомогательные скрипты
docs/
  architecture/ # ADR, диаграммы, спецификации
```

### apps/api
- `src/main.ts` — точка входа NestJS, конфигурация Fastify/Express адаптера.
- `src/app.module.ts` — корневой модуль.
- Каталоги по bounded context: `identity/`, `settings/`, `jobs/`, `prompts/`, `analytics/`, `text-processing/`.
- Внутри каждого модуля: `controllers/`, `services/`, `dtos/`, `entities/`, `infrastructure/`.
- SSR: `views/` (ejs/nunjucks) + адаптер рендеринга. SSR страницы не обращаются напрямую к базе, только к REST слоям.
- WebSocket/SSE: модуль `realtime/` с Gateway, интеграцией с Redis Stream.

### apps/worker
- `src/bootstrap.ts` — регистрация BullMQ очередь.
- `src/queues/<queue-name>/` — конфигурация очереди.
- `src/processors/<job-type>.processor.ts` — обработчики задач.
- `src/services/` — адаптеры SerpApi, LLM, Puppeteer, логгер.
- `src/domain/` — общее ядро бизнес-логики (дублирование недопустимо, общие типы → `packages/shared`).
- Обеспечить идемпотентность задач, хранить progress в Redis/Postgres.

### packages/shared
- `src/dto/` — DTO и схемы валидации (zod/class-transformer). Используются API и worker.
- `src/domain/` — доменные типы (JobType, JobStatus, RBAC роли).
- `src/clients/` — общие клиенты (Redis, PostgreSQL, SerpApi SDK) с интерфейсами.
- `src/utils/` — утилиты (логирование, correlation id, error helpers).
- Пакет публикуется внутри монорепозитория (npm workspace).

### infra/compose
- `docker-compose.yml` — описание сервисов с healthcheck, volumes, ресурсными лимитами.
- `env/` (в будущем) — шаблоны переменных окружения (`.env.example`).
- Сценарии бэкапа: `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` (TBD).

### infra/migrations
- Если используется Prisma — основной каталог миграций будет в `apps/api/prisma/` и `apps/worker/prisma/`. Папка `infra/migrations` предназначена для общих SQL-скриптов (enable extensions, hotfixes).

## Правила зависимостей
- `apps/api` и `apps/worker` могут использовать `packages/shared`, но не зависеть друг от друга напрямую.
- Внутри одного приложения модули взаимодействуют через публичные интерфейсы (Nest providers). Запрещены циклические зависимости.
- Доступ к PostgreSQL осуществляется через Prisma Client, сконфигурированный в `packages/shared/prisma/`.
- Любые внешние интеграции (SerpApi, LLM, phpmorphy) инкапсулируются в адаптеры с интерфейсами для мокирования.

## Тестирование
| Уровень | Инструменты | Каталог |
|---------|-------------|---------|
| Unit    | Vitest/Jest | `*.spec.ts` рядом с кодом |
| Integration | Pactum/Supertest (API), Testcontainers (DB/Redis) | `apps/api/test/` |
| E2E     | Playwright/Puppeteer | `tests/e2e/` (TBD) |

## Кодстайл
- TypeScript strict mode, `tsconfig` блуждает в `configs/` (запланировано).
- ESLint + Prettier. Общие правила хранить в `configs/eslint/`.
- Комментарии только для сложной логики.
- Названия файлов в kebab-case, классов — PascalCase, функций/переменных — camelCase.

## Управление секретами
- Все секреты читаются из `process.env`, но в Docker Compose подключаются через `secrets:` или внешнее хранилище (Vault/Doppler).
- В БД секреты хранятся зашифрованными (pgcrypto). Расшифровка происходит в сервисах worker/API по мере необходимости.

## Наблюдаемость и логирование
- Pino конфигурация лежит в `packages/shared/logger/` (TBD) и используется всеми сервисами.
- Обязательные поля: `timestamp`, `level`, `service`, `requestId`, `jobId`, `actorId`.
- Метрики `prom-client` регистрируются в `packages/shared/metrics/` и импортируются в сервисы.
- OpenTelemetry SDK инициализируется в `apps/*/src/telemetry.ts`.

## Процесс разработки
1. Создание ADR или обновление существующих при изменении архитектурных решений.
2. Разработка в feature-ветках, PR с обязательным ревью.
3. Автоматическое применение миграций на CI перед запуском тестов.
4. Документация обновляется вместе с кодом (не позже PR).

Следование данному гайду обеспечит консистентность и поддерживаемость кода при масштабировании команды.
