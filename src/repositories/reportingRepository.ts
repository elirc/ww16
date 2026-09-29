/**
 * What this file does: loads reporting inputs and snapshot rows for leaderboard generation.
 * What calls it: src/services/reportingService.ts.
 * What it calls: src/lib/db.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: computing analytics directly in pages, which makes it impossible to reuse in jobs or APIs.
 */
import { db, type DbExecutor } from "@/lib/db";

type SnapshotInput = {
  id: string;
  quarter: string;
  partnerOrgId: string;
  sourcedJobId?: string;
  approvedDealCount: number;
  approvedDealArr: number;
  reimbursedMdf: number;
  certificationCount: number;
  score: number;
};

export const reportingRepository = {
  async listLeaderboardSnapshots(quarter: string, executor: DbExecutor = db) {
    return executor.leaderboardSnapshot.findMany({
      where: { quarter },
      include: {
        partnerOrg: {
          select: {
            name: true,
            tier: true,
          },
        },
      },
      orderBy: [{ score: "desc" }, { partnerOrg: { name: "asc" } }],
    });
  },

  async listPartnerMetricInputs(start: Date, end: Date, executor: DbExecutor = db) {
    return executor.partnerOrg.findMany({
      include: {
        deals: {
          where: {
            status: "APPROVED",
            approvedAt: {
              gte: start,
              lt: end,
            },
          },
          select: {
            projectedArr: true,
          },
        },
        mdfRequests: {
          where: {
            status: "REIMBURSED",
            reimbursement: {
              is: {
                reimbursedAt: {
                  gte: start,
                  lt: end,
                },
              },
            },
          },
          include: {
            reimbursement: true,
          },
        },
        certificationRecords: {
          where: {
            status: "ACTIVE",
            expiresAt: {
              gte: start,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  },

  async upsertSnapshot(input: SnapshotInput, executor: DbExecutor = db) {
    return executor.leaderboardSnapshot.upsert({
      where: {
        quarter_partnerOrgId: {
          quarter: input.quarter,
          partnerOrgId: input.partnerOrgId,
        },
      },
      create: input,
      update: {
        sourcedJobId: input.sourcedJobId,
        approvedDealCount: input.approvedDealCount,
        approvedDealArr: input.approvedDealArr,
        reimbursedMdf: input.reimbursedMdf,
        certificationCount: input.certificationCount,
        score: input.score,
      },
    });
  },
};
