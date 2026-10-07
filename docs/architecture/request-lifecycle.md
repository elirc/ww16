# Request Lifecycle

Request: Create a new partner organization from the admin portal
1. `src/app/api/partners/route.ts` — `POST` is the HTTP entry file and delegates execution to `createAuthedRoute(...)`.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the session through `getRequestSession()` and verifies `partner:manage`.
3. `src/lib/validation/partnerSchemas.ts` — `createPartnerSchema` enforces the slug, tier, agreement status, and date fields inside the route handler body.
4. `src/services/partnerService.ts` — `createPartner()` opens a transaction, generates IDs, and records `partner.created`.
5. `src/repositories/partnerRepository.ts` — `createPartner()` inserts `PartnerOrg` and nested `PartnerAgreement` rows in one write.
6. Returns `201` with `{ data: PartnerOrg & { agreements: PartnerAgreement[] } }`

Request: Move a submitted deal through channel approval
1. `src/app/api/deals/[dealId]/transition/route.ts` — `POST` is the HTTP entry file and delegates to `createAuthedRoute(...)`.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` authenticates the caller but leaves the exact transition authorization to the domain/service layer.
3. `src/lib/validation/dealSchemas.ts` — `dealTransitionSchema.parse()` enforces valid status names and requires `rejectionReason` for rejected transitions inside the route handler body.
4. `src/services/dealRegistrationService.ts` — `transitionDeal()` loads the visible deal, calls `assertDealTransitionAllowed()`, starts a transaction, and records audit data.
5. `src/repositories/dealRepository.ts` — `updateStatus()` updates the canonical status row and `createApproval()` appends immutable approval history.
6. Returns `200` with `{ data: DealRegistration }`

Request: Reimburse an approved MDF request
1. `src/app/api/mdf-requests/[requestId]/reimburse/route.ts` — `POST` is the HTTP entry file and delegates to `createAuthedRoute(...)`.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` authenticates the caller and checks `mdf:reimburse` before business logic runs.
3. `src/lib/validation/mdfSchemas.ts` — `reimburseMdfRequestSchema.parse()` validates payout amount and receipt URL inside the route handler body.
4. `src/services/mdfService.ts` — `reimburseRequest()` reloads the request, checks `assertMdfTransitionAllowed()`, verifies the reimbursement does not exceed `approvedAmount`, and opens a transaction.
5. `src/repositories/mdfRepository.ts` — `markReimbursed()` updates the request status and `createReimbursement()` inserts the one-to-one payout record.
6. Returns `201` with `{ data: MdfReimbursement }`

Request: Sales rep attempts to process background jobs without permission
1. `src/app/api/jobs/process/route.ts` — `POST` is the operator endpoint for queued jobs.
2. `src/lib/http/route-handlers.ts` — `createAuthedRoute()` resolves the session and sees that the route requires `jobs:process`.
3. `src/lib/auth/permissions.ts` — `assertPermission()` throws `ForbiddenError` because `SALES_REP` is not mapped to `jobs:process`.
4. `src/services/backgroundJobService.ts` — not reached because the permission rejection happens first.
5. `src/repositories/backgroundJobRepository.ts` — not reached because the request never enters the service layer.
6. Returns `403` with `{ error, code: "FORBIDDEN", details: null }`

## Ordering and failure details for the deal transition

- `transitionDeal` reads the deal **before** opening the transaction (`dealRegistrationService.ts:91` vs `:99`). A concurrent approver can change the status between that read and the update, and the update does not re-check the status (`dealRepository.ts:134`).
- Policy failures (409 for an illegal edge, 403 for a missing permission) happen before the transaction opens, so they write nothing.
- Failures inside the transaction (update, approval, audit, job) reject the `$transaction` callback. Prisma then rolls back the whole unit. This has not been executed against a database in this repo. The runtime lab under `astraupskill/` uses a non-rolling-back double.

## Error envelope

Every route uses `createAuthedRoute`, so every failure has the shape `{ error, code, details }` (`src/lib/http/route-handlers.ts:44-51`):

| Thrown | Status | `code` |
|---|---|---|
| `UnauthorizedError` (unknown demo user) | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `ZodError` | 400 | `VALIDATION_ERROR` (`details` = `flatten()`) |
| anything else, including Prisma errors and malformed JSON | 500 | `INTERNAL_SERVER_ERROR` |
