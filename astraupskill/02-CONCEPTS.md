# Concepts

## 1. A workflow edge has two dimensions

`assertDealTransitionAllowed` (`src/domain/dealRegistration.ts:22-54`) checks **adjacency** first (lines 27-29, a `ConflictError` with status 409) and **role** second (`assertPermission`, a `ForbiddenError` with status 403). The order matters for error semantics. A partner seller asking for `SUBMITTED → APPROVED` gets 409, not 403, because the edge does not exist for anyone.

The edge-to-permission table, from lines 31-53:

| Target | Permission | Roles holding it (`permissions.ts:30-71`) |
|---|---|---|
| SUBMITTED | `deal:submit` | PLATFORM_ADMIN, PARTNER_ADMIN, PARTNER_SELLER |
| SALES_APPROVED | `deal:approve_sales` | PLATFORM_ADMIN, SALES_REP |
| APPROVED | `deal:approve_channel` | PLATFORM_ADMIN, CHANNEL_MANAGER |
| REJECTED from SUBMITTED | `deal:approve_sales` | PLATFORM_ADMIN, SALES_REP |
| REJECTED from SALES_APPROVED | `deal:approve_channel` | PLATFORM_ADMIN, CHANNEL_MANAGER |
| CLOSED_WON / CLOSED_LOST | `deal:close` | PLATFORM_ADMIN, CHANNEL_MANAGER, SALES_REP |

## 2. Role, but not assignment

`DealRegistration` carries `assignedSalesRepId` and `channelManagerId` (repository input, `dealRepository.ts:16-17`). The policy never reads them. Any `SALES_REP` can sales-approve any deal, and internal roles see every deal (`visibility.ts:28-31`). Compare the relationship-based rules in other projects of this series. Here, authorization is purely role plus tenant.

## 3. Pre-read outside the transaction (stale observation)

The service reads `currentDeal` with the default client (line 91), then decides, then opens the transaction (line 99). The decision is based on a snapshot. Two sales reps who both read `SUBMITTED` will both pass the policy. Each transaction then runs `update({ where: { id } })`, which succeeds whatever the current status is (`dealRepository.ts:133-145`), and each writes an approval row with `fromStatus: SUBMITTED`. The history ends up with two `SUBMITTED → SALES_APPROVED` rows.

Grouping the writes in a transaction does **not** compare the old status at write time. Remedies, each of which needs a provider-backed test:

- a conditional `updateMany({ where: { id, status: currentDeal.status } })` that checks `count === 1`
- a `version` column
- moving the read inside the transaction with a row lock

## 4. History, audit, and jobs are different things

- **Approval history** (`dealApproval`) is domain evidence of who moved the deal between which states, with a note.
- **Audit** (`recordAuditEvent`, `src/lib/audit/auditLogger.ts:20-37`) is an operational record that also stores `actorRole`.
- **The background job** is a persisted request for future work. Inserting it proves nothing ran. `backgroundJobService.processDueJobs` (`src/services/backgroundJobService.ts:12-43`) picks it up later when someone with `jobs:process` (only `PLATFORM_ADMIN` and `FINANCE_MANAGER`) calls `POST /api/jobs/process`.

None of the three is a lock.

## 5. Quarter at approval time

The job payload stores `currentQuarterLabel(new Date())` (line 142). That is the quarter in which the deal was **approved**, in UTC, not the quarter of its `closeDate`. A deal approved on 31 March at 23:30 in UTC-5 is already in Q2 in UTC.

## Self-check

**Goal:** Predict the outcome for `CHANNEL_MANAGER` requesting `SUBMITTED → APPROVED`.
**Check:** 409, from the adjacency check (line 28), before any permission is consulted. Confirm it against the refusal matrix at `tests/deal-transition-lab.test.mjs:29`, the second tuple. The recorded calls are just `['find']`.
