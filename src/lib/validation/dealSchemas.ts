/**
 * What this file does: validates deal registration payloads and transition commands before business logic runs.
 * What calls it: src/app/api/deals/route.ts and src/app/api/deals/[dealId]/transition/route.ts.
 * What it calls: src/types/domain.ts for valid status names.
 * One thing a junior engineer would likely get wrong when writing something similar: allowing state-transition fields through without conditional validation for rejection cases.
 */
import { z } from "zod";

import { dealStatuses } from "@/types/domain";

export const createDealSchema = z.object({
  partnerOrgId: z.string().min(3),
  endCustomerName: z.string().min(2).max(160),
  projectedArr: z.number().positive(),
  closeDate: z.coerce.date(),
  notes: z.string().max(1500).optional(),
  assignedSalesRepId: z.string().min(3).optional(),
  channelManagerId: z.string().min(3).optional(),
});

export const listDealsQuerySchema = z.object({
  status: z.enum(dealStatuses).optional(),
});

export const dealTransitionSchema = z
  .object({
    nextStatus: z.enum(dealStatuses),
    note: z.string().max(1500).optional(),
    rejectionReason: z.string().max(500).optional(),
  })
  .refine(
    (input) => (input.nextStatus === "REJECTED" ? Boolean(input.rejectionReason?.trim()) : true),
    {
      message: "A rejection reason is required when rejecting a deal.",
      path: ["rejectionReason"],
    },
  );
