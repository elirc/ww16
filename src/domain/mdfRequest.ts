/**
 * What this file does: owns the allowed MDF approval and reimbursement transitions.
 * What calls it: src/services/mdfService.ts.
 * What it calls: src/lib/auth/permissions.ts and src/lib/errors.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: letting reimbursement skip straight past approval because both are handled by finance.
 */
import { assertPermission } from "@/lib/auth/permissions";
import { ConflictError } from "@/lib/errors";
import type { RequestSession } from "@/types/auth";
import type { MdfRequestStatus } from "@/types/domain";

const allowedTransitions: Record<MdfRequestStatus, MdfRequestStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["REIMBURSED"],
  REJECTED: [],
  REIMBURSED: [],
};

export function assertMdfTransitionAllowed(
  session: RequestSession,
  currentStatus: MdfRequestStatus,
  nextStatus: MdfRequestStatus,
): void {
  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new ConflictError(`Cannot move an MDF request from ${currentStatus} to ${nextStatus}.`);
  }

  if (nextStatus === "SUBMITTED") {
    assertPermission(session, "mdf:create");
    return;
  }

  if (nextStatus === "REIMBURSED") {
    assertPermission(session, "mdf:reimburse");
    return;
  }

  // ⚠️ SENIOR NOTE: Approval and rejection should stay under the same finance-owned permission so reporting can reason about a single decision authority.
  assertPermission(session, "mdf:decide");
}
