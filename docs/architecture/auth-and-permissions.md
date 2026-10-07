# Auth And Permissions

## Session flow

Session is resolved in `src/lib/auth/session.ts` by `getRequestSession()` near the top of the file. The function reads `x-demo-user-id`, falls back to `demo-channel-manager`, and then calls `userRepository.findSessionUserById()` in `src/repositories/userRepository.ts` so the request trusts a canonical user row instead of a raw header value.

Route-level auth is enforced in `src/lib/http/route-handlers.ts` inside `createAuthedRoute()` near the middle of the file. That wrapper:

- calls `getRequestSession()`
- optionally calls `assertPermission()` from `src/lib/auth/permissions.ts`
- catches `AppError` and `ZodError` failures via `normalizeError()` in `src/lib/errors.ts`

Because all API files use `createAuthedRoute()`, the auth edge stays centralized instead of spreading into every `route.ts`.

## Role model

The role list lives in `src/types/auth.ts` and is mapped to permissions in `src/lib/auth/permissions.ts` inside `rolePermissionMatrix`.

- `PLATFORM_ADMIN`
  Full access, including partner management and job processing.
- `CHANNEL_MANAGER`
  Internal channel operations: partner management, channel approval on deals, certification management, reporting.
- `SALES_REP`
  Internal sales operations: deal creation, sales approval, close outcomes, reporting.
- `FINANCE_MANAGER`
  Finance operations: MDF decisions, reimbursements, reporting, job processing.
- `PARTNER_ADMIN`
  Partner portal admin: read own partner data, create and submit deals, create MDF requests, read reports.
- `PARTNER_SELLER`
  Narrower partner seller: create and submit deals plus MDF creation, but no report access.

## Where authorization is enforced

### Route-level permission checks

- `src/app/api/partners/route.ts` calls `createAuthedRoute({ permission: "partner:manage" }, ...)` for partner onboarding.
- `src/app/api/jobs/process/route.ts` calls `createAuthedRoute({ permission: "jobs:process" }, ...)` for operator-only job processing.
- `src/app/api/mdf-requests/[requestId]/reimburse/route.ts` calls `createAuthedRoute({ permission: "mdf:reimburse" }, ...)` for finance-only reimbursement.

This catches obvious wrong-role access before the service layer runs.

### Service-level permission checks

Services still call `assertPermission()` even when the route already has a required permission. Examples:

- `src/services/partnerService.ts` calls `assertPermission(session, "partner:read")` in `listPartners()` and `assertPermission(session, "partner:manage")` in `createPartner()`.
- `src/services/dealRegistrationService.ts` calls `assertPermission(session, "deal:create")` in `createDeal()`.
- `src/services/mdfService.ts` calls `assertPermission(session, "mdf:read")` in `listRequests()`.

This duplication is deliberate. It keeps service functions safe if they are reused by another route, a job, or a future RPC boundary.

### Workflow-specific permission checks

Some permissions depend on the *current status* and the *next status*, not just the route:

- `src/domain/dealRegistration.ts` in `assertDealTransitionAllowed()` chooses between `deal:submit`, `deal:approve_sales`, `deal:approve_channel`, and `deal:close` based on the transition.
- `src/domain/mdfRequest.ts` in `assertMdfTransitionAllowed()` distinguishes submit, decide, and reimburse actions.

This is the important distinction between “who can call the endpoint” and “who can perform this exact transition right now.”

## Ownership and data isolation

Partner-visible queries are scoped by session-owned filters in `src/lib/auth/visibility.ts`.

- `buildPartnerVisibilityFilter()` is used by `src/repositories/partnerRepository.ts` so partner users only see their own `PartnerOrg`.
- `buildOwnedRecordVisibilityFilter()` is used by `src/repositories/dealRepository.ts` and `src/repositories/mdfRepository.ts` so partner users only see rows with their `partnerOrgId`.
- `assertPartnerOwnership()` is used in `src/services/dealRegistrationService.ts` and `src/services/mdfService.ts` before create flows, so a partner user cannot create records for another partner organization even if they tamper with the request body.

The practical rule is: **role checks decide capability, visibility filters decide data scope**. Both are required.

## Audit and async security-sensitive flows

- `src/lib/audit/auditLogger.ts` writes audit rows during service transactions.
- `src/services/dealRegistrationService.ts` writes `deal.transitioned` audit events and queues `LEADERBOARD_REFRESH` jobs only after valid approval transitions.
- `src/services/mdfService.ts` writes `mdf.decided` and `mdf.reimbursed` audit events and only then enqueues leaderboard refresh jobs.

If these writes were moved outside the transaction, security reviews would have to reason about partially-applied workflow changes.

## Multi-tenancy decision

Full multi-tenancy is **not included**. The code is designed as a single vendor deployment with partner-owned data instead. That is realistic for a learning project because the most important architectural lessons here are explicit RBAC, ownership scoping, workflow transitions, and transactional side effects.

To add real multi-tenancy later without a rewrite:

1. Add `tenantId` to tenant-owned models in `prisma/schema.prisma`, at minimum `User`, `PartnerOrg`, `DealRegistration`, `MdfRequest`, `CertificationRecord`, `AuditLog`, `BackgroundJob`, and `LeaderboardSnapshot`.
2. Extend `RequestSession` in `src/types/auth.ts` and `getRequestSession()` in `src/lib/auth/session.ts` to carry `tenantId`.
3. Replace the current partner-only filters in `src/lib/auth/visibility.ts` with filters that always include `tenantId`, and then layer `partnerOrgId` constraints on top for partner users.
4. Update every repository method in `src/repositories/*.ts` that touches tenant-owned data so the Prisma `where` clauses include `tenantId`.
5. Update audit and job creation in `src/lib/audit/auditLogger.ts` and `src/repositories/backgroundJobRepository.ts` so async work is tenant-bound too.

If you skip step 4, you would have a codebase that *looks* tenant-aware in auth but still leaks data at the query layer.

## Exact locations

- `getRequestSession()`: `src/lib/auth/session.ts:13-29`. The default user `demo-channel-manager` is set at line 11 and applied at line 14.
- `createAuthedRoute()`: `src/lib/http/route-handlers.ts:28-54`. The optional permission check is at lines 36-38, and error serialization at 42-51.
- `rolePermissionMatrix`: `src/lib/auth/permissions.ts:30-71`. `isInternalRole()` is at 88-90.
- Visibility helpers: `src/lib/auth/visibility.ts:13-35`.
- Deal edge permissions: `src/domain/dealRegistration.ts:31-53`.

## Where the boundaries leak

1. **Missing header means channel manager.** With no `x-demo-user-id`, every request runs as an internal `CHANNEL_MANAGER` (`session.ts:11,14`). Internal roles get an empty visibility filter (`visibility.ts:20-22, 29-31`), so an anonymous caller can read every partner's deals and MDF requests. The fallback is convenient for a demo, and it must be the first thing removed before deployment.
2. **Capability without assignment.** `assertDealTransitionAllowed` checks only the role. `DealRegistration.assignedSalesRepId` and `channelManagerId` are stored (`src/repositories/dealRepository.ts:111-112`), but no policy reads them, so any `SALES_REP` can sales-approve or close any deal.
3. **Write paths trust an earlier scoped read.** `dealRepository.updateStatus` updates `where: { id }` (line 134), with neither the visibility filter nor the expected status. It is safe today only because `transitionDeal` calls `findVisibleById` first. It is also the source of the stale-approval race described in `astraupskill/02-CONCEPTS.md`.
4. **Job processing is double-guarded but not atomic.** Only `PLATFORM_ADMIN` and `FINANCE_MANAGER` hold `jobs:process`. Even so, two authorized operators calling `POST /api/jobs/process` concurrently can claim the same job, because `markRunning` updates by id without a `status: "QUEUED"` predicate (`src/repositories/backgroundJobRepository.ts:39-47`).

## Exercise

**Goal:** Show that an unauthenticated request can list all deals.
**Check:** Trace `GET /api/deals` with no headers. `getRequestSession` resolves `demo-channel-manager` (if that user exists in the seeded database), `CHANNEL_MANAGER` holds `deal:read` (`permissions.ts:35`), and `buildOwnedRecordVisibilityFilter` returns `{}` for internal roles. The query has no `partnerOrgId` filter. Name the line to change so that a missing header yields 401.
