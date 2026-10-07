# Verification

## 1. Recorded by the original Astra run (not re-run for this revision)

[evidence/results.json](evidence/results.json) records:

- command `node --experimental-vm-modules --test tests/deal-transition-lab.test.mjs`
- `exitCode: 0`, `passed: true`, `executedTests: 5`, elapsed 5.94 s, started 2026-09-22T03:17:24Z
- `cwd` was a staging directory on the author's machine (`...\stage\d851d9ba11a1`), not this clone

The log file it names, `crud-b05-astra-runtime.log`, was **not committed**. Only `results.json` is tracked, so the earlier "captured output" link does not resolve here.

Recorded limits, still accurate:

1. The five cases execute the real service, transition policy, role permissions, error classes, and quarter helper. The transaction, repositories, audit, job, and the unused `ZodError` are explicit doubles.
2. No Next.js, native database, rollback, worker, or concurrent transition was executed.
3. The current deal is read before the transaction, and the update does not compare the prior status. Shared-client assertions do not prove isolation.
4. No production behavior changed.

## 2. Confirmed by reading this clone

- `src/services/dealRegistrationService.ts` and `snapshots/dealRegistrationService.ts.original.txt` are the reference pair for the unchanged service.
- `tests/deal-transition-lab.test.mjs` has five `test(...)` calls, at lines 20, 24, 28, 31, and 34. The case at line 28 iterates three refusal tuples.
- The `attempt` helper (line 9) asserts `client === tx` on every write.
- `src/repositories/dealRepository.ts:134` updates by `id` only.
- `src/lib/auth/session.ts:14` defaults to `demo-channel-manager`.

## 3. Never executed, as far as the repo records

- `npm test` (four Vitest files)
- `next build`, `tsc`, Prisma migration, or seed
- any HTTP request. The route-level outcomes in chapter 07 come from reading `createAuthedRoute` and `normalizeError`
- the background job processor
- concurrent approvals and job claims

## Closing the gaps

1. Re-run the lab and commit the log next to `results.json`.
2. Add the stale-write conflict case from chapter 03 once the repository uses a conditional update.
3. Add a provider-backed rollback test: force the audit insert to fail, then verify `DealRegistration.status` is unchanged and no `DealApproval` row exists.
4. Add a job-claim race test for `processDueJobs`.
