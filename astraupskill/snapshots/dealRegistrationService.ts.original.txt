/**
 * What this file does: owns deal CRUD, approval transitions, and the side effects that follow approved deals.
 * What calls it: src/app/api/deals/route.ts and src/app/api/deals/[dealId]/transition/route.ts.
 * What it calls: domain state rules, partner visibility checks, repositories, audit logging, and background job creation.
 * One thing a junior engineer would likely get wrong when writing something similar: updating the deal status without writing approval history or enqueueing downstream reporting work.
 */
import { randomUUID } from "node:crypto";

import { assertPermission } from "@/lib/auth/permissions";
import { assertPartnerOwnership } from "@/lib/auth/visibility";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordAuditEvent } from "@/lib/audit/auditLogger";
import { currentQuarterLabel } from "@/lib/time";
import { assertDealTransitionAllowed } from "@/domain/dealRegistration";
import { backgroundJobRepository } from "@/repositories/backgroundJobRepository";
import { dealRepository } from "@/repositories/dealRepository";
import { partnerRepository } from "@/repositories/partnerRepository";
import type { RequestSession } from "@/types/auth";
import type { DealStatus } from "@/types/domain";

type CreateDealInput = {
  partnerOrgId: string;
  endCustomerName: string;
  projectedArr: number;
  closeDate: Date;
  notes?: string;
  assignedSalesRepId?: string;
  channelManagerId?: string;
};

type TransitionDealInput = {
  nextStatus: DealStatus;
  note?: string;
  rejectionReason?: string;
};

export const dealRegistrationService = {
  async listDeals(session: RequestSession, filters: { status?: DealStatus }) {
    assertPermission(session, "deal:read");
    return dealRepository.listDeals(session, filters);
  },

  async createDeal(session: RequestSession, input: CreateDealInput) {
    assertPermission(session, "deal:create");
    assertPartnerOwnership(session, input.partnerOrgId);

    const partner = await partnerRepository.findVisibleById(session, input.partnerOrgId);

    if (!partner) {
      throw new NotFoundError("Partner account was not found for this deal.");
    }

    return db.$transaction(async (tx) => {
      const deal = await dealRepository.createDeal(
        {
          id: randomUUID(),
          partnerOrgId: input.partnerOrgId,
          createdByUserId: session.userId,
          assignedSalesRepId: input.assignedSalesRepId,
          channelManagerId: input.channelManagerId,
          status: "DRAFT",
          endCustomerName: input.endCustomerName,
          projectedArr: input.projectedArr,
          closeDate: input.closeDate,
          notes: input.notes,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "DealRegistration",
          entityId: deal.id,
          action: "deal.created",
          metadata: {
            partnerOrgId: deal.partnerOrgId,
            endCustomerName: deal.endCustomerName,
            status: deal.status,
          },
        },
        tx,
      );

      return deal;
    });
  },

  async transitionDeal(session: RequestSession, dealId: string, input: TransitionDealInput) {
    const currentDeal = await dealRepository.findVisibleById(session, dealId);

    if (!currentDeal) {
      throw new NotFoundError("Deal registration was not found.");
    }

    assertDealTransitionAllowed(session, currentDeal.status, input.nextStatus);

    return db.$transaction(async (tx) => {
      const updatedDeal = await dealRepository.updateStatus(
        {
          dealId,
          nextStatus: input.nextStatus,
          rejectionReason: input.rejectionReason,
        },
        tx,
      );

      await dealRepository.createApproval(
        {
          id: randomUUID(),
          dealId,
          actorUserId: session.userId,
          fromStatus: currentDeal.status,
          toStatus: input.nextStatus,
          note: input.note ?? input.rejectionReason,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "DealRegistration",
          entityId: dealId,
          action: "deal.transitioned",
          metadata: {
            fromStatus: currentDeal.status,
            toStatus: input.nextStatus,
          },
        },
        tx,
      );

      if (input.nextStatus === "APPROVED") {
        await backgroundJobRepository.create(
          {
            id: randomUUID(),
            type: "LEADERBOARD_REFRESH",
            status: "QUEUED",
            payload: {
              quarter: currentQuarterLabel(new Date()),
              sourceEntity: "DealRegistration",
              sourceEntityId: dealId,
            },
            availableAt: new Date(),
          },
          tx,
        );
      }

      // ⚠️ SENIOR NOTE: The approval-history write must live in the same transaction as the status update or the workflow becomes non-auditable under failure.
      return updatedDeal;
    });
  },
};
