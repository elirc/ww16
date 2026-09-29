# Architecture Overview

Channel Compass is a production-style partner relationship management scaffold built around explicit boundaries: REST routes in `src/app/api/**/route.ts`, validation in `src/lib/validation/*.ts`, business logic in `src/services/*.ts`, and Prisma data access in `src/repositories/*.ts`. The project models partner onboarding, deal registration approvals, MDF decisions and reimbursements, certification tracking, partner-visible data scoping, and leaderboard reporting with a small async job system.

This codebase intentionally does **not** use full multi-tenancy. Instead, it models a single vendor deployment with partner-owned records. Internal users can see all data, while partner users are scoped to their own `partnerOrgId` through `src/lib/auth/visibility.ts` and the repository methods that call it.

## Folder map

- `prisma/`
  Example: `prisma/schema.prisma` defines the relational model, workflow enums, audit log table, and background job table.
- `src/app/`
  Example: `src/app/api/deals/[dealId]/transition/route.ts` is the HTTP edge for the deal approval workflow, while `src/app/(dashboard)/deals/page.tsx` is the client page that triggers it.
- `src/lib/auth/`
  Example: `src/lib/auth/session.ts` builds the request session, `src/lib/auth/permissions.ts` owns RBAC, and `src/lib/auth/visibility.ts` owns ownership filters.
- `src/lib/http/`
  Example: `src/lib/http/route-handlers.ts` centralizes session loading, permission checks, and error normalization for API routes.
- `src/lib/validation/`
  Example: `src/lib/validation/dealSchemas.ts` validates both create and transition payloads before the service layer runs.
- `src/domain/`
  Example: `src/domain/dealRegistration.ts` is the pure state-machine layer for allowed deal transitions.
- `src/repositories/`
  Example: `src/repositories/dealRepository.ts` scopes queries and writes deal rows plus approval history, but does not decide whether the transition is allowed.
- `src/services/`
  Example: `src/services/dealRegistrationService.ts` owns transaction boundaries, workflow side effects, audit logging, and job enqueueing.
- `src/hooks/`
  Example: `src/hooks/useDeals.ts` calls `/api/deals` and `/api/deals/[dealId]/transition` so the UI stays thin.
- `src/components/`
  Example: `src/components/deals/DealBoard.tsx` renders state-driven action buttons without embedding workflow rules that belong in the backend.
- `tests/`
  Example: `tests/auth/createAuthedRoute.test.ts` protects the auth boundary, while `tests/services/dealRegistrationDomain.test.ts` protects workflow integrity.
- `docs/`
  Example: `docs/architecture/request-lifecycle.md` and `docs/learning/flow-traces.md` trace concrete requests through the real files above.

## Why Prisma and REST here

- Prisma fits the project because `prisma/schema.prisma` needs to express many relations, enums, and transactional CRUD workflows cleanly.
- REST fits the project because partner ecosystems usually integrate with external systems, and routes like `src/app/api/mdf-requests/[requestId]/reimburse/route.ts` are easy to reason about at the HTTP boundary.

## Key runtime boundaries

- Auth/session boundary: `src/lib/auth/session.ts` resolves the acting user before a request reaches a route handler body.
- Validation boundary: `src/lib/validation/*.ts` parses request input before services run.
- Permission boundary: `src/lib/auth/permissions.ts` and `src/domain/*.ts` enforce role and workflow rules.
- Data boundary: `src/repositories/*.ts` issue Prisma queries and call `buildPartnerVisibilityFilter()` or `buildOwnedRecordVisibilityFilter()` when data is partner-owned.
- Async boundary: `src/repositories/backgroundJobRepository.ts` persists jobs, and `src/services/backgroundJobService.ts` processes them separately from the request that created them.
