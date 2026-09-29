# Load-Bearing Files

## `src/lib/http/route-handlers.ts`
- What it does: Centralizes session loading, optional permission checks, and error-to-response mapping in `createAuthedRoute()`.
- What calls it: All API route files in `src/app/api/**/route.ts`.
- What it calls: `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`, and `src/lib/errors.ts`.
- What would break or become insecure if this file were wrong: Routes could drift into inconsistent auth behavior or leak raw exceptions instead of controlled error shapes.
- What a junior engineer would likely miswrite here: Wrapping some routes but not others, which creates accidental unauthenticated edges.

## `src/lib/auth/permissions.ts`
- What it does: Owns the RBAC matrix and the `assertPermission()` helper.
- What calls it: `src/lib/http/route-handlers.ts`, `src/services/*.ts`, and `src/domain/*.ts`.
- What it calls: `src/lib/errors.ts`.
- What would break or become insecure if this file were wrong: Roles would gain or lose capabilities silently across the whole product.
- What a junior engineer would likely miswrite here: Using roles as permissions directly instead of introducing a separate permission layer.

## `src/lib/auth/visibility.ts`
- What it does: Converts a session into partner-scoped query filters and partner ownership guards.
- What calls it: `src/repositories/partnerRepository.ts`, `src/repositories/dealRepository.ts`, `src/repositories/mdfRepository.ts`, `src/services/dealRegistrationService.ts`, and `src/services/mdfService.ts`.
- What it calls: `src/lib/auth/permissions.ts` and `src/lib/errors.ts`.
- What would break or become insecure if this file were wrong: Partner users could read or create records for another partner organization.
- What a junior engineer would likely miswrite here: Returning an empty filter for malformed partner sessions and turning a bad session into full-table access.

## `src/domain/dealRegistration.ts`
- What it does: Defines allowed deal status transitions in `allowedTransitions` and enforces them in `assertDealTransitionAllowed()`.
- What calls it: `src/services/dealRegistrationService.ts`.
- What it calls: `src/lib/auth/permissions.ts` and `src/lib/errors.ts`.
- What would break or become insecure if this file were wrong: Deals could bypass sales/channel approval or be closed from invalid states.
- What a junior engineer would likely miswrite here: Checking only the destination state without considering the current one.

## `src/services/dealRegistrationService.ts`
- What it does: Owns deal creation, transition logic, transactions, approval history, audit logging, and leaderboard refresh enqueueing.
- What calls it: `src/app/api/deals/route.ts` and `src/app/api/deals/[dealId]/transition/route.ts`.
- What it calls: `src/domain/dealRegistration.ts`, `src/repositories/dealRepository.ts`, `src/repositories/partnerRepository.ts`, `src/repositories/backgroundJobRepository.ts`, and `src/lib/audit/auditLogger.ts`.
- What would break or become insecure if this file were wrong: Deal workflow history would become inconsistent, approvals could skip required stages, and downstream reporting jobs would miss key changes.
- What a junior engineer would likely miswrite here: Performing the status update and the approval-history insert in separate non-transactional steps.

## `src/services/mdfService.ts`
- What it does: Owns MDF submission, finance decisioning, reimbursement, audit logging, and leaderboard side effects.
- What calls it: `src/app/api/mdf-requests/route.ts`, `src/app/api/mdf-requests/[requestId]/decision/route.ts`, and `src/app/api/mdf-requests/[requestId]/reimburse/route.ts`.
- What it calls: `src/domain/mdfRequest.ts`, `src/repositories/mdfRepository.ts`, `src/repositories/partnerRepository.ts`, `src/repositories/backgroundJobRepository.ts`, and `src/lib/audit/auditLogger.ts`.
- What would break or become insecure if this file were wrong: Finance could over-reimburse requests or create payout records without a valid approval chain.
- What a junior engineer would likely miswrite here: Trusting the client-provided approved amount instead of reloading the server-side request.

## `src/repositories/reportingRepository.ts`
- What it does: Loads quarter-bounded reporting inputs and persists leaderboard snapshots.
- What calls it: `src/services/reportingService.ts`.
- What it calls: `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Reports would miscount deal ARR or MDF reimbursements and quietly show the wrong leaderboard.
- What a junior engineer would likely miswrite here: Forgetting to bound one side of the time window, especially for reimbursements.

## `src/services/backgroundJobService.ts`
- What it does: Processes queued jobs and dispatches them to reporting refresh logic.
- What calls it: `src/app/api/jobs/process/route.ts`.
- What it calls: `src/repositories/backgroundJobRepository.ts` and `src/services/reportingService.ts`.
- What would break or become insecure if this file were wrong: Jobs could run twice, stay queued forever, or fail without leaving any operational signal.
- What a junior engineer would likely miswrite here: Not marking the job `RUNNING` before starting work.

## `prisma/schema.prisma`
- What it does: Defines the durable shape of the entire system, including workflow enums and cross-cutting tables like `AuditLog` and `BackgroundJob`.
- What calls it: Prisma Client generation, then every repository in `src/repositories/*.ts`.
- What it calls: No runtime modules; this is the schema source.
- What would break or become insecure if this file were wrong: The rest of the code would either fight the data model or encode missing guarantees in fragile application logic.
- What a junior engineer would likely miswrite here: Flattening workflow artifacts into the main table and losing history, traceability, or uniqueness constraints.
