# ADR-003: Queue System - BullMQ vs Alternatives

## Status
Accepted

## Context
We need a queue system for background job processing. The requirements include Redis backend, job prioritization, retries, and monitoring. Candidates include BullMQ, Agenda, and custom solutions.

## Decision
We choose **BullMQ** as the queue system for the Zemo project.

## Rationale

### BullMQ Advantages
1. **Redis Backend**: Uses Redis which we already need for caching
2. **Feature Rich**: Built-in retries, backoff strategies, job priorities
3. **Monitoring**: Excellent dashboard and monitoring capabilities
4. **TypeScript Support**: Native TypeScript support with proper types
5. **Scalability**: Horizontal scaling with multiple workers
6. **NestJS Integration**: Excellent NestJS integration via @nestjs/bull
7. **Job Types**: Supports different job types and processors
8. **Persistence**: Reliable job persistence with Redis

### Requirements Alignment
- **Concurrency Control**: Built-in rate limiting and concurrency management
- **Job Dependencies**: Support for job workflows and pipelines
- **Monitoring**: Real-time job status and metrics
- **Reliability**: At-least-once delivery with acknowledgments

### Alternatives Considered
- **Agenda**: MongoDB-based, doesn't fit our Redis strategy
- **Bull (Legacy)**: BullMQ is the modern successor with better features
- **Custom Solution**: Too much development overhead

## Consequences
- All background jobs will be processed through BullMQ
- Redis becomes critical infrastructure
- Worker services will use BullMQ processors
- Job status will be tracked in both Redis and PostgreSQL
- Monitoring will leverage BullMQ's built-in metrics

## Implementation Notes
- Use separate queues for different job types (serp, scrape, analyze, generate)
- Implement proper error handling and retry strategies
- Use job priorities for critical tasks
- Monitor queue sizes and processing times
- Store job results in PostgreSQL for persistence
- Use job metadata for correlation and tracing

## Job Types
- `serpapi`: SerpApi search jobs
- `scrape`: Web scraping jobs with Puppeteer
- `analyze`: Text analysis jobs
- `generate`: LLM content generation jobs
- `pipeline`: Multi-step workflow jobs

## Scaling Strategy
- Multiple worker instances can process the same queues
- Use Redis clustering for high availability
- Implement circuit breakers for external dependencies
- Monitor queue depths and auto-scale workers if needed