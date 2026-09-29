# Concepts Demonstrated

## Service layer
Where to look: `src/services/dealRegistrationService.ts` — `transitionDeal()` owns the transaction, workflow rule call, audit log write, and background job enqueue.
Also see: `src/services/mdfService.ts` for the same pattern applied to finance workflows.
Risk if wrong: Business logic leaks into routes or repositories, making it hard to review security and side effects.

## Repository pattern
Where to look: `src/repositories/dealRepository.ts` — `findVisibleById()` and `updateStatus()` contain Prisma-specific query logic but do not decide whether a transition is valid.
Also see: `src/repositories/reportingRepository.ts` for reporting-oriented query composition.
Risk if wrong: Query shapes and scoping rules get duplicated across services and eventually diverge.

## Zod validation boundary
Where to look: `src/lib/validation/dealSchemas.ts` — `dealTransitionSchema` validates the route payload before the service layer sees it.
Also see: `src/app/api/deals/[dealId]/transition/route.ts` for the exact `parse()` call site.
Risk if wrong: Invalid shapes reach the service layer and produce inconsistent errors or corrupt state.

## Auth/session flow
Where to look: `src/lib/auth/session.ts` — `getRequestSession()` turns a request into a canonical `RequestSession`.
Also see: `src/lib/http/route-handlers.ts` for the wrapper that makes all routes use this flow.
Risk if wrong: Routes trust unverified request data or different endpoints build sessions differently.

## Role-based access control
Where to look: `src/lib/auth/permissions.ts` — `rolePermissionMatrix`, `hasPermission()`, and `assertPermission()` define the RBAC contract.
Also see: `src/app/api/jobs/process/route.ts` for a route that relies on `jobs:process`.
Risk if wrong: A role change quietly expands or shrinks access across the entire app.

## Ownership-scoped data access
Where to look: `src/lib/auth/visibility.ts` — `buildOwnedRecordVisibilityFilter()` and `assertPartnerOwnership()` enforce partner-specific boundaries.
Also see: `src/repositories/mdfRepository.ts` and `src/repositories/dealRepository.ts`, where those filters are applied to Prisma queries.
Risk if wrong: Partner users can view or create records for another partner account.

## Status and state transitions
Where to look: `src/domain/dealRegistration.ts` — `assertDealTransitionAllowed()` is the deal state machine.
Also see: `src/domain/mdfRequest.ts` for the MDF version.
Risk if wrong: Workflows become bypassable and approval history loses meaning.

## Audit logging
Where to look: `src/lib/audit/auditLogger.ts` — `recordAuditEvent()` writes structured audit rows during service transactions.
Also see: `src/services/partnerService.ts`, `src/services/dealRegistrationService.ts`, and `src/services/mdfService.ts` for concrete audit call sites.
Risk if wrong: Security reviews and incident response lose the ability to reconstruct what happened.

## Background job design
Where to look: `src/services/backgroundJobService.ts` — `processDueJobs()` owns job lifecycle transitions and dispatch.
Also see: `src/repositories/backgroundJobRepository.ts` for the persisted job state and `src/app/api/jobs/process/route.ts` for the operator entry point.
Risk if wrong: Async work is duplicated, lost, or impossible to debug.

## Reporting snapshot pattern
Where to look: `src/services/reportingService.ts` — `getLeaderboard()` reads snapshots first and falls back to live computation, while `refreshLeaderboardSnapshot()` persists derived rows.
Also see: `src/repositories/reportingRepository.ts` for the quarter-bounded metric input query.
Risk if wrong: Reports become either too expensive to run live or too stale to trust.

## Transaction boundary discipline
Where to look: `src/services/dealRegistrationService.ts` — the `db.$transaction()` block in `transitionDeal()` wraps the status update, approval insert, audit log write, and job enqueue.
Also see: `src/services/mdfService.ts` for the reimbursement transaction.
Risk if wrong: Partial writes leave the system in impossible states that are hard to repair manually.

## Future tenantization
Where to look: `docs/architecture/auth-and-permissions.md` — the “Multi-tenancy decision” section explains how `tenantId` would need to flow through `prisma/schema.prisma`, `src/types/auth.ts`, `src/lib/auth/session.ts`, and `src/lib/auth/visibility.ts`.
Also see: `src/repositories/*.ts`, which would all need tenant-aware `where` clauses.
Risk if wrong: A later multi-tenant retrofit would look complete at the auth layer but still leak data in repository queries.
