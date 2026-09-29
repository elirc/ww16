/**
 * What this file does: issues MDF queries with partner visibility and reimbursement includes.
 * What calls it: src/services/mdfService.ts.
 * What it calls: src/lib/db.ts and src/lib/auth/visibility.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: updating the request and reimbursement separately without a transaction.
 */
import { db, type DbExecutor } from "@/lib/db";
import { buildOwnedRecordVisibilityFilter } from "@/lib/auth/visibility";
import type { RequestSession } from "@/types/auth";
import type { MdfRequestStatus } from "@/types/domain";

type CreateMdfRequestInput = {
  id: string;
  partnerOrgId: string;
  submittedByUserId: string;
  campaignName: string;
  amountRequested: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
};

type DecideMdfRequestInput = {
  requestId: string;
  nextStatus: "APPROVED" | "REJECTED";
  approvedAmount?: number;
  rejectionReason?: string;
};

type ReimbursementInput = {
  id: string;
  requestId: string;
  reimbursedByUserId: string;
  amount: number;
  receiptUrl: string;
  reimbursedAt: Date;
};

export const mdfRepository = {
  async listRequests(
    session: RequestSession,
    filters: { status?: MdfRequestStatus },
    executor: DbExecutor = db,
  ) {
    return executor.mdfRequest.findMany({
      where: {
        ...buildOwnedRecordVisibilityFilter(session),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        partnerOrg: {
          select: {
            name: true,
            tier: true,
          },
        },
        reimbursement: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async findVisibleById(session: RequestSession, requestId: string, executor: DbExecutor = db) {
    return executor.mdfRequest.findFirst({
      where: {
        id: requestId,
        ...buildOwnedRecordVisibilityFilter(session),
      },
      include: {
        partnerOrg: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
        reimbursement: true,
      },
    });
  },

  async createRequest(input: CreateMdfRequestInput, executor: DbExecutor = db) {
    return executor.mdfRequest.create({
      data: {
        id: input.id,
        partnerOrgId: input.partnerOrgId,
        submittedByUserId: input.submittedByUserId,
        campaignName: input.campaignName,
        amountRequested: input.amountRequested,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      include: {
        partnerOrg: {
          select: {
            name: true,
            tier: true,
          },
        },
      },
    });
  },

  async decideRequest(input: DecideMdfRequestInput, executor: DbExecutor = db) {
    return executor.mdfRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.nextStatus,
        approvedAmount: input.nextStatus === "APPROVED" ? input.approvedAmount : null,
        rejectionReason: input.nextStatus === "REJECTED" ? input.rejectionReason : null,
        decidedAt: new Date(),
      },
    });
  },

  async markReimbursed(requestId: string, executor: DbExecutor = db) {
    return executor.mdfRequest.update({
      where: { id: requestId },
      data: {
        status: "REIMBURSED",
      },
    });
  },

  async createReimbursement(input: ReimbursementInput, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: The one-to-one reimbursement model prevents multiple finance users from accidentally paying the same request twice.
    return executor.mdfReimbursement.create({
      data: input,
    });
  },
};
