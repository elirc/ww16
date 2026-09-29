export const partnerTiers = ["REGISTERED", "SILVER", "GOLD", "PLATINUM"] as const;
export type PartnerTier = (typeof partnerTiers)[number];

export const agreementStatuses = ["PENDING_SIGNATURE", "ACTIVE", "EXPIRED"] as const;
export type AgreementStatus = (typeof agreementStatuses)[number];

export const certificationStatuses = ["ACTIVE", "EXPIRED"] as const;
export type CertificationStatus = (typeof certificationStatuses)[number];

export const dealStatuses = [
  "DRAFT",
  "SUBMITTED",
  "SALES_APPROVED",
  "APPROVED",
  "REJECTED",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
export type DealStatus = (typeof dealStatuses)[number];

export const mdfRequestStatuses = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "REIMBURSED",
] as const;
export type MdfRequestStatus = (typeof mdfRequestStatuses)[number];

export const jobTypes = ["LEADERBOARD_REFRESH"] as const;
export type JobType = (typeof jobTypes)[number];

export const jobStatuses = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as const;
export type JobStatus = (typeof jobStatuses)[number];
