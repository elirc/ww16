/**
 * What this file does: owns MDF submission, finance decisions, reimbursements, and their reporting side effects.
 * What calls it: src/app/api/mdf-requests/**/route.ts.
 * What it calls: visibility helpers, the MDF domain rules, repositories, audit logging, and background job creation.
 * One thing a junior engineer would likely get wrong when writing something similar: treating finance approval as enough evidence to reimburse without checking the approved amount and creating a reimbursement record.
 */
import { randomUUID } from "node:crypto";

import { assertPermission } from "@/lib/auth/permissions";
import { assertPartnerOwnership } from "@/lib/auth/visibility";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordAuditEvent } from "@/lib/audit/auditLogger";
import { currentQuarterLabel } from "@/lib/time";
import { assertMdfTransitionAllowed } from "@/domain/mdfRequest";
import { backgroundJobRepository } from "@/repositories/backgroundJobRepository";
import { mdfRepository } from "@/repositories/mdfRepository";
import { partnerRepository } from "@/repositories/partnerRepository";
import type { RequestSession } from "@/types/auth";
import type { MdfRequestStatus } from "@/types/domain";

type CreateMdfRequestInput = {
  partnerOrgId: string;
  campaignName: string;
  amountRequested: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
};

type DecideMdfRequestInput = {
  nextStatus: "APPROVED" | "REJECTED";
  approvedAmount?: number;
  rejectionReason?: string;
};

type ReimburseMdfRequestInput = {
  amount: number;
  receiptUrl: string;
};

export const mdfService = {
  async listRequests(session: RequestSession, filters: { status?: MdfRequestStatus }) {
    assertPermission(session, "mdf:read");
    return mdfRepository.listRequests(session, filters);
  },

  async createRequest(session: RequestSession, input: CreateMdfRequestInput) {
    assertPermission(session, "mdf:create");
    assertPartnerOwnership(session, input.partnerOrgId);

    const partner = await partnerRepository.findVisibleById(session, input.partnerOrgId);

    if (!partner) {
      throw new NotFoundError("Partner account was not found for this MDF request.");
    }

    return db.$transaction(async (tx) => {
      const request = await mdfRepository.createRequest(
        {
          id: randomUUID(),
          partnerOrgId: input.partnerOrgId,
          submittedByUserId: session.userId,
          campaignName: input.campaignName,
          amountRequested: input.amountRequested,
          plannedStartDate: input.plannedStartDate,
          plannedEndDate: input.plannedEndDate,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "MdfRequest",
          entityId: request.id,
          action: "mdf.created",
          metadata: {
            partnerOrgId: request.partnerOrgId,
            amountRequested: request.amountRequested,
          },
        },
        tx,
      );

      return request;
    });
  },

  async decideRequest(session: RequestSession, requestId: string, input: DecideMdfRequestInput) {
    const request = await mdfRepository.findVisibleById(session, requestId);

    if (!request) {
      throw new NotFoundError("MDF request was not found.");
    }

    assertMdfTransitionAllowed(session, request.status, input.nextStatus);

    return db.$transaction(async (tx) => {
      const updated = await mdfRepository.decideRequest(
        {
          requestId,
          nextStatus: input.nextStatus,
          approvedAmount: input.approvedAmount,
          rejectionReason: input.rejectionReason,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "MdfRequest",
          entityId: requestId,
          action: "mdf.decided",
          metadata: {
            fromStatus: request.status,
            toStatus: input.nextStatus,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async reimburseRequest(session: RequestSession, requestId: string, input: ReimburseMdfRequestInput) {
    const request = await mdfRepository.findVisibleById(session, requestId);

    if (!request) {
      throw new NotFoundError("MDF request was not found.");
    }

    assertMdfTransitionAllowed(session, request.status, "REIMBURSED");

    if (!request.approvedAmount || input.amount > Number(request.approvedAmount)) {
      throw new ConflictError("Reimbursements cannot exceed the approved MDF amount.");
    }

    return db.$transaction(async (tx) => {
      await mdfRepository.markReimbursed(requestId, tx);

      const reimbursement = await mdfRepository.createReimbursement(
        {
          id: randomUUID(),
          requestId,
          reimbursedByUserId: session.userId,
          amount: input.amount,
          receiptUrl: input.receiptUrl,
          reimbursedAt: new Date(),
        },
        tx,
      );

      await backgroundJobRepository.create(
        {
          id: randomUUID(),
          type: "LEADERBOARD_REFRESH",
          status: "QUEUED",
          payload: {
            quarter: currentQuarterLabel(new Date()),
            sourceEntity: "MdfRequest",
            sourceEntityId: requestId,
          },
          availableAt: new Date(),
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "MdfRequest",
          entityId: requestId,
          action: "mdf.reimbursed",
          metadata: {
            reimbursementId: reimbursement.id,
            amount: reimbursement.amount,
          },
        },
        tx,
      );

      // ⚠️ SENIOR NOTE: Payment-adjacent flows should always validate against the approved amount inside the same transaction that records the reimbursement.
      return reimbursement;
    });
  },
};
