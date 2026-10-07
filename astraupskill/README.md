# Deal transition lab

ww16 is a partner relationship management (PRM) app built on Next.js App Router route handlers, Prisma, Zod, and React Query. Partner organizations register deals. Internal sales reps and channel managers approve them. Partners request market-development funds (MDF), and finance decides on and reimburses those requests. A background job table refreshes a quarterly leaderboard.

This course follows one service method, `dealRegistrationService.transitionDeal` (`src/services/dealRegistrationService.ts:90-155`), and the pure policy it relies on, `assertDealTransitionAllowed` (`src/domain/dealRegistration.ts:22-54`). The delivered change is an executable lab, `tests/deal-transition-lab.test.mjs`. **No production behavior was changed.** `snapshots/dealRegistrationService.ts.original.txt` is the reference copy.

## What `transitionDeal` does

1. It pre-reads the deal with tenant visibility: `dealRepository.findVisibleById(session, dealId)` (line 91), **outside** any transaction. A missing deal gives 404 (93-95).
2. It checks state adjacency first, then role permission (`assertDealTransitionAllowed`, line 97). An illegal edge gives 409, and a missing permission gives 403.
3. It opens `db.$transaction` (line 99) and, on the same `tx` client:
   - `updateStatus` (100-107)
   - `createApproval` with `fromStatus`/`toStatus` history and `note ?? rejectionReason` (109-119)
   - `recordAuditEvent("deal.transitioned")` (121-133)
   - and, only when the next status is `APPROVED`, a `LEADERBOARD_REFRESH` background job tagged with the current UTC quarter (135-150)

## Files to read, in order

1. [`src/domain/dealRegistration.ts`](../src/domain/dealRegistration.ts): the adjacency map (12-20) and the permission per edge (31-53).
2. [`src/lib/auth/permissions.ts`](../src/lib/auth/permissions.ts): the role matrix (30-71).
3. [`src/services/dealRegistrationService.ts`](../src/services/dealRegistrationService.ts): `transitionDeal`.
4. [`src/repositories/dealRepository.ts`](../src/repositories/dealRepository.ts): `findVisibleById` (82-103) and `updateStatus` (130-146).
5. [`tests/deal-transition-lab.test.mjs`](../tests/deal-transition-lab.test.mjs): five cases.

## Run the lab

```text
node --experimental-vm-modules --test tests/deal-transition-lab.test.mjs
```

Run it from the repository root (`root = path.resolve('.')`, test line 5). It needs a Node version that exports `stripTypeScriptTypes` from `node:module`. The real domain policy, permission matrix, error classes, and quarter formatter run. The database, repositories, audit logger, and job repository are recording doubles. The `zod` package is replaced by a stub `ZodError` class (test line 11), because `src/lib/errors.ts:1` imports it.

## The one-sentence caveat

The update writes `where: { id }` only (`dealRepository.ts:134`), using a status that was read before the transaction began. Two approvers who read the same `SUBMITTED` row can both succeed. Chapters 02, 05, and 06 cover this.

## Learning methods

The chapters use four methods in turn: predict the outcome, run the lab for feedback, trace the code, and analyze failures. Exercises are in 05, answers and a repo-wide review in 06, and evidence limits in VERIFICATION.md.
