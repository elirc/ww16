# Solutions and review

## Solutions

- **A.** History carries d1, u1, SUBMITTED, SALES_APPROVED, and `reviewed`. No leaderboard job.
- **B.** 403 before `tx`.
- **C.** 409 before `tx`. A missing visible deal gives 404.
- **D.** The first failure stops at update. The second reaches update and approval, then fails at audit. The `APPROVED` job is never reached.
- **E.** Coordinate with barriers and verify persisted rows from a third connection. Check the version or expected status at mutation time. A prior read cannot detect a stale observation.
- **F.** Add `if (session.role === "SALES_REP" && currentDeal.assignedSalesRepId && currentDeal.assignedSalesRepId !== session.userId) throw new ForbiddenError(...)`. The repository's `findVisibleById` would need to select `assignedSalesRepId`, but `findFirst` already returns all scalar fields, and the `include` only adds relations.
- **G.** `rejectionReason` is cleared on every non-rejection transition. Rely on `DealApproval` for the history.
- **H.** Claim jobs with a conditional update, and skip any job whose claim count is 0.

Reviewers must distinguish an awaited transaction callback from an observed, durable commit.

## Rubric for the lab

1. The real domain policy and permission matrix execute, rather than a hand-written allow-list.
2. All writes are asserted to share `tx`.
3. Exact history fields are asserted (`fromStatus`, `toStatus`, `actorUserId`, `note`).
4. Each failure point stops later calls.
5. The limits are named: no rollback, no visibility SQL, no concurrency.

## Senior review: findings across the repo

Found by reading this clone. None was reproduced against a database.

| # | Severity | Location | Finding |
|---|---|---|---|
| 1 | High | `src/services/dealRegistrationService.ts:91,99`, `src/repositories/dealRepository.ts:133-145` | Read-then-write race. The status is read outside the transaction and updated by `id` only, so concurrent approvers can double-transition a deal and write duplicate history. |
| 2 | High (demo) | `src/lib/auth/session.ts:11,14` | A missing `x-demo-user-id` header authenticates as `demo-channel-manager`, an internal role that sees every partner's deals. |
| 3 | Medium | `src/domain/dealRegistration.ts:31-53` | Approval ignores assignment (`assignedSalesRepId`, `channelManagerId`). Any SALES_REP or CHANNEL_MANAGER can act on any deal. |
| 4 | Medium | `src/repositories/backgroundJobRepository.ts:24-47`, `src/services/backgroundJobService.ts:16-17` | Job claiming is not atomic, so concurrent processors can run the same job twice. |
| 5 | Medium | `src/repositories/dealRepository.ts:130-146` | `updateStatus` does not re-apply the tenant visibility filter. It is safe only because the service always calls `findVisibleById` first. A new caller that skips that read gets a cross-tenant write. |
| 6 | Low | `src/services/dealRegistrationService.ts:142` | The leaderboard quarter is the UTC quarter of approval, not of the deal's close date. |
| 7 | Low | `src/lib/validation/dealSchemas.ts:17-18` | `assignedSalesRepId` and `channelManagerId` on create are free strings. Nothing checks that they exist, hold the right role, or belong to the right org. |
| 8 | Low | `src/lib/errors.ts:53`, `route-handlers.ts:43-51` | A non-JSON body (`SyntaxError`) and Prisma errors all become a generic 500. |

## Test blind spots

- No case with a stale `find` result followed by a write that should conflict (finding 1).
- The lab's `findVisibleById` ignores tenancy, so the 404-for-other-partner path is never exercised.
- Nothing tests `backgroundJobService` or the `/api/jobs/process` permission.
