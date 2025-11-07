# ADR-004: Logging Strategy - Pino vs Winston

## Status
Accepted

## Context
We need a structured logging solution that supports correlation, multiple log levels, and JSON output for monitoring. The main candidates are Pino and Winston.

## Decision
We choose **Pino** as the logging library for the Zemo project.

## Rationale

### Pino Advantages
1. **Performance**: Extremely fast with minimal overhead
2. **JSON Output**: Native structured logging in JSON format
3. **Correlation**: Easy to add request/job IDs for tracing
3. **Child Loggers**: Automatic context inheritance
4. **Small Bundle**: Minimal impact on application size
5. **Transport Flexibility**: Separate process for pretty printing in development
6. **TypeScript Support**: Excellent TypeScript definitions

### Requirements Alignment
- **Structured Logging**: Essential for log aggregation and analysis
- **Performance**: Low overhead is critical for high-throughput services
- **Correlation**: Request and job ID tracing across services
- **Multiple Levels**: Support for debug, info, warn, error levels
- **Production Ready**: Battle-tested in high-traffic applications

### Winston Considerations
While Winston is more feature-rich, it has drawbacks:
- Higher performance overhead
- More complex configuration
- Larger bundle size
- Slower JSON serialization

## Consequences
- All logs will be structured JSON by default
- Request correlation IDs will be automatically added
- Different log levels for different environments
- Pretty printing in development via pino-pretty
- Log aggregation tools can easily parse the output

## Implementation Notes
- Create logger factory in shared package
- Use child loggers for request/job correlation
- Include service name, environment, and version in all logs
- Add request IDs via middleware in API service
- Add job IDs in worker processors
- Use appropriate log levels (DEBUG for development, INFO+ for production)
- Avoid logging sensitive data (API keys, tokens, PII)

## Log Format
```json
{
  "level": "info",
  "time": "2024-01-01T12:00:00.000Z",
  "pid": 123,
  "hostname": "api-1",
  "service": "api",
  "requestId": "req-123",
  "jobId": "job-456",
  "msg": "Job completed successfully",
  "jobType": "serpapi",
  "duration": 1500
}
```

## Log Levels
- **DEBUG**: Detailed debugging information (development only)
- **INFO**: General information about application flow
- **WARN**: Unexpected behavior that doesn't stop the application
- **ERROR**: Error events that might still allow the application to continue

## Transport Strategy
- **Development**: Use pino-pretty for readable console output
- **Production**: Write to stdout/stderr for container log drivers
- **Monitoring**: Forward to centralized logging system (ELK, Grafana, etc.)