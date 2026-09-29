/**
 * What this file does: defines the centralized RBAC matrix and the helpers that enforce it.
 * What calls it: routes, services, and domain state machines across src/services and src/domain.
 * What it calls: src/lib/errors.ts for permission failures.
 * One thing a junior engineer would likely get wrong when writing something similar: sprinkling ad hoc `session.role === ...` checks around the codebase until authorization becomes impossible to audit.
 */
import { ForbiddenError } from "@/lib/errors";
import type { RequestSession, UserRole } from "@/types/auth";

export const permissions = [
  "partner:read",
  "partner:manage",
  "deal:read",
  "deal:create",
  "deal:submit",
  "deal:approve_sales",
  "deal:approve_channel",
  "deal:close",
  "mdf:read",
  "mdf:create",
  "mdf:decide",
  "mdf:reimburse",
  "certification:manage",
  "reports:view",
  "jobs:process",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissionMatrix: Record<UserRole, Permission[]> = {
  PLATFORM_ADMIN: [...permissions],
  CHANNEL_MANAGER: [
    "partner:read",
    "partner:manage",
    "deal:read",
    "deal:create",
    "deal:approve_channel",
    "deal:close",
    "mdf:read",
    "certification:manage",
    "reports:view",
  ],
  SALES_REP: [
    "partner:read",
    "deal:read",
    "deal:create",
    "deal:approve_sales",
    "deal:close",
    "mdf:read",
    "reports:view",
  ],
  FINANCE_MANAGER: [
    "partner:read",
    "deal:read",
    "mdf:read",
    "mdf:decide",
    "mdf:reimburse",
    "reports:view",
    "jobs:process",
  ],
  PARTNER_ADMIN: [
    "partner:read",
    "deal:read",
    "deal:create",
    "deal:submit",
    "mdf:read",
    "mdf:create",
    "reports:view",
  ],
  PARTNER_SELLER: ["partner:read", "deal:read", "deal:create", "deal:submit", "mdf:read", "mdf:create"],
};

export function listPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissionMatrix[role];
}

export function hasPermission(session: RequestSession, permission: Permission): boolean {
  return rolePermissionMatrix[session.role].includes(permission);
}

export function assertPermission(session: RequestSession, permission: Permission): void {
  // ⚠️ SENIOR NOTE: Centralized permission checks make it possible to review the blast radius of a role change before shipping it.
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(`Role ${session.role} cannot perform ${permission}.`);
  }
}

export function isInternalRole(role: UserRole): boolean {
  return ["PLATFORM_ADMIN", "CHANNEL_MANAGER", "SALES_REP", "FINANCE_MANAGER"].includes(role);
}
