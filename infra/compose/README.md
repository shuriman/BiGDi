# Docker Compose окружение

Черновая конфигурация Docker Compose для модульной архитектуры Zemo.

## Сервисы
- **api** — NestJS HTTP API + SSR. Требует Dockerfile в `apps/api/Dockerfile`.
- **worker** — BullMQ воркер. Требует Dockerfile в `apps/worker/Dockerfile`.
- **postgres** — основная база данных с расширениями `uuid-ossp`, `pgcrypto`, `pgvector`.
- **redis** — брокер очередей и кеш.
- **phpmorphy** — морфологический сервис (используется существующий образ).
- **otel-collector** — приёмник OTLP-трасс и метрик.
- **prometheus** — сбор метрик (конфигурация `prometheus.yml`).

## Быстрый старт
1. Скопируйте `.env.api.example` → `.env.api` и `.env.worker.example` → `.env.worker`, заполните секреты.
2. Подготовьте Dockerfile'ы для `api` и `worker` (см. ADR и репо-гайд).
3. При необходимости обновите `otel-collector-config.yaml` и `prometheus.yml`.
4. Запустите окружение:
   ```bash
   docker compose --project-directory infra/compose -f infra/compose/docker-compose.yml up -d
   ```

## Мониторинг и логи
- API и worker экспонируют `/metrics` для Prometheus.
- Логи собираются через stdout (JSON). Рекомендуется настроить Loki/ELK (не входит в текущий compose).

## Secrets
- Используйте Docker secrets (`docker secret create ...`) и подключайте их через `x-secrets` (будет добавлено позже).
- Для локальной разработки допускается загрузка секретов из `.env.*`, но не коммитить реальные значения.

## Структура каталога
```
docker-compose.yml
.env.api.example
.env.worker.example
init-sql/          # SQL-скрипты для БД
otel-collector-config.yaml (TBD)
prometheus.yml (TBD)
```
