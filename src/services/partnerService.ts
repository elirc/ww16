/**
 * What this file does: owns partner onboarding and partner-list read behavior.
 * What calls it: src/app/api/partners/route.ts.
 * What it calls: src/lib/auth/permissions.ts, src/repositories/partnerRepository.ts, and src/lib/audit/auditLogger.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: putting onboarding side effects in the route instead of keeping the transaction and audit logic in one service.
 */
import { randomUUID } from "node:crypto";

import { assertPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordAuditEvent } from "@/lib/audit/auditLogger";
import { partnerRepository } from "@/repositories/partnerRepository";
import type { RequestSession } from "@/types/auth";

type CreatePartnerInput = {
  name: string;
  slug: string;
  tier: "REGISTERED" | "SILVER" | "GOLD" | "PLATINUM";
  agreementStatus: "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED";
  portalAccessEnabled: boolean;
  agreementEffectiveDate: Date;
  agreementRenewalDate: Date;
};

export const partnerService = {
  async listPartners(
    session: RequestSession,
    filters: { tier?: "REGISTERED" | "SILVER" | "GOLD" | "PLATINUM" },
  ) {
    assertPermission(session, "partner:read");
    return partnerRepository.listPartners(session, filters);
  },

  async createPartner(session: RequestSession, input: CreatePartnerInput) {
    assertPermission(session, "partner:manage");

    return db.$transaction(async (tx) => {
      const partner = await partnerRepository.createPartner(
        {
          id: randomUUID(),
          agreementId: randomUUID(),
          ...input,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "PartnerOrg",
          entityId: partner.id,
          action: "partner.created",
          metadata: {
            slug: partner.slug,
            tier: partner.tier,
          },
        },
        tx,
      );

      return partner;
    });
  },

  async getPartner(session: RequestSession, partnerId: string) {
    const partner = await partnerRepository.findVisibleById(session, partnerId);

    if (!partner) {
      throw new NotFoundError("Partner account was not found.");
    }

    // ⚠️ SENIOR NOTE: Even simple `getById` helpers should stay in the service layer so visibility and later cross-cutting concerns stay consistent.
    return partner;
  },
};
