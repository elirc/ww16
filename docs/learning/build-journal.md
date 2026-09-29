# Build Journal

## Build stages

### Stage 1 — Project framing
Built: the core architecture shape and stack direction.
Decisions: use Next.js, TypeScript, PostgreSQL, Prisma, Tailwind, Zod, React Query, and REST; skip full multi-tenancy for now.
Why: the learning target is backend-oriented CRUD architecture with explicit workflow and security boundaries, not infrastructure complexity for its own sake.

### Stage 2 — Domain and schema
Built: `prisma/schema.prisma`, `src/types/auth.ts`, and `src/types/domain.ts`.
Decisions: model workflow artifacts as first-class tables (`DealApproval`, `MdfReimbursement`, `AuditLog`, `BackgroundJob`) instead of hiding them in parent rows.
Why: enterprise CRUD systems become unreadable fast when important state transitions are only implied.

### Stage 3 — Auth, permissions, and request boundary
Built: `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`, `src/lib/auth/visibility.ts`, `src/lib/http/route-handlers.ts`, and the validation schemas in `src/lib/validation/*.ts`.
Decisions: centralize session loading and RBAC in shared modules, and keep partner scoping explicit at the query layer.
Why: this is the load-bearing security boundary of the whole app.

### Stage 4 — Core workflows
Built: partner, certification, deal, and MDF repositories plus services in `src/repositories/*.ts` and `src/services/*.ts`, along with the REST routes in `src/app/api/**/route.ts`.
Decisions: services own transactions and side effects; repositories own Prisma code; domain files own workflow rules.
Why: this keeps the request lifecycle reviewable and reusable.

### Stage 5 — Reporting and async operations
Built: `src/repositories/reportingRepository.ts`, `src/services/reportingService.ts`, `src/repositories/backgroundJobRepository.ts`, and `src/services/backgroundJobService.ts`.
Decisions: compute leaderboard rows live when needed, but persist snapshots through queued jobs when possible.
Why: it demonstrates an async pattern without requiring external queue infrastructure.

### Stage 6 — UI, tests, and learning docs
Built: dashboard pages, client hooks, focused Vitest tests, and the docs under `docs/architecture` and `docs/learning`.
Decisions: keep the UI thin and make the docs trace real files and function names.
Why: the primary teaching artifact should be the backend path, not flashy frontend scaffolding.

## Major decisions

### Decision 1 — Prisma vs Drizzle vs hand-rolled SQL
Why this matters: the data layer has many related entities, enums, and transaction-heavy workflows.

Options:
- Prisma
  Pros: strong schema readability, familiar relation mapping, good fit for transactional CRUD and educational docs.
  Cons: abstraction cost and less SQL transparency than hand-written queries.
  Future pain: some reporting queries may eventually want raw SQL for performance.
- Drizzle
  Pros: more SQL-shaped, lighter mental model for some teams, strong typing.
  Cons: less declarative for a learning project that needs a very readable central schema file.
  Future pain: junior readers often need more SQL fluency sooner.
- Hand-rolled SQL or query builder only
  Pros: maximal control and visibility.
  Cons: too much incidental complexity for this project’s teaching goals.
  Future pain: higher maintenance burden and more boilerplate around transactions and relations.

Choice: Prisma.
Why this option won: `prisma/schema.prisma` becomes a readable map of the whole product, and the repositories stay focused on query intent instead of boilerplate.
What junior/mid/senior engineers notice differently:
- Junior: “I can see the whole domain in one file.”
- Mid: “The transaction-heavy services are easier to wire because the repository calls are straightforward.”
- Senior: “The reporting layer may need optimization later, but the current choice keeps the architecture legible while the product surface is still evolving.”

### Decision 2 — REST vs tRPC vs GraphQL
Why this matters: the API boundary determines how easy it is to trace requests, integrate with non-React clients, and document workflows.

Options:
- REST
  Pros: explicit endpoint boundaries, easy request tracing, good fit for partner ecosystems and external integrations.
  Cons: more route files and some duplicated transport shapes.
  Future pain: lots of endpoints if the product grows significantly.
- tRPC
  Pros: strong end-to-end typing and great developer experience inside a TypeScript-only app.
  Cons: the transport boundary becomes less visible to learners and less representative of typical enterprise partner integrations.
  Future pain: less natural if external systems need to call the same workflows.
- GraphQL
  Pros: flexible read shapes.
  Cons: extra schema/resolver complexity for a workflow-heavy CRUD app.
  Future pain: authorization and mutation review become harder if the team is not already deeply comfortable with GraphQL.

Choice: REST.
Why this option won: the project requirements emphasize request tracing and reviewable backend boundaries, and REST route files make that very concrete.
What junior/mid/senior engineers notice differently:
- Junior: “I can follow the path from page to hook to route to service.”
- Mid: “The route files are thin, so REST isn’t causing business logic duplication.”
- Senior: “The explicit transport boundary will age well if this product ever needs admin scripts, integrations, or partner-facing API clients.”

### Decision 3 — Full multi-tenancy vs single vendor deployment with partner scoping vs no scoping
Why this matters: data isolation is a security concern, but complexity should match the project goal.

Options:
- Full multi-tenancy
  Pros: realistic SaaS isolation model.
  Cons: more columns, more policy surfaces, more docs overhead, and more ways for a learning project to become noisy.
  Future pain: every repository query becomes tenant-aware immediately.
- Single vendor deployment with partner scoping
  Pros: still teaches explicit ownership isolation without turning every file into tenancy plumbing.
  Cons: not the full SaaS story.
  Future pain: adding `tenantId` later still requires disciplined repository updates.
- No scoping beyond roles
  Pros: simplest implementation.
  Cons: unrealistic and insecure for a partner portal.
  Future pain: would require a redesign later, not an extension.

Choice: single vendor deployment with explicit partner scoping.
Why this option won: it keeps the important security lesson real by enforcing `partnerOrgId` visibility, while leaving room to teach future tenantization in `docs/architecture/auth-and-permissions.md`.
What junior/mid/senior engineers notice differently:
- Junior: “I only need to understand one axis of scoping right now.”
- Mid: “The scoping helper functions are centralized and would be the natural place to extend later.”
- Senior: “The architecture preserves a clean migration path to multi-tenancy instead of blocking it.”

### Decision 4 — Synchronous reporting refresh vs DB-backed jobs vs external queue
Why this matters: deal approval and MDF reimbursement both trigger leaderboard changes, and those side effects need a home.

Options:
- Synchronous recompute in the request
  Pros: simplest mental model.
  Cons: couples approval latency to reporting work and hides async concerns.
  Future pain: expensive report updates slow down user workflows.
- DB-backed job table
  Pros: demonstrates async architecture using the existing stack; easy to inspect and document.
  Cons: simpler than a production queue and still needs an operator/scheduler call.
  Future pain: limited retry and concurrency features compared with dedicated queue systems.
- External queue infrastructure
  Pros: production-grade async capabilities.
  Cons: too much infrastructure surface for this learning target.
  Future pain: more setup than the project needs right now.

Choice: DB-backed job table.
Why this option won: it teaches job lifecycle thinking with `BackgroundJob` and `backgroundJobService.processDueJobs()` without overwhelming the rest of the architecture.
What junior/mid/senior engineers notice differently:
- Junior: “Async work is still just code with state transitions.”
- Mid: “The request path stays fast because reporting work is decoupled.”
- Senior: “This is a good pedagogical midpoint before adopting external queue infrastructure.”

## PR slices

### Slice 1 — Core schema and shared boundaries
Purpose: establish the domain model, request session shape, RBAC matrix, and route wrapper.
Files containing novel logic:
- `prisma/schema.prisma`
- `src/types/auth.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/visibility.ts`
- `src/lib/http/route-handlers.ts`
- `src/lib/validation/dealSchemas.ts`
- `src/lib/validation/mdfSchemas.ts`
Reviewer focus:
- `src/lib/auth/permissions.ts`: verify `rolePermissionMatrix` near the top and `assertPermission()` near the bottom match the intended role model.
- `src/lib/auth/visibility.ts`: verify the partner-user filters and the sentinel fallback in the middle of the file.
- `src/lib/http/route-handlers.ts`: verify every route gets the same session and error lifecycle through `createAuthedRoute()`.
What a junior reviewer might approve without questioning: route-level role checks alone, without noticing whether repository queries also scope partner-owned data.

### Slice 2 — Partner onboarding and certification tracking
Purpose: implement partner CRUD-adjacent flows and their audit trail.
Files containing novel logic:
- `src/repositories/partnerRepository.ts`
- `src/repositories/certificationRepository.ts`
- `src/services/partnerService.ts`
- `src/services/certificationService.ts`
- `src/app/api/partners/route.ts`
- `src/app/api/partners/[partnerId]/certifications/route.ts`
Reviewer focus:
- `src/services/partnerService.ts`: verify the onboarding transaction and `partner.created` audit event near the middle.
- `src/repositories/partnerRepository.ts`: verify partner visibility scoping in `listPartners()` and `findVisibleById()`.
- `src/services/certificationService.ts`: verify partner access is checked before the certification write.
What a junior reviewer might approve without questioning: recording a certification directly by `partnerId` without proving the caller can act on that partner.

### Slice 3 — Deal registration workflow
Purpose: implement the highest-value multi-actor workflow with approval history and reporting side effects.
Files containing novel logic:
- `src/domain/dealRegistration.ts`
- `src/repositories/dealRepository.ts`
- `src/services/dealRegistrationService.ts`
- `src/app/api/deals/route.ts`
- `src/app/api/deals/[dealId]/transition/route.ts`
- `src/hooks/useDeals.ts`
- `src/app/(dashboard)/deals/page.tsx`
Reviewer focus:
- `src/domain/dealRegistration.ts`: verify allowed transitions and permission mapping near the top and middle.
- `src/services/dealRegistrationService.ts`: verify the transaction in `transitionDeal()` and the job enqueue for `APPROVED` deals near the bottom half.
- `src/repositories/dealRepository.ts`: verify `findVisibleById()` scopes the query instead of checking visibility after the fetch.
What a junior reviewer might approve without questioning: a status update that does not also append approval history.

### Slice 4 — MDF finance workflow
Purpose: implement finance decisioning, payout recording, and payout safety checks.
Files containing novel logic:
- `src/domain/mdfRequest.ts`
- `src/repositories/mdfRepository.ts`
- `src/services/mdfService.ts`
- `src/app/api/mdf-requests/route.ts`
- `src/app/api/mdf-requests/[requestId]/decision/route.ts`
- `src/app/api/mdf-requests/[requestId]/reimburse/route.ts`
- `src/hooks/useMdfRequests.ts`
- `src/app/(dashboard)/mdf/page.tsx`
Reviewer focus:
- `src/services/mdfService.ts`: verify `approvedAmount` is reloaded and checked before reimbursement in `reimburseRequest()`.
- `src/domain/mdfRequest.ts`: verify `APPROVED -> REIMBURSED` is the only reimbursement path.
- `src/repositories/mdfRepository.ts`: verify reimbursement is modeled one-to-one with the request.
What a junior reviewer might approve without questioning: letting the client decide the approved amount at reimbursement time.

### Slice 5 — Reporting, jobs, tests, and learning docs
Purpose: add operational reporting, async job processing, focused tests, and code-anchored documentation.
Files containing novel logic:
- `src/repositories/reportingRepository.ts`
- `src/services/reportingService.ts`
- `src/repositories/backgroundJobRepository.ts`
- `src/services/backgroundJobService.ts`
- `src/app/api/reports/leaderboard/route.ts`
- `src/app/api/jobs/process/route.ts`
- `tests/auth/createAuthedRoute.test.ts`
- `tests/services/dealRegistrationDomain.test.ts`
- `tests/repositories/visibility.test.ts`
- `tests/validation/dealSchemas.test.ts`
Reviewer focus:
- `src/repositories/reportingRepository.ts`: verify quarter-bounded deal and reimbursement filters in `listPartnerMetricInputs()`.
- `src/services/backgroundJobService.ts`: verify jobs move through `RUNNING` to `SUCCEEDED` or `FAILED`.
- `tests/auth/createAuthedRoute.test.ts`: verify the wrong-role rejection protects the shared route wrapper rather than a single endpoint implementation detail.
What a junior reviewer might approve without questioning: a leaderboard query that counts reimbursements from outside the requested quarter.
