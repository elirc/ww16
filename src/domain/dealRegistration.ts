/**
 * What this file does: owns the allowed deal-registration state transitions and the role checks attached to each transition.
 * What calls it: src/services/dealRegistrationService.ts.
 * What it calls: src/lib/auth/permissions.ts and src/lib/errors.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: validating only the destination status and forgetting that validity depends on the current status too.
 */
import { assertPermission } from "@/lib/auth/permissions";
import { ConflictError } from "@/lib/errors";
import type { RequestSession } from "@/types/auth";
import type { DealStatus } from "@/types/domain";

const allowedTransitions: Record<DealStatus, DealStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["SALES_APPROVED", "REJECTED"],
  SALES_APPROVED: ["APPROVED", "REJECTED"],
  APPROVED: ["CLOSED_WON", "CLOSED_LOST"],
  REJECTED: [],
  CLOSED_WON: [],
  CLOSED_LOST: [],
};

export function assertDealTransitionAllowed(
  session: RequestSession,
  currentStatus: DealStatus,
  nextStatus: DealStatus,
): void {
  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new ConflictError(`Cannot move a deal from ${currentStatus} to ${nextStatus}.`);
  }

  if (nextStatus === "SUBMITTED") {
    assertPermission(session, "deal:submit");
    return;
  }

  if (nextStatus === "SALES_APPROVED") {
    assertPermission(session, "deal:approve_sales");
    return;
  }

  if (nextStatus === "APPROVED") {
    assertPermission(session, "deal:approve_channel");
    return;
  }

  if (nextStatus === "REJECTED") {
    const permission = currentStatus === "SUBMITTED" ? "deal:approve_sales" : "deal:approve_channel";
    assertPermission(session, permission);
    return;
  }

  // ⚠️ SENIOR NOTE: Close outcomes look simple, but if the same permission later controls forecasting exports, it becomes revenue-sensitive quickly.
  assertPermission(session, "deal:close");
}
