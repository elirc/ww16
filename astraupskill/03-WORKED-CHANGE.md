# Worked path

## What was delivered

`tests/deal-transition-lab.test.mjs` is the delivered change. It executes the unchanged production service. `snapshots/dealRegistrationService.ts.original.txt` holds the reference bytes, so you can compare them with the current file and confirm nothing changed.

## Trace 1: `SUBMITTED → SALES_APPROVED` by `SALES_REP`

Fixture (test lines 6-19): the session is `{ userId: 'u1', role: 'SALES_REP' }`. The deal is `{ id: 'd1', status: 'SUBMITTED' }`. The input is `{ nextStatus: 'SALES_APPROVED', note: 'reviewed' }`.

1. `find`: the double asserts the id is `'d1'` and records the session (line 14).
2. Adjacency: `SUBMITTED` permits `SALES_APPROVED` (`dealRegistration.ts:14`).
3. Permission: `deal:approve_sales` is in the `SALES_REP` list (`permissions.ts:47`).
4. `tx`: the `$transaction` double records `['tx']` and calls the callback with the shared `tx` object (line 12).
5. `update`: payload `{ dealId: 'd1', nextStatus: 'SALES_APPROVED', rejectionReason: undefined }`. Line 22 asserts `dealId` and `nextStatus`.
6. `approval`: `fromStatus: 'SUBMITTED'`, `toStatus: 'SALES_APPROVED'`, `actorUserId: 'u1'`, `note: 'reviewed'` (line 22).
7. `audit`: `action: 'deal.transitioned'` (line 22). The audit double also asserts that the actor's `userId` is `'u1'` (line 13).
8. Return: the same `updated` object the update double returned (`assert.equal(await f.run(), f.updated)`, line 21).

Every `attempt(...)` call asserts `client === tx` (line 9). That is how the lab proves all four writes share one client.

## Trace 2: `SALES_APPROVED → APPROVED` by `CHANNEL_MANAGER`

The same sequence, plus `job` (line 25). Line 26 asserts the job payload: `type: 'LEADERBOARD_REFRESH'`, `status: 'QUEUED'`, `sourceEntity: 'DealRegistration'`, `sourceEntityId: 'd1'`, and a `quarter` matching `/^\d{4}-Q[1-4]$/`. The real `currentQuarterLabel` produced that quarter. The test checks only its format, not its value, so the test never depends on the clock.

## Trace 3: refusals (line 29)

| Session role | Request | Thrown by | Status | Calls |
|---|---|---|---|---|
| PARTNER_SELLER | SALES_APPROVED | `assertPermission` (`permissions.ts:83-85`) | 403 | `find` |
| CHANNEL_MANAGER | APPROVED from SUBMITTED | adjacency (`dealRegistration.ts:27-29`) | 409 | `find` |
| SALES_REP | missing deal | `NotFoundError` (`dealRegistrationService.ts:93-95`) | 404 | `find` |

## Trace 4: failures inside the transaction

- `update` throws (lines 31-33): the calls are `find, tx, update`. No approval, no audit. The same error object propagates.
- `audit` throws during an `APPROVED` transition (lines 34-36): the calls are `find, tx, update, approval, audit`. No job is created.

In production, `prisma.$transaction` would roll back the update and the approval. The double cannot show that. It only shows which calls were attempted.

## Exercise: make the transition compare-and-set

**Goal:** Change `dealRepository.updateStatus` so a stale observer cannot double-transition a deal.
**Check:** (1) The repository uses `updateMany({ where: { id, status: expectedStatus }, data })` and returns `null` when `count !== 1`. (2) The service passes `expectedStatus: currentDeal.status` and throws `ConflictError("Deal changed; refresh and retry.")` on `null`, **before** `createApproval`. (3) A new lab case makes the update double return `null`, and asserts a 409 with calls `['find','tx','update']`. (4) Remember that `updateMany` returns a count, not a row. Re-read the deal inside the transaction to keep the current return shape.
