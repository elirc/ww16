export const userRoles = [
  "PLATFORM_ADMIN",
  "CHANNEL_MANAGER",
  "SALES_REP",
  "FINANCE_MANAGER",
  "PARTNER_ADMIN",
  "PARTNER_SELLER",
] as const;

export type UserRole = (typeof userRoles)[number];

export type RequestSession = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  partnerOrgId: string | null;
};
