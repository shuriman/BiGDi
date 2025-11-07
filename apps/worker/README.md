# Zemo Worker Service (проектная заготовка)

Сервис `worker` отвечает за обработку фоновых задач BullMQ: запросы SerpApi, запуск Puppeteer, текстовые анализы и генерацию контента через LLM.

## Основные обязанности
- Подписка на очереди `serp`, `scrape`, `analyze`, `generate`, `pipeline`.
- Управление пулом Chromium (Puppeteer) с учётом лимитов.
- Взаимодействие с phpmorphy для лемматизации.
- Вызов LLM провайдеров с учётом rate limits и квот.
- Запись прогресса и логов в PostgreSQL и Redis.

## Планируемая структура
```
src/
  bootstrap.ts
  queues/
  processors/
  services/
  domain/
  adapters/
  telemetry/
```

## Инструменты и зависимости
- Node.js 20 LTS + TypeScript
- BullMQ + ioredis
- Prisma Client (общий пакет)
- Pino логирование + prom-client метрики
- OpenTelemetry SDK

## Следующие шаги
1. Настроить подключение к Redis/PostgreSQL через `packages/shared`.
2. Реализовать очереди и процессоры, описанные в OpenAPI/доках.
3. Добавить робастные ретраи, backoff и идемпотентность.
