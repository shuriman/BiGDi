# Zemo API Service (проектная заготовка)

Этот каталог предназначен для сервиса `api`, реализованного на NestJS. Здесь будут располагаться исходники REST API, SSR-страниц и realtime шлюза (Socket.IO/SSE).

## Цели сервиса
- Предоставлять REST API, задокументированное OpenAPI (`docs/architecture/openapi.yaml`).
- Отрисовывать базовые SSR-страницы (dashboard, задачи, логи).
- Обрабатывать аутентификацию/авторизацию и RBAC.
- Ставить задачи в очереди BullMQ и стримить прогресс через SSE/Socket.IO.

## Планируемая структура
```
src/
  main.ts
  app.module.ts
  config/
  common/
  identity/
  settings/
  jobs/
  prompts/
  analytics/
  realtime/
  text-processing/
  views/
test/
```

## Инструменты и зависимости
- NestJS + Fastify Adapter
- class-validator / class-transformer
- Prisma Client (через `packages/shared/prisma`)
- Pino логирование
- prom-client для метрик

## Следующие шаги
1. Сгенерировать NestJS приложение (`nest new api --directory=apps/api`).
2. Настроить конфигурацию (config module, env schema).
3. Реализовать доменные модули и интеграцию с BullMQ и PostgreSQL.
