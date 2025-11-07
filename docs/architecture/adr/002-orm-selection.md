# ADR-002: ORM Selection - Prisma vs TypeORM

## Status
Accepted

## Context
We need to choose an ORM for PostgreSQL integration. The main candidates are Prisma and TypeORM. This decision affects database operations, migrations, type safety, and developer experience.

## Decision
We choose **Prisma** as the ORM for the Zemo project.

## Rationale

### Prisma Advantages
1. **Type Safety**: End-to-end type safety from database to application
2. **Auto-completion**: Excellent IDE support with generated types
3. **Migrations**: Declarative schema with version-controlled migrations
4. **Performance**: Optimized query generation and connection pooling
5. **Developer Experience**: Intuitive API and excellent documentation
6. **Database Studio**: Visual database management tool
7. **Relationship Management**: Automatic handling of complex relationships

### TypeORM Considerations
While TypeORM is more mature and flexible, it has drawbacks:
- Less type safety (runtime vs compile-time)
- More verbose syntax
- Manual migration management
- Complex relationship configuration

### Specific to Our Use Case
- **PostgreSQL Integration**: Prisma has excellent PostgreSQL support including JSONB, arrays, and enums
- **Migration Strategy**: Prisma's declarative approach fits our migration plan
- **Shared Package**: Prisma client can be easily shared between API and Worker services

## Consequences
- Database schema will be defined in `schema.prisma`
- Migrations will be generated and version-controlled
- All database operations will be type-safe
- Database changes will require schema regeneration
- The Prisma client will be part of the shared package

## Implementation Notes
- Store schema in `packages/shared/prisma/schema.prisma`
- Use Prisma Migrate for database versioning
- Generate client as part of the build process
- Use Prisma's connection pooling for performance
- Leverage Prisma's raw queries for complex operations when needed

## Alternatives Considered
1. **TypeORM** - Rejected due to less type safety and more complexity
2. **Sequelize** - Rejected due to TypeScript limitations
3. **Plain SQL with query builders** - Rejected due to maintenance overhead