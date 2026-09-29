/**
 * What this file does: issues deal-registration queries with ownership scoping and approval history includes.
 * What calls it: src/services/dealRegistrationService.ts.
 * What it calls: src/lib/db.ts and src/lib/auth/visibility.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: loading a deal by ID first and only checking ownership after the record has already been exposed.
 */
import { db, type DbExecutor } from "@/lib/db";
import { buildOwnedRecordVisibilityFilter } from "@/lib/auth/visibility";
import type { RequestSession } from "@/types/auth";
import type { DealStatus } from "@/types/domain";

type CreateDealInput = {
  id: string;
  partnerOrgId: string;
  createdByUserId: string;
  assignedSalesRepId?: string;
  channelManagerId?: string;
  status: DealStatus;
  endCustomerName: string;
  projectedArr: number;
  closeDate: Date;
  notes?: string;
};

type UpdateDealStatusInput = {
  dealId: string;
  nextStatus: DealStatus;
  rejectionReason?: string;
};

type DealApprovalInput = {
  id: string;
  dealId: string;
  actorUserId: string;
  fromStatus: DealStatus;
  toStatus: DealStatus;
  note?: string;
};

export const dealRepository = {
  async listDeals(
    session: RequestSession,
    filters: { status?: DealStatus },
    executor: DbExecutor = db,
  ) {
    return executor.dealRegistration.findMany({
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
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
          },
        },
        channelManager: {
          select: {
            id: true,
            name: true,
          },
        },
        approvals: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async findVisibleById(session: RequestSession, dealId: string, executor: DbExecutor = db) {
    return executor.dealRegistration.findFirst({
      where: {
        id: dealId,
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
        approvals: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  },

  async createDeal(input: CreateDealInput, executor: DbExecutor = db) {
    return executor.dealRegistration.create({
      data: {
        id: input.id,
        partnerOrgId: input.partnerOrgId,
        createdByUserId: input.createdByUserId,
        assignedSalesRepId: input.assignedSalesRepId,
        channelManagerId: input.channelManagerId,
        status: input.status,
        endCustomerName: input.endCustomerName,
        projectedArr: input.projectedArr,
        closeDate: input.closeDate,
        notes: input.notes,
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

  async updateStatus(input: UpdateDealStatusInput, executor: DbExecutor = db) {
    const transitionTime = new Date();

    return executor.dealRegistration.update({
      where: { id: input.dealId },
      data: {
        status: input.nextStatus,
        submittedAt: input.nextStatus === "SUBMITTED" ? transitionTime : undefined,
        approvedAt: input.nextStatus === "APPROVED" ? transitionTime : undefined,
        closedAt:
          input.nextStatus === "CLOSED_WON" || input.nextStatus === "CLOSED_LOST"
            ? transitionTime
            : undefined,
        rejectionReason: input.nextStatus === "REJECTED" ? input.rejectionReason : null,
      },
    });
  },

  async createApproval(input: DealApprovalInput, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: Approval history should be append-only so investigators can reconstruct who changed a deal and when.
    return executor.dealApproval.create({
      data: input,
    });
  },
};
