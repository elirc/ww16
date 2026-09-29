/**
 * What this file does: validates certification recording commands before a partner skill record is created.
 * What calls it: src/app/api/partners/[partnerId]/certifications/route.ts.
 * What it calls: src/types/domain.ts for certification state values.
 * One thing a junior engineer would likely get wrong when writing something similar: storing certification dates as opaque strings and making expiration logic much harder later.
 */
import { z } from "zod";

import { certificationStatuses } from "@/types/domain";

export const recordCertificationSchema = z.object({
  definitionId: z.string().min(3),
  status: z.enum(certificationStatuses),
  achievedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});
