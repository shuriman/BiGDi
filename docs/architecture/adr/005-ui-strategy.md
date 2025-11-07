# ADR-005: UI Strategy - SSR First with SPA Migration Path

## Status
Accepted

## Context
We need a UI strategy that provides immediate value while allowing future SPA development. The requirements include minimal initial development, API-first approach, and clear migration path.

## Decision
We choose **SSR-first with future SPA migration path** using NestJS server-side rendering.

## Rationale

### Current Requirements
- **Immediate Value**: Need functional UI without extensive frontend development
- **API-First**: All functionality should be accessible via REST API
- **Minimal Investment**: Focus on backend architecture first
- **Future Proof**: Clear path to SPA without breaking existing APIs

### SSR First Advantages
1. **Fast Implementation**: Leverage existing NestJS templates and routing
2. **SEO Friendly**: Server-rendered pages are better for search engines
3. **API Reuse**: Same API endpoints serve both UI and external clients
4. **Simple Deployment**: Single service handles both API and UI
5. **Progressive Enhancement**: Can add client-side interactivity gradually

### Migration Path to SPA
1. **Phase 1**: Basic SSR pages for core functionality
2. **Phase 2**: Add client-side interactivity with HTMX or Alpine.js
3. **Phase 3**: Extract frontend to separate SPA application
4. **Phase 4**: Full SPA with rich client-side features

### Benefits of This Approach
- **No API Changes**: SPA will use the same REST APIs
- **Incremental**: Can migrate page by page if needed
- **Risk Mitigation**: Lower initial investment, validate requirements
- **Performance**: SSR provides good initial page load performance

## Consequences
- Initial UI will be simple but functional
- All functionality will be available via REST API from day one
- Frontend and backend teams can work independently
- Migration to SPA will not require API changes
- Initial pages will be template-based, not component-based

## Implementation Notes
- Use NestJS views with a simple template engine (Handlebars or EJS)
- Create basic pages: Dashboard, Jobs list/view, Settings, Analytics
- Implement real-time updates via Socket.IO for job progress
- Use Tailwind CSS for styling (can be reused in SPA)
- Structure templates for easy extraction to SPA later
- Implement client-side form validation that mirrors server validation

## Pages to Implement
1. **Dashboard**: Overview of system status and recent jobs
2. **Jobs**: List, create, view, and manage jobs
3. **Settings**: API keys, prompts, and configuration
4. **Analytics**: Reports and metrics visualization
5. **Health**: System health and monitoring

## SPA Migration Strategy
When ready to migrate to SPA:
1. Create separate frontend repository (React/Vue/Angular)
2. Use OpenAPI specification to generate API client
3. Implement pages one by one using existing APIs
4. Gradually decommission SSR pages
5. Keep both running side-by-side during transition

## Technology Stack for SSR
- **Templates**: Handlebars or EJS
- **Styling**: Tailwind CSS (via CDN initially)
- **Interactivity**: HTMX or Alpine.js for dynamic behavior
- **Real-time**: Socket.IO for job progress and notifications
- **Forms**: Server-side validation with client-side enhancement