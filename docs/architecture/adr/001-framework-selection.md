# ADR-001: Framework Selection - NestJS vs Express

## Status
Accepted

## Context
We need to choose a web framework for the Zemo API service. The main candidates are NestJS and Express.js. The choice will impact development speed, maintainability, and ecosystem integration.

## Decision
We choose **NestJS** as the primary framework for the Zemo API service.

## Rationale

### NestJS Advantages
1. **TypeScript First**: Built-in TypeScript support with decorators and dependency injection
2. **Modular Architecture**: Natural fit for our modular requirements
3. **Built-in Features**: Validation, serialization, guards, interceptors out of the box
4. **Ecosystem**: Excellent integration with BullMQ, Swagger, and other enterprise tools
5. **Testing**: Comprehensive testing utilities and patterns
6. **Documentation**: Auto-generated OpenAPI/Swagger documentation
7. **Scalability**: Designed for large, enterprise applications

### Express Considerations
While Express.js is simpler and more lightweight, it would require additional setup for:
- Validation and serialization
- Dependency injection
- Module organization
- API documentation generation
- Testing utilities

### Mitigation of NestJS Concerns
- **Learning Curve**: The team will invest time in learning NestJS patterns
- **Overhead**: We'll use only the features we need to avoid unnecessary complexity
- **Performance**: NestJS's performance is comparable to Express for our use case

## Consequences
- Development will follow NestJS patterns (modules, controllers, services)
- API documentation will be auto-generated from decorators
- Validation will use class-validator/class-transformer
- Testing will follow NestJS testing patterns
- The codebase will be more structured and maintainable

## Alternatives Considered
1. **Express.js with additional libraries** - Rejected due to more boilerplate
2. **Fastify directly** - Rejected due to less ecosystem support
3. **Koa.js** - Rejected due to smaller ecosystem

## Implementation Notes
- Use Fastify adapter for better performance
- Enable Swagger documentation in development
- Use class-validator for request validation
- Follow NestJS module structure for organization