# Trace lab

## Worksheet

Fill in the columns before you read `tests/deal-transition-lab.test.mjs`. Then mark each row as either **observed through a double** or **executed real policy**.

### Sales approval (`SUBMITTED → SALES_APPROVED`, SALES_REP)

| Operation | Input | Client | Returns | Kind |
|---|---|---|---|---|
| find | `('d1')` | default `db` | `{ id: 'd1', status: 'SUBMITTED' }` | double |
| policy | `SUBMITTED → SALES_APPROVED`, role SALES_REP | — | passes | real |
| tx | callback | — | — | double |
| update | `{ dealId: 'd1', nextStatus: 'SALES_APPROVED' }` | `tx` | updated row | double |
| approval | `{ fromStatus: 'SUBMITTED', toStatus: 'SALES_APPROVED', actorUserId: 'u1', note: 'reviewed' }` | `tx` | — | double |
| audit | `{ action: 'deal.transitioned', metadata: { fromStatus, toStatus } }` | `tx` | — | double |

### Channel approval (`SALES_APPROVED → APPROVED`, CHANNEL_MANAGER)

Same as above, plus:

| job | `{ type: 'LEADERBOARD_REFRESH', status: 'QUEUED', payload: { quarter: 'YYYY-QN', sourceEntity: 'DealRegistration', sourceEntityId: 'd1' } }` | `tx` | — | double; the quarter comes from the real `currentQuarterLabel` |

### Refusal matrix (test line 29)

| Case | Status | Recorded calls |
|---|---|---|
| PARTNER_SELLER requests SALES_APPROVED | 403 | find |
| CHANNEL_MANAGER requests APPROVED from SUBMITTED | 409 | find |
| absent visible deal | 404 | find |

### Failure rows

| Fault | Recorded calls | Absent |
|---|---|---|
| update throws | find, tx, update | approval, audit |
| audit throws during APPROVED | find, tx, update, approval, audit | job |

## HTTP view (read from source, not executed)

| Request | Response |
|---|---|
| No `x-demo-user-id` header | session = `demo-channel-manager` (`src/lib/auth/session.ts:11`) |
| `x-demo-user-id: ghost` | 401 `{ error: "The supplied demo user could not be resolved.", code: "UNAUTHORIZED" }` |
| `{ "nextStatus": "REJECTED" }` without `rejectionReason` | 400 `VALIDATION_ERROR`, with `details` from Zod's `flatten()` (`dealSchemas.ts:31-37`, `errors.ts:49-51`) |
| valid transition | 200 `{ data: <updated deal> }` |

## Stale-read trace (not executable in the lab)

Two sales reps, A and B:

1. A reads SUBMITTED. B reads SUBMITTED.
2. A's transaction updates, writes approval A, writes audit A, and commits.
3. B's transaction updates by `id` (no status check), writes approval B, writes audit B, and commits.

Result: two approval rows, both `SUBMITTED → SALES_APPROVED`. Annotate step 3 with `dealRepository.ts:134` as the line that lets it through.

## Exercise

**Goal:** Add a row for `PARTNER_ADMIN` requesting `DRAFT → SUBMITTED` on a deal in its own org.
**Check:** Adjacency allows it (`dealRegistration.ts:13`). `deal:submit` is in the `PARTNER_ADMIN` list (`permissions.ts:65`). The calls are `find, tx, update, approval, audit`, with no job. Implement it with `fixture({ status: 'DRAFT' })` and `f.run('SUBMITTED', 'PARTNER_ADMIN')`.
