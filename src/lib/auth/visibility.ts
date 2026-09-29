/**
 * What this file does: translates a session into explicit ownership filters and partner-scoped guardrails.
 * What calls it: repositories and services that read partner-owned records.
 * What it calls: src/lib/auth/permissions.ts and src/lib/errors.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: checking role-based access but forgetting to also scope the actual database query.
 */
import { ForbiddenError } from "@/lib/errors";
import { isInternalRole } from "@/lib/auth/permissions";
import type { RequestSession } from "@/types/auth";

const NO_ACCESS_PARTNER_ORG_ID = "__no_access_partner__";

export function assertPartnerOwnership(session: RequestSession, partnerOrgId: string): void {
  if (!isInternalRole(session.role) && session.partnerOrgId !== partnerOrgId) {
    throw new ForbiddenError("Partner users can only act on their own organization.");
  }
}

export function buildPartnerVisibilityFilter(session: RequestSession): Record<string, unknown> {
  if (isInternalRole(session.role)) {
    return {};
  }

  // This sentinel keeps the query safely empty when a partner user session is malformed and lacks a bound organization.
  return { id: session.partnerOrgId ?? NO_ACCESS_PARTNER_ORG_ID };
}

export function buildOwnedRecordVisibilityFilter(session: RequestSession): Record<string, unknown> {
  if (isInternalRole(session.role)) {
    return {};
  }

  // ⚠️ SENIOR NOTE: Missing this filter on even one repository method becomes a cross-partner data leak.
  return { partnerOrgId: session.partnerOrgId ?? NO_ACCESS_PARTNER_ORG_ID };
}
