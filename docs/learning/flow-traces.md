# Flow Traces

## Flow: Partner onboarding from the admin page
1. `src/app/(dashboard)/partners/page.tsx` — the form submit calls `createPartner.mutate(form)`.
2. `src/hooks/usePartners.ts` — `createPartner` fires `POST /api/partners`.
3. `src/app/api/partners/route.ts` — the route file delegates to `createAuthedRoute({ permission: "partner:manage" }, ...)`.
4. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the session and calls `assertPermission(session, "partner:manage")`.
5. `src/lib/validation/partnerSchemas.ts` — `createPartnerSchema.parse()` validates the payload inside the route handler body.
6. `src/services/partnerService.ts` — `createPartner()` starts a transaction and calls `partnerRepository.createPartner()`.
7. `src/repositories/partnerRepository.ts` — `createPartner()` inserts `PartnerOrg` and nested `PartnerAgreement`.
8. `src/lib/audit/auditLogger.ts` — `recordAuditEvent()` writes `partner.created` inside the same transaction.
9. Returns `201` with the created partner row and its nested agreement.

## Flow: Deal moves from draft to submitted
1. `src/app/(dashboard)/deals/page.tsx` — the action button calls `transitionDeal.mutate({ dealId, nextStatus: "SUBMITTED" })`.
2. `src/hooks/useDeals.ts` — `transitionDeal` fires `POST /api/deals/[dealId]/transition`.
3. `src/app/api/deals/[dealId]/transition/route.ts` — the route file delegates to `createAuthedRoute({}, ...)`.
4. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the session before the handler body runs.
5. `src/lib/validation/dealSchemas.ts` — `dealTransitionSchema.parse()` validates the transition payload.
6. `src/services/dealRegistrationService.ts` — `transitionDeal()` loads the current deal via `dealRepository.findVisibleById()`.
7. `src/domain/dealRegistration.ts` — `assertDealTransitionAllowed()` verifies `DRAFT -> SUBMITTED` and enforces `deal:submit`.
8. `src/repositories/dealRepository.ts` — `updateStatus()` sets the new status and `createApproval()` appends approval history.
9. `src/lib/audit/auditLogger.ts` — `recordAuditEvent()` persists `deal.transitioned`.
10. Returns `200` with the updated deal.

## Flow: Deal moves from sales-approved to approved and schedules reporting work
1. `src/app/(dashboard)/deals/page.tsx` — the user clicks the “Channel approve” action rendered by `DealBoard`.
2. `src/hooks/useDeals.ts` — `transitionDeal` fires `POST /api/deals/[dealId]/transition`.
3. `src/app/api/deals/[dealId]/transition/route.ts` — the route file delegates to `createAuthedRoute({}, ...)`.
4. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the session before the handler body runs.
5. `src/lib/validation/dealSchemas.ts` — `dealTransitionSchema.parse()` validates `nextStatus: "APPROVED"`.
6. `src/services/dealRegistrationService.ts` — `transitionDeal()` calls `assertDealTransitionAllowed()` and starts a transaction.
7. `src/domain/dealRegistration.ts` — `assertDealTransitionAllowed()` requires `deal:approve_channel` for `SALES_APPROVED -> APPROVED`.
8. `src/repositories/dealRepository.ts` — `updateStatus()` sets `approvedAt` and `createApproval()` stores the immutable transition record.
9. `src/repositories/backgroundJobRepository.ts` — `create()` enqueues a `LEADERBOARD_REFRESH` job for the current quarter.
10. Returns `200` with the approved deal.

## Flow: MDF reimbursement from the finance workflow
1. `src/app/(dashboard)/mdf/page.tsx` — the “Reimburse” button calls `reimburseRequest.mutate({ requestId, amount, receiptUrl })`.
2. `src/hooks/useMdfRequests.ts` — `reimburseRequest` fires `POST /api/mdf-requests/[requestId]/reimburse`.
3. `src/app/api/mdf-requests/[requestId]/reimburse/route.ts` — the route file delegates to `createAuthedRoute({ permission: "mdf:reimburse" }, ...)`.
4. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` authenticates the caller and checks `mdf:reimburse`.
5. `src/lib/validation/mdfSchemas.ts` — `reimburseMdfRequestSchema.parse()` validates the payload.
6. `src/services/mdfService.ts` — `reimburseRequest()` reloads the request and verifies the amount does not exceed `approvedAmount`.
7. `src/domain/mdfRequest.ts` — `assertMdfTransitionAllowed()` verifies `APPROVED -> REIMBURSED` and enforces `mdf:reimburse`.
8. `src/repositories/mdfRepository.ts` — `markReimbursed()` updates the parent request and `createReimbursement()` inserts the payout record.
9. `src/repositories/backgroundJobRepository.ts` — `create()` queues leaderboard refresh work for reporting.
10. Returns `201` with the created reimbursement.

## Flow: Leaderboard read with live fallback
1. `src/app/(dashboard)/reports/page.tsx` — changing the quarter input causes `useLeaderboard(quarter)` to refetch.
2. `src/hooks/useLeaderboard.ts` — `useQuery` requests `GET /api/reports/leaderboard?quarter=...`.
3. `src/app/api/reports/leaderboard/route.ts` — the route file delegates to `createAuthedRoute({ permission: "reports:view" }, ...)`.
4. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` authenticates the request and checks `reports:view`.
5. `src/app/api/reports/leaderboard/route.ts` — the handler body chooses the requested quarter or `currentQuarterLabel(new Date())`.
6. `src/services/reportingService.ts` — `getLeaderboard()` first calls `reportingRepository.listLeaderboardSnapshots(quarter)`.
7. `src/repositories/reportingRepository.ts` — if snapshot rows exist they are returned; otherwise `listPartnerMetricInputs(start, end)` supplies live inputs.
8. `src/services/reportingService.ts` — `buildLeaderboardRows()` computes the score and shapes the response.
9. Returns `200` with `{ source: "snapshot" | "live", quarter, rows }`.

## Flow: Unauthorized operator call is rejected before any job runs
1. `tests/auth/createAuthedRoute.test.ts` — the test creates a protected handler requiring `jobs:process`.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the mocked session and calls `assertPermission()`.
3. `src/lib/auth/permissions.ts` — `assertPermission()` rejects the `SALES_REP` role for `jobs:process`.
4. `src/lib/errors.ts` — `normalizeError()` converts the thrown `ForbiddenError` into a structured API error.
5. `src/services/backgroundJobService.ts` — no function is reached because the request is rejected at the auth boundary.
6. `src/repositories/backgroundJobRepository.ts` — no query is reached for the same reason.
7. Returns `403` with `{ error, code: "FORBIDDEN" }`.
8. The test asserts that the endpoint stays closed to the wrong role.

## Flow: Queued leaderboard refresh job is processed asynchronously
1. `src/app/api/jobs/process/route.ts` — the operator endpoint calls `backgroundJobService.processDueJobs()`.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` authenticates the operator and verifies `jobs:process`.
3. `src/services/backgroundJobService.ts` — `processDueJobs()` loads queued work through `backgroundJobRepository.listDueJobs()`.
4. `src/repositories/backgroundJobRepository.ts` — `markRunning()` updates the job status before processing starts.
5. `src/services/backgroundJobService.ts` — the service dispatches `LEADERBOARD_REFRESH` jobs to `reportingService.refreshLeaderboardSnapshot()`.
6. `src/services/reportingService.ts` — `refreshLeaderboardSnapshot()` recomputes rows and calls `reportingRepository.upsertSnapshot()` for each partner.
7. `src/repositories/backgroundJobRepository.ts` — `markSucceeded()` or `markFailed()` captures the final operational state.
8. Returns `200` with an array of per-job outcomes.
