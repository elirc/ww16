# Domain Model

```mermaid
erDiagram
  User ||--o{ DealRegistration : creates
  User ||--o{ DealRegistration : sales_owner
  User ||--o{ DealRegistration : channel_manager
  User ||--o{ MdfRequest : submits
  User ||--o{ MdfReimbursement : processes
  User ||--o{ AuditLog : acts_in
  PartnerOrg ||--o{ User : has_members
  PartnerOrg ||--o{ PartnerAgreement : signs
  PartnerOrg ||--o{ CertificationRecord : earns
  PartnerOrg ||--o{ DealRegistration : registers
  PartnerOrg ||--o{ MdfRequest : requests
  PartnerOrg ||--o{ LeaderboardSnapshot : ranks_in
  CertificationDefinition ||--o{ CertificationRecord : defines
  DealRegistration ||--o{ DealApproval : collects
  MdfRequest ||--|| MdfReimbursement : reimburses
```

## Entity ownership map

- `User`
  Schema/model file: `prisma/schema.prisma` (`model User`)
  Primary service owner: `src/lib/auth/session.ts` via `getRequestSession()` for request identity and `src/lib/auth/permissions.ts` for role capability mapping.
- `PartnerOrg`
  Schema/model file: `prisma/schema.prisma` (`model PartnerOrg`)
  Primary service owner: `src/services/partnerService.ts` via `listPartners()` and `createPartner()`.
- `PartnerAgreement`
  Schema/model file: `prisma/schema.prisma` (`model PartnerAgreement`)
  Primary service owner: `src/services/partnerService.ts` because onboarding creates the first agreement in the same transaction as the partner.
- `CertificationDefinition`
  Schema/model file: `prisma/schema.prisma` (`model CertificationDefinition`)
  Primary service owner: `src/services/certificationService.ts` indirectly consumes definitions when recording partner certifications.
- `CertificationRecord`
  Schema/model file: `prisma/schema.prisma` (`model CertificationRecord`)
  Primary service owner: `src/services/certificationService.ts` via `recordCertification()`.
- `DealRegistration`
  Schema/model file: `prisma/schema.prisma` (`model DealRegistration`)
  Primary service owner: `src/services/dealRegistrationService.ts` via `createDeal()`, `listDeals()`, and `transitionDeal()`.
- `DealApproval`
  Schema/model file: `prisma/schema.prisma` (`model DealApproval`)
  Primary service owner: `src/services/dealRegistrationService.ts`, which appends approval history during `transitionDeal()`.
- `MdfRequest`
  Schema/model file: `prisma/schema.prisma` (`model MdfRequest`)
  Primary service owner: `src/services/mdfService.ts` via `createRequest()`, `decideRequest()`, and `reimburseRequest()`.
- `MdfReimbursement`
  Schema/model file: `prisma/schema.prisma` (`model MdfReimbursement`)
  Primary service owner: `src/services/mdfService.ts` via `reimburseRequest()`.
- `LeaderboardSnapshot`
  Schema/model file: `prisma/schema.prisma` (`model LeaderboardSnapshot`)
  Primary service owner: `src/services/reportingService.ts` via `refreshLeaderboardSnapshot()`.
- `AuditLog`
  Schema/model file: `prisma/schema.prisma` (`model AuditLog`)
  Primary service owner: `src/lib/audit/auditLogger.ts` via `recordAuditEvent()`.
- `BackgroundJob`
  Schema/model file: `prisma/schema.prisma` (`model BackgroundJob`)
  Primary service owner: `src/services/backgroundJobService.ts` via `processDueJobs()`.

## Relationship notes

- `PartnerOrg` is the core ownership anchor for partner-visible data. Deal and MDF records both carry `partnerOrgId`, which is why `src/lib/auth/visibility.ts` can enforce one scoping rule across multiple repositories.
- `DealApproval` is deliberately separate from `DealRegistration` status fields so reviewers can reconstruct the approval path even after the current status changes.
- `MdfReimbursement` is a one-to-one child of `MdfRequest` so finance cannot accidentally create multiple payouts for the same request.
- `LeaderboardSnapshot` is a derived table, not a source-of-truth table. Live computation still exists in `src/services/reportingService.ts`, and the snapshot exists to support async refresh.
