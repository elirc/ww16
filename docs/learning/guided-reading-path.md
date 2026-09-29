# Guided Reading Path

## Step 1 — `prisma/schema.prisma`
**Why read this:** This is the contract for every important entity, relationship, workflow enum, audit table, and async job table.
**What to look for:** Notice how `partnerOrgId` anchors partner-owned data, and how `DealApproval`, `MdfReimbursement`, `AuditLog`, and `BackgroundJob` are modeled as separate records instead of hidden JSON blobs.
**What to trace:** This file feeds `src/repositories/*.ts`, especially `src/repositories/dealRepository.ts`, `src/repositories/mdfRepository.ts`, and `src/repositories/reportingRepository.ts`.
**What a junior would likely miss:** Derived tables like `LeaderboardSnapshot` are still part of the architecture even though they are not source-of-truth entities.

## Step 2 — `src/types/auth.ts`
**Why read this:** It defines the shape that the rest of the app trusts for request identity.
**What to look for:** `RequestSession` is intentionally small: user ID, display name, role, email, and optional `partnerOrgId`.
**What to trace:** `src/lib/auth/session.ts` creates this type; `src/lib/http/route-handlers.ts`, `src/lib/auth/permissions.ts`, and services consume it.
**What a junior would likely miss:** Letting the session type grow with unrelated fields is how implicit coupling creeps into a backend.

## Step 3 — `src/lib/auth/permissions.ts`
**Why read this:** This is the centralized RBAC matrix.
**What to look for:** `rolePermissionMatrix`, `assertPermission()`, and the difference between roles and permissions.
**What to trace:** Routes call it via `src/lib/http/route-handlers.ts`; domain files call it from `src/domain/dealRegistration.ts` and `src/domain/mdfRequest.ts`.
**What a junior would likely miss:** A route-level permission check does not replace workflow-level permission logic.

## Step 4 — `src/lib/auth/visibility.ts`
**Why read this:** This is the data-isolation boundary for partner users.
**What to look for:** `buildPartnerVisibilityFilter()`, `buildOwnedRecordVisibilityFilter()`, and `assertPartnerOwnership()`.
**What to trace:** These helpers are used in `src/repositories/partnerRepository.ts`, `src/repositories/dealRepository.ts`, `src/repositories/mdfRepository.ts`, `src/services/dealRegistrationService.ts`, and `src/services/mdfService.ts`.
**What a junior would likely miss:** Query scoping is separate from permission checks; you need both.

## Step 5 — `src/lib/http/route-handlers.ts`
**Why read this:** It is the shared HTTP edge for auth, errors, and request context.
**What to look for:** `createAuthedRoute()` and how it wraps every route with the same lifecycle.
**What to trace:** Follow from `src/app/api/partners/route.ts` or `src/app/api/deals/[dealId]/transition/route.ts` into this file, then into `src/lib/auth/session.ts`.
**What a junior would likely miss:** Central wrappers are not “extra abstraction” when they remove duplicated security logic.

## Step 6 — `src/lib/validation/dealSchemas.ts`
**Why read this:** It shows the intended validation boundary for non-trivial workflows.
**What to look for:** `createDealSchema` versus `dealTransitionSchema`, especially the refinement requiring a rejection reason.
**What to trace:** `src/app/api/deals/route.ts` and `src/app/api/deals/[dealId]/transition/route.ts` both parse through this file before reaching the service layer.
**What a junior would likely miss:** Conditional validation is part of the API contract, not a convenience for the UI.

## Step 7 — `src/domain/dealRegistration.ts`
**Why read this:** This is the pure workflow rule layer for deal transitions.
**What to look for:** `allowedTransitions` and `assertDealTransitionAllowed()`.
**What to trace:** `src/services/dealRegistrationService.ts` calls it before any status update; `tests/services/dealRegistrationDomain.test.ts` protects it.
**What a junior would likely miss:** Business workflow rules belong in a reusable module, not inline in the route or repository.

## Step 8 — `src/repositories/dealRepository.ts`
**Why read this:** It shows how the project wants Prisma queries to look.
**What to look for:** `findVisibleById()` scopes the query itself, and `createApproval()` keeps approval history append-only.
**What to trace:** `src/services/dealRegistrationService.ts` calls every function here; `src/lib/auth/visibility.ts` provides its filters.
**What a junior would likely miss:** A repository method that loads by ID without visibility filters is a security bug even if only “trusted” services call it.

## Step 9 — `src/services/dealRegistrationService.ts`
**Why read this:** This is the best example of the project’s service-layer style.
**What to look for:** `createDeal()` versus `transitionDeal()`, transaction ownership, audit logging, and job enqueueing.
**What to trace:** It is called by `src/app/api/deals/route.ts` and `src/app/api/deals/[dealId]/transition/route.ts`, and it calls `src/domain/dealRegistration.ts`, `src/repositories/dealRepository.ts`, `src/repositories/backgroundJobRepository.ts`, and `src/lib/audit/auditLogger.ts`.
**What a junior would likely miss:** The transaction boundary is the architecture here; moving pieces out of it creates inconsistent state.

## Step 10 — `src/services/mdfService.ts`
**Why read this:** It mirrors the deal service but with finance-specific approval and reimbursement behavior.
**What to look for:** `decideRequest()` versus `reimburseRequest()` and the approved-amount guard.
**What to trace:** It is called by `src/app/api/mdf-requests/**/route.ts` and calls `src/domain/mdfRequest.ts`, `src/repositories/mdfRepository.ts`, `src/repositories/backgroundJobRepository.ts`, and `src/lib/audit/auditLogger.ts`.
**What a junior would likely miss:** Approval and payment are separate business events and should remain separate writes.

## Step 11 — `src/repositories/reportingRepository.ts`
**Why read this:** It shows how reporting inputs are assembled without turning pages into data processors.
**What to look for:** `listPartnerMetricInputs()` and the date-bounded reimbursement filter.
**What to trace:** `src/services/reportingService.ts` calls it for both live reads and snapshot refreshes.
**What a junior would likely miss:** Reporting queries still need correctness boundaries, especially around time windows.

## Step 12 — `src/services/reportingService.ts`
**Why read this:** It demonstrates live computation versus async snapshot persistence in one place.
**What to look for:** `getLeaderboard()`, `refreshLeaderboardSnapshot()`, and the fact that snapshot refresh is idempotent.
**What to trace:** `src/app/api/reports/leaderboard/route.ts` and `src/services/backgroundJobService.ts` both depend on it.
**What a junior would likely miss:** “Reporting” is still core backend logic and deserves service-level ownership.

## Step 13 — `src/services/backgroundJobService.ts`
**Why read this:** It is the async workflow entry point.
**What to look for:** `processDueJobs()`, per-job status handling, and failure capture.
**What to trace:** `src/app/api/jobs/process/route.ts` calls it, and it calls `src/repositories/backgroundJobRepository.ts` plus `src/services/reportingService.ts`.
**What a junior would likely miss:** Async work still needs structured outcomes and state transitions, not just a `for` loop over tasks.

## Step 14 — `src/hooks/useDeals.ts`
**Why read this:** It shows how the UI is kept thin and aligned with the backend routes.
**What to look for:** `createDeal` and `transitionDeal` mutations invalidating the right queries.
**What to trace:** `src/app/(dashboard)/deals/page.tsx` calls this hook, which hits `src/app/api/deals/route.ts` and `src/app/api/deals/[dealId]/transition/route.ts`.
**What a junior would likely miss:** Frontend hooks should model API operations, not duplicate business rules.

## Step 15 — `src/app/(dashboard)/deals/page.tsx`
**Why read this:** It is the end-user surface for the most important workflow in the project.
**What to look for:** The page only collects input and calls mutations; it does not decide which transitions are valid.
**What to trace:** It calls `src/hooks/useDeals.ts`, which calls the REST routes, which call the service layer.
**What a junior would likely miss:** UI convenience buttons are not the source of truth for workflow rules.
