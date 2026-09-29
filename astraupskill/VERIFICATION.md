# Verification

The production source is `src/services/dealRegistrationService.ts`; exact original bytes are in `snapshots/dealRegistrationService.ts.original.txt`. The local test is `tests/deal-transition-lab.test.mjs`. The captured `crud-b05-astra-runtime` test covers five cases: sales approval, channel approval job, combined refusals, update failure and audit failure. The test uses explicit repository, audit, job, and database adapters. It does not execute Next.js, Prisma, rollback, or concurrent writers.

Run `node --experimental-vm-modules --test tests/deal-transition-lab.test.mjs` from this project. Five test cases contain multiple scenarios: sales success, channel success with job, a combined refusal matrix, update failure and audit failure. The refusal matrix itself checks role denial, illegal adjacency and missing deal. Real authorization, workflow rules, error classes and quarter formatting are loaded, with an unused ZodError export adapted at the external package boundary. Repository, transaction, audit and job persistence are explicit adapters. The assertions verify payload fields, ordering, error identity and reuse of the supplied client. They do not execute visibility queries or status-update SQL. Source inspection found the update selects only by id, while visibility and state are read earlier. Full typechecking, provider isolation, rollback, concurrent approval and worker execution remain outside the captured check.

## Astra execution evidence

The captured focused production-source suite executed 5 tests: all passed, zero failed and zero skipped. Read the [captured output](evidence/crud-b05-astra-runtime.log) and [exact command and limits](evidence/results.json). Earlier check records remain preserved in the workspace.
