# Practice

Each exercise has a **Goal** and a **Check**. Grade yourself on exact source names, trace order, payload fields, and honest limits on what the evidence shows.

## A. Sequence diagram

**Goal:** Draw `d1` moving `SUBMITTED → SALES_APPROVED` by `u1`. Mark the pre-read and the transaction boundary.
**Check:** The pre-read sits outside the box. Inside: update, approval, audit. The approval payload is `{ dealId: 'd1', actorUserId: 'u1', fromStatus: 'SUBMITTED', toStatus: 'SALES_APPROVED', note: 'reviewed' }`, plus a generated `id`. Compare with test line 22.

## B. Wrong role

**Goal:** Switch the actor to `PARTNER_SELLER` without changing the state. Predict the status and the first forbidden call.
**Check:** 403, thrown by `assertPermission(session, "deal:approve_sales")` (`src/domain/dealRegistration.ts:37`). Calls: `['find']` (test line 29).

## C. State error versus role error

**Goal:** `CHANNEL_MANAGER` requests `APPROVED` directly from `SUBMITTED`.
**Check:** 409, from the adjacency map (`dealRegistration.ts:14` lists only `SALES_APPROVED` and `REJECTED`). The permission check never runs.

## D. Failure points

**Goal:** Inject a failure at update, then at audit (during an `APPROVED` transition). Name the last attempted operation each time.
**Check:** update: `['find','tx','update']`. audit: `['find','tx','update','approval','audit']`, with no `job` (test lines 31-36).

## E. Double approval race

**Goal:** Design a race test with two independent database connections.
**Check:** Your design uses barriers (both sessions have finished `findVisibleById` before either opens its transaction), not sleeps. It asserts that exactly one transition succeeds and exactly one `DealApproval` row exists. Explain why the current code fails it: `updateStatus` filters only by `id` (`src/repositories/dealRepository.ts:134`). State that the expected-status predicate belongs in the repository's write, not in a prior service read.

## F. Assignment is ignored

**Goal:** Determine whether a `SALES_REP` who is not the deal's `assignedSalesRepId` can sales-approve it.
**Check:** Yes. Nothing in `assertDealTransitionAllowed` or `transitionDeal` reads `assignedSalesRepId`. Internal roles see every deal (`src/lib/auth/visibility.ts:28-31`). Write the guard you would add, and say which error code it should use.

## G. Rejection reason overwrite

**Goal:** Predict what happens to `rejectionReason` when a `REJECTED` deal is updated again.
**Check:** It cannot be: `REJECTED: []` (`dealRegistration.ts:17`). But note that every non-`REJECTED` transition writes `rejectionReason: null` (`dealRepository.ts:143`), so the field only ever describes the most recent transition. The history is in `DealApproval.note`, through the `note ?? rejectionReason` fallback.

## H. Job double-processing

**Goal:** Find the race in `backgroundJobService.processDueJobs`.
**Check:** `listDueJobs` reads `QUEUED` jobs (`src/repositories/backgroundJobRepository.ts:24-37`), then `markRunning` updates `where: { id }` with no status condition (39-47). Two concurrent `POST /api/jobs/process` calls can both pick up and run the same job. Propose a claim step: `updateMany({ where: { id, status: "QUEUED" } })` with a count check.
