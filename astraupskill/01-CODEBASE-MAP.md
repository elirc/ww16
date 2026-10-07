# Map

## Request path

`POST /api/deals/{dealId}/transition` is defined in `src/app/api/deals/[dealId]/transition/route.ts`:

1. `createAuthedRoute({}, handler)` (route line 13; wrapper `src/lib/http/route-handlers.ts:28-54`). It resolves the session with `getRequestSession(request)` (`src/lib/auth/session.ts:13-29`). That reads `x-demo-user-id` and **defaults to `demo-channel-manager`** when the header is absent (line 11, line 14). The options object is empty, so no route-level permission is required. The domain policy does all the permission work.
2. `dealTransitionSchema.parse(await request.json())` (route line 14). `nextStatus` must be one of the `dealStatuses`, and a `rejectionReason` is required when `nextStatus` is `REJECTED` (`src/lib/validation/dealSchemas.ts:25-37`).
3. `dealRegistrationService.transitionDeal(session, params.dealId, body)` (line 15).
4. Response: `{ data: deal }` (line 18). Errors pass through `normalizeError` (`src/lib/errors.ts:44-54`) and come back as `{ error, code, details }` with the error's `statusCode` (`route-handlers.ts:42-51`).

## The service, step by step (`src/services/dealRegistrationService.ts`)

| Line(s) | Step | Client used |
|---|---|---|
| 91 | `findVisibleById(session, dealId)` | default `db`, **outside** the transaction |
| 93-95 | `NotFoundError` if `null` | — |
| 97 | `assertDealTransitionAllowed(session, currentDeal.status, input.nextStatus)` | pure |
| 99 | `db.$transaction(async (tx) => ...)` | — |
| 100-107 | `updateStatus({ dealId, nextStatus, rejectionReason }, tx)` | `tx` |
| 109-119 | `createApproval({ fromStatus: currentDeal.status, toStatus, actorUserId, note: note ?? rejectionReason }, tx)` | `tx` |
| 121-133 | `recordAuditEvent(session, { action: "deal.transitioned", metadata: { fromStatus, toStatus } }, tx)` | `tx` |
| 135-150 | if `APPROVED`: `backgroundJobRepository.create({ type: "LEADERBOARD_REFRESH", status: "QUEUED", payload: { quarter, sourceEntity, sourceEntityId } }, tx)` | `tx` |
| 153 | return `updatedDeal` | — |

## The repository (`src/repositories/dealRepository.ts`)

- `findVisibleById` (82-103) combines `id` with `buildOwnedRecordVisibilityFilter(session)` (`src/lib/auth/visibility.ts:28-35`). Internal roles get `{}` and see every partner's deals. Partner roles get `{ partnerOrgId }`, or a sentinel id that matches nothing when the session has no org.
- `updateStatus` (130-146) updates `where: { id: input.dealId }`. It **does not** repeat the visibility filter or the previously observed status. It stamps `submittedAt`, `approvedAt`, or `closedAt` depending on the target, and sets `rejectionReason` to `null` for every non-`REJECTED` transition (line 143).
- `createApproval` (148-153) inserts into `dealApproval`, an append-only history table, per its comment.

## Supporting modules that run for real in the lab

- `src/domain/dealRegistration.ts`: adjacency map plus edge permissions.
- `src/lib/auth/permissions.ts`: `assertPermission` throws `ForbiddenError("Role X cannot perform Y.")` (81-86).
- `src/lib/errors.ts`: `AppError` subclasses carrying `statusCode`.
- `src/lib/time.ts`: `currentQuarterLabel` returns `YYYY-QN` in UTC (7-11).

## Exercise

**Goal:** List every write that happens for a `SALES_APPROVED → APPROVED` transition by `CHANNEL_MANAGER`, and say which client each one uses.
**Check:** `updateStatus`, `createApproval`, `recordAuditEvent`, and `backgroundJobRepository.create`, all on `tx`. That is the order asserted at `tests/deal-transition-lab.test.mjs:25`: `['find','tx','update','approval','audit','job']`. The `find` before them uses `db`, not `tx`. The lab's `findVisibleById` double does not receive a client argument at all (test line 14).
