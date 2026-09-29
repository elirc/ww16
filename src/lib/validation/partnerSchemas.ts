/**
 * What this file does: validates partner-organization creation payloads and list filters at the HTTP boundary.
 * What calls it: src/app/api/partners/route.ts.
 * What it calls: src/types/domain.ts for allowed enum values.
 * One thing a junior engineer would likely get wrong when writing something similar: validating only required fields and forgetting enum or slug constraints that keep the dataset queryable.
 */
import { z } from "zod";

import { agreementStatuses, partnerTiers } from "@/types/domain";

export const createPartnerSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens."),
  tier: z.enum(partnerTiers),
  agreementStatus: z.enum(agreementStatuses),
  portalAccessEnabled: z.boolean().default(true),
  agreementEffectiveDate: z.coerce.date(),
  agreementRenewalDate: z.coerce.date(),
});

export const listPartnersQuerySchema = z.object({
  tier: z.enum(partnerTiers).optional(),
});
