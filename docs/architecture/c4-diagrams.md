# C4-диаграммы

Целевые диаграммы отражают будущую модульную архитектуру Zemo. Формат диаграмм — текстовые описания Mermaid, которые легко обновлять вместе с кодовой базой.

## Контекст (Level 1)
```mermaid
flowchart LR
    subgraph Users
        U[Маркетинг/SEO специалисты]
        A[Администратор]
    end

    subgraph ExternalAPIs[Внешние провайдеры]
        SERP[SerpApi]
        LLM[LLM провайдеры\n(OpenAI, Claude, Gemini)]
    end

    subgraph Platform[Zemo]
        API[Сервис "api"\nHTTP API + SSR]
        Worker[Сервис "worker"\nОчереди и фоновые задачи]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
        Phpmorphy[phpmorphy\nморфологический сервис]
        Observability[(Prometheus/Grafana/ELK)]
    end

    Browser[Headless браузеры\n(Puppeteer)]

    U -->|SSR UI / REST| API
    A -->|Админский UI / REST| API

    API -->|REST / Socket.IO| U
    API --> Redis
    API --> Postgres
    API -->|gRPC/HTTP| Phpmorphy
    API --> Observability

    Worker --> Redis
    Worker --> Postgres
    Worker --> Phpmorphy
    Worker --> Browser
    Worker --> Observability

    Worker -->|Serp задачи| SERP
    Worker -->|LLM запросы| LLM
```

## Контейнеры (Level 2)
```mermaid
flowchart TB
    subgraph API_Service[API Service (NestJS)]
        ControllerLayer[Controllers\nREST + SSR]
        ServiceLayer[Application Services]
        DomainLayer[Доменные модули]
        EventGateway[Socket.IO/SSE Gateway]
    end

    subgraph Worker_Service[Worker Service (Node.js + BullMQ)]
        QueueConsumers[Queue Consumers]
        JobOrchestrator[Job Orchestrator]
        PuppeteerPool[Puppeteer Pool Manager]
        LLMClient[LLM Client Abstraction]
    end

    subgraph DataStores
        Postgres[(PostgreSQL\nPrisma)]
        Redis[(Redis\nBullMQ + Cache)]
    end

    subgraph External
        SerpApi[SerpApi]
        LLMs[LLM Providers]
        Phpmorphy[phpmorphy]
    end

    subgraph Observability
        Pino[Pino JSON Logs]
        Metrics[Prometheus Exporters]
        Traces[OpenTelemetry]
    end

    ControllerLayer --> ServiceLayer
    ServiceLayer --> DomainLayer
    EventGateway --> Redis

    QueueConsumers --> JobOrchestrator --> DomainLayer
    QueueConsumers --> PuppeteerPool
    QueueConsumers --> LLMClient

    DomainLayer --> Postgres
    ServiceLayer --> Redis

    QueueConsumers --> Redis
    QueueConsumers --> Postgres

    PuppeteerPool --> SerpApi
    PuppeteerPool --> LLMs
    LLMClient --> LLMs
    DomainLayer --> Phpmorphy

    ControllerLayer --> Pino
    QueueConsumers --> Pino
    Pino --> Metrics
    Metrics --> Traces
```

## Компоненты API (Level 3)
```mermaid
flowchart LR
    subgraph API
        Gateway[API Gateway Layer\n(HTTP + WebSocket)]
        AuthModule[Identity & Access Module]
        SettingsModule[Settings & Secrets Module]
        JobsModule[Jobs Module]
        PromptsModule[Prompts Module]
        AnalyticsModule[Reports/Analytics Module]
        TextModule[Text Processing Adapter]
    end

    Gateway --> AuthModule
    Gateway --> SettingsModule
    Gateway --> JobsModule
    Gateway --> PromptsModule
    Gateway --> AnalyticsModule

    AuthModule -->|RBAC| SettingsModule
    JobsModule -->|Queue Tasks| Redis[(Redis)]
    JobsModule -->|Persist| Postgres[(PostgreSQL)]
    SettingsModule --> Postgres
    PromptsModule --> Postgres
    AnalyticsModule --> Postgres
    TextModule --> Phpmorphy[phpmorphy]
    JobsModule --> TextModule
```

## Компоненты Worker (Level 3)
```mermaid
flowchart TB
    subgraph Worker
        QueueListener[Queue Listener]
        JobRouter[Job Router]
        SerpProcessor[SerpApi Processor]
        ScraperProcessor[Scraper Processor\n(Puppeteer)]
        AnalyzerProcessor[Text Analyzer]
        GeneratorProcessor[LLM Generation]
        AuditLogger[Audit & Job Logger]
    end

    QueueListener --> JobRouter
    JobRouter --> SerpProcessor
    JobRouter --> ScraperProcessor
    JobRouter --> AnalyzerProcessor
    JobRouter --> GeneratorProcessor

    SerpProcessor --> SerpApi[SerpApi]
    ScraperProcessor --> Chromium[Chromium Pool]
    AnalyzerProcessor --> Phpmorphy[phpmorphy]
    GeneratorProcessor --> LLMs[LLM Providers]

    SerpProcessor --> Postgres[(PostgreSQL)]
    ScraperProcessor --> Postgres
    AnalyzerProcessor --> Postgres
    GeneratorProcessor --> Postgres

    SerpProcessor --> Redis[(Redis)]
    ScraperProcessor --> Redis
    AnalyzerProcessor --> Redis
    GeneratorProcessor --> Redis

    AuditLogger --> Postgres
    AuditLogger --> PinoLogs[Pino Logs]
```

Все диаграммы синхронизированы с остальными документами архитектуры и должны обновляться при изменении проектных решений.
