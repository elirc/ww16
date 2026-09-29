# Testing Rationale

These tests are intentionally small, but each one protects a class of production bug that would be painful in a real partner platform.

## `tests/auth/createAuthedRoute.test.ts` — rejects a protected endpoint when the acting role lacks the required permission
This is worth a test because `src/lib/http/route-handlers.ts` is the shared gateway for every protected route. If that wrapper stops enforcing `assertPermission()` correctly, the failure is systemic, not local to one endpoint.

The specific production failure being guarded against is privilege escalation on operational or finance endpoints such as `src/app/api/jobs/process/route.ts`. A role-matrix edit or wrapper refactor could quietly let the wrong role run admin workflows.

A more thorough production suite would also test:
- authenticated success for an allowed role
- unauthenticated failure when `getRequestSession()` cannot resolve a user
- one or two real routes end to end, not just the shared wrapper

## `tests/validation/dealSchemas.test.ts` — rejects a negative ARR value at the validation boundary
This is worth a test because money-like inputs become trusted by approval workflows and reporting once they cross the API boundary. `src/lib/validation/dealSchemas.ts` is the first place bad numeric input can be stopped cheaply.

The production failure being guarded against is corrupted pipeline data. A malformed integration or broken frontend could create negative ARR values, and downstream code in `src/services/dealRegistrationService.ts` would otherwise treat them as legitimate.

A more thorough production suite would also test:
- invalid close-date formats
- overly long notes
- rejection payloads missing `rejectionReason`

## `tests/services/dealRegistrationDomain.test.ts` — blocks an invalid jump from draft straight to approved
This is worth a test because `src/domain/dealRegistration.ts` is the pure workflow gate for the most important multi-actor process in the app. If this file becomes permissive, every route or job that reuses it inherits the bug.

The production failure being guarded against is approval bypass. A shortcut from `DRAFT` to `APPROVED` would destroy the meaning of the sales and channel review stages and make the audit history misleading.

A more thorough production suite would also test:
- valid happy-path transitions for each role
- forbidden transitions for the wrong role at the same current status
- service-level transaction behavior around approval-history writes

## `tests/repositories/visibility.test.ts` — scopes partner users to only their own `partnerOrgId`
This is worth a test because `src/lib/auth/visibility.ts` is the shared source for partner data isolation in `src/repositories/dealRepository.ts` and `src/repositories/mdfRepository.ts`. A regression here is a cross-account data leak, not just a UI bug.

The production failure being guarded against is partner portal overexposure. If a partner session stops emitting the right filter, repositories can start returning other partners’ deal and MDF data even while role checks still “look correct.”

A more thorough production suite would also test:
- repository calls with seeded database data to prove cross-partner rows are not returned
- partner create flows rejecting tampered `partnerOrgId` payloads in `src/services/dealRegistrationService.ts` and `src/services/mdfService.ts`
- future tenant-aware filters if the app is later extended to full multi-tenancy
