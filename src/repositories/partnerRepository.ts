/**
 * What this file does: issues partner-organization and agreement queries with session-aware visibility.
 * What calls it: src/services/partnerService.ts, src/services/dealRegistrationService.ts, and src/services/certificationService.ts.
 * What it calls: src/lib/db.ts and src/lib/auth/visibility.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: writing an unrestricted `findUnique` for a partner-owned record because the caller already "checked the role."
 */
import { db, type DbExecutor } from "@/lib/db";
import { buildPartnerVisibilityFilter } from "@/lib/auth/visibility";
import type { RequestSession } from "@/types/auth";

type CreatePartnerInput = {
  id: string;
  agreementId: string;
  name: string;
  slug: string;
  tier: "REGISTERED" | "SILVER" | "GOLD" | "PLATINUM";
  agreementStatus: "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED";
  portalAccessEnabled: boolean;
  agreementEffectiveDate: Date;
  agreementRenewalDate: Date;
};

export const partnerRepository = {
  async listPartners(
    session: RequestSession,
    filters: { tier?: "REGISTERED" | "SILVER" | "GOLD" | "PLATINUM" },
    executor: DbExecutor = db,
  ) {
    return executor.partnerOrg.findMany({
      where: {
        ...buildPartnerVisibilityFilter(session),
        ...(filters.tier ? { tier: filters.tier } : {}),
      },
      include: {
        agreements: {
          orderBy: {
            effectiveDate: "desc",
          },
          take: 1,
        },
        certificationRecords: {
          where: { status: "ACTIVE" },
          include: {
            definition: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            deals: true,
            mdfRequests: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  },

  async findVisibleById(session: RequestSession, partnerId: string, executor: DbExecutor = db) {
    return executor.partnerOrg.findFirst({
      where: {
        id: partnerId,
        ...buildPartnerVisibilityFilter(session),
      },
      include: {
        agreements: {
          orderBy: {
            effectiveDate: "desc",
          },
          take: 1,
        },
      },
    });
  },

  async createPartner(input: CreatePartnerInput, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: Nested agreement creation keeps the agreement row from drifting out of sync with the partner it belongs to.
    return executor.partnerOrg.create({
      data: {
        id: input.id,
        name: input.name,
        slug: input.slug,
        tier: input.tier,
        agreementStatus: input.agreementStatus,
        portalAccessEnabled: input.portalAccessEnabled,
        agreements: {
          create: {
            id: input.agreementId,
            status: input.agreementStatus,
            effectiveDate: input.agreementEffectiveDate,
            renewalDate: input.agreementRenewalDate,
            commercialTerms: {
              programTier: input.tier,
            },
          },
        },
      },
      include: {
        agreements: true,
      },
    });
  },
};
