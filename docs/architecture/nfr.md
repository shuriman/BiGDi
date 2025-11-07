# Нефункциональные требования (NFR) и целевые SLO

## Производительность
| Требование | Метрическая формула | Цель / Граница | Комментарии |
|------------|---------------------|----------------|-------------|
| Обработка UI-сессий | `p95_latency(api_http_request_duration_seconds{route=~"/ui/.*"})` | ≤ 400 мс | Включает SSR рендеринг и основные REST вызовы. |
| Создание задач | `p95_latency(api_http_request_duration_seconds{route="POST /api/jobs"})` | ≤ 600 мс | Очередь — асинхронная, важно быстро возвращать `jobId`. |
| Потребление задач воркерами | `p95(job_execution_duration_seconds{status="success"})` | ≤ 120 c | Ограничение конкуренции на уровне BullMQ. |
| Puppeteer конкурентность | `max(chromium_sessions{pod=~"worker.*"})` | ≤ 6 одновременных сессий на инстанс | Контролируется пулом браузеров. |
| Внешние API | `rate(serpapi_requests_total[5m])` | ≤ 60 req/мин (по ключу) | Соблюдаем лимиты SerpApi; аналогично для LLM (по токенам). |

## Доступность
- **SLO**: 99.5% доступности HTTP API (параметр `availability = 1 - (5xx + timeouts) / total_requests`).
- **Error Budget**: 0.5% (~3.6 часов недоступности в месяц).
- Здоровье сервисов обеспечивается через `GET /health` (api) и `bullmq/health` (worker).
- Graceful shutdown: таймаут 30 секунд на завершение in-flight запросов/задач.

## Масштабируемость
- Горизонтальное масштабирование `worker` путём добавления реплик в Compose (`deploy.replicas`).
- Redis настроен на отдельный volume и снапшоты, чтобы выдерживать рост очередей.
- API масштабируется через увеличение процессов Node.js (PM2/cluster) или replicas.

## Наблюдаемость
| Артефакт | Метрика/Формат | Инструмент |
|----------|----------------|------------|
| Структурные логи | JSON с полями `timestamp, level, service, requestId, jobId` | Pino + Loki/ELK |
| Трейсы | OpenTelemetry (HTTP, BullMQ, внешние вызовы) | OTLP → Tempo/Jaeger |
| Метрики | Prometheus (histogram, counter, gauge) | prom-client + Grafana |
| Алёрты | Alertmanager | - `job_queue_stuck` (время в очереди > 5 мин) <br> - `worker_failures_rate` > 5% за 10 мин <br> - `api_error_rate` > 2% за 5 мин <br> - `pg_connections_usage` > 80% |

## Безопасность
- Авторизация по JWT (access/refresh) + RBAC на уровне ролей (admin, analyst, viewer).
- Валидация входных данных: `class-validator` (Nest) или `zod` (shared) с централизованным обработчиком ошибок.
- Rate limiting: `100` запросов/минуту на пользователя, `20` POST `/api/jobs` в минуту.
- Секреты: Docker secrets или внешнее хранилище (Vault/Doppler). В БД — шифрование `pgp_sym_encrypt`. Логи не содержат чувствительных данных.
- Audit trail: события CRUD в таблице `audit_events` (заполнение через доменные события). Колонки: `id, actor_id, action, entity, entity_id, metadata, created_at`.

## Данные и хранение
- Бэкапы PostgreSQL: ежедневный `pg_dump` + point-in-time (WAL-G). Retention: 30 дней, холодное хранение > 90 дней.
- Ротация тяжёлых данных: `SERPAPI_RESULTS.raw_json` и `JOB_LOGS` архивируются в S3-совместимое хранилище (через воркеры) каждые 30 дней; в БД хранится trimmed версия.
- Индексы: `jobs(type, status, queued_at)`, `job_logs(job_id, created_at)`, `pages(url)`, `embeddings(text_hash)`, `generated_text(owner_id, created_at)`.
- pgvector: `CREATE INDEX embeddings_vector_idx ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);`.

## Эксплуатация
- Runbook (черновик):
  1. **Ротация API ключей** — обновить запись в `/api/settings`, зафиксировать в audit trail.
  2. **Рестарт worker** — `docker compose restart worker`, убедиться в отсутствии "in-progress" задач (`bull queues`).
  3. **Холодный бэкап БД** — остановить запись (`maintenance mode`), выполнить `pg_basebackup`, запустить сервисы.
- Инцидент-репорт: в течение 24 часов после сбоя зафиксировать причину, время восстановления, объём затронутых пользователей.

## Гарантии качества
- Обязательные проверки в CI: `lint`, `test`, `typecheck`, `prisma migrate diff`, `docker compose config`.
- E2E тесты: smoke-сценарии создания и чтения задач, проверка SSE, QA по воркерам.
- Observability as Code: дашборды и алёрты хранятся в репозитории (`infra/observability/` — TBD).
