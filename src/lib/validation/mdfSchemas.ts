/**
 * What this file does: validates MDF submission, decision, and reimbursement payloads.
 * What calls it: src/app/api/mdf-requests/**/route.ts.
 * What it calls: src/types/domain.ts for the approved MDF statuses.
 * One thing a junior engineer would likely get wrong when writing something similar: treating approval and reimbursement as one step even though finance systems need separate evidence and timestamps.
 */
import { z } from "zod";

export const createMdfRequestSchema = z.object({
  partnerOrgId: z.string().min(3),
  campaignName: z.string().min(3).max(160),
  amountRequested: z.number().positive(),
  plannedStartDate: z.coerce.date(),
  plannedEndDate: z.coerce.date(),
});

export const listMdfRequestsQuerySchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"]).optional(),
});

export const mdfDecisionSchema = z
  .object({
    nextStatus: z.enum(["APPROVED", "REJECTED"]),
    approvedAmount: z.number().positive().optional(),
    rejectionReason: z.string().max(500).optional(),
  })
  .refine(
    (input) => (input.nextStatus === "APPROVED" ? typeof input.approvedAmount === "number" : true),
    {
      path: ["approvedAmount"],
      message: "Approved requests require an approved amount.",
    },
  )
  .refine(
    (input) => (input.nextStatus === "REJECTED" ? Boolean(input.rejectionReason?.trim()) : true),
    {
      path: ["rejectionReason"],
      message: "Rejected requests require a rejection reason.",
    },
  );

export const reimburseMdfRequestSchema = z.object({
  amount: z.number().positive(),
  receiptUrl: z.string().url(),
});
