# Debugging

## Harness mechanics

`tests/helpers/load-typescript.mjs` strips TypeScript types (line 38) and evaluates source modules inside `node:vm`. `@/` resolves to `<root>/src` (lines 8 and 47). The lab's stubs (test lines 10-17) replace six specifiers:

| Specifier | Replacement | Why |
|---|---|---|
| `zod` | `{ ZodError: class extends Error {} }` | `src/lib/errors.ts:1` imports `ZodError` for `normalizeError`. The service never calls `normalizeError`, so the stub only has to satisfy the import |
| `@/lib/db` | `db.$transaction` that records `tx` and calls the callback with a shared object | no Prisma |
| `@/lib/audit/auditLogger` | recorder that asserts the actor | avoids the real repository |
| `@/repositories/dealRepository` | `findVisibleById`, `updateStatus`, `createApproval` doubles | |
| `@/repositories/backgroundJobRepository` | `create` double | |
| `@/repositories/partnerRepository` | empty object | imported by the service for `createDeal`, which the lab never calls |

Real modules that execute: `src/domain/dealRegistration.ts`, `src/lib/auth/permissions.ts`, `src/lib/auth/visibility.ts` (imported by the service, but `assertPartnerOwnership` is only used in `createDeal`), `src/lib/errors.ts`, and `src/lib/time.ts`.

Note that `fixture()` calls `loadTypeScript` on every invocation (line 10). Each test gets a fresh module graph, so module-level state cannot leak between cases.

## Reading a failure

Look at the first unexpected entry in `f.calls.map(x => x[0])`:

- **`tx` appears in a refusal case:** a policy check moved inside, or below, `$transaction`. Check `dealRegistrationService.ts:97-99`.
- **A refusal returns the wrong status:** remember the order, adjacency (409) before permission (403). A test expecting 403 for an illegal edge is wrong, not the code.
- **The approval `note` is missing:** the fallback `input.note ?? input.rejectionReason` (line 116) changed.
- **`job` appears after an audit failure:** an `await` was dropped around `recordAuditEvent` (lines 121-133).
- **`AssertionError` inside `attempt`:** a write used a client other than `tx` (line 9). The service probably called a repository without passing `tx`, so the call fell back to the default `db`.
- **`Unstubbed external dependency`:** a new package import reached the loaded graph. Stub it or keep it behind a repository.

## What the lab cannot observe

- The visibility filter. The `findVisibleById` double ignores the session's role and org.
- The `updateStatus` SQL, including its missing status predicate.
- Rollback. The `tx` object is a plain `{}`.
- Concurrency. Each fixture runs one call at a time.
- The route: the schema refine for `rejectionReason`, the default demo user, and the JSON error shape.

A provider-backed test would force the audit insert to fail, then query `DealRegistration.status` and `DealApproval` rows through another connection. Only that substantiates rollback. Do not edit the double to fake a rollback and then report it as database evidence.

## Vitest suite

`npm test` runs Vitest over:

- `tests/auth/createAuthedRoute.test.ts`
- `tests/repositories/visibility.test.ts`
- `tests/services/dealRegistrationDomain.test.ts`
- `tests/validation/dealSchemas.test.ts`

The `.mjs` lab is separate, and the recorded evidence covers only the lab command.

## Exercise

**Goal:** Prove that the lab does not check visibility.
**Check:** Change the `findVisibleById` double to return `null` when `actor.role === 'PARTNER_SELLER'`. Then rerun the refusal matrix. The PARTNER_SELLER case now produces 404 instead of 403, which shows that with real visibility and a deal outside the partner's org, a partner would never reach the policy at all.
