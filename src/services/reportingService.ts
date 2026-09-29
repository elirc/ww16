/**
 * What this file does: computes partner leaderboard metrics and optionally persists snapshot rows for async reporting.
 * What calls it: src/app/api/reports/leaderboard/route.ts and src/services/backgroundJobService.ts.
 * What it calls: src/repositories/reportingRepository.ts and src/lib/time.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: binding reporting to only the live query path and leaving no way to precompute expensive views.
 */
import { randomUUID } from "node:crypto";

import { getQuarterBounds } from "@/lib/time";
import { reportingRepository } from "@/repositories/reportingRepository";

function computeScore(metrics: {
  approvedDealCount: number;
  approvedDealArr: number;
  reimbursedMdf: number;
  certificationCount: number;
}) {
  return (
    metrics.approvedDealCount * 15 +
    metrics.approvedDealArr / 10000 +
    metrics.reimbursedMdf / 2500 +
    metrics.certificationCount * 5
  );
}

async function buildLeaderboardRows(quarter: string) {
  const { start, end } = getQuarterBounds(quarter);
  const partners = await reportingRepository.listPartnerMetricInputs(start, end);

  return partners
    .map((partner) => {
      const approvedDealArr = partner.deals.reduce(
        (sum, deal) => sum + Number(deal.projectedArr),
        0,
      );
      const reimbursedMdf = partner.mdfRequests.reduce(
        (sum, request) => sum + Number(request.reimbursement?.amount ?? 0),
        0,
      );
      const certificationCount = partner.certificationRecords.length;
      const approvedDealCount = partner.deals.length;

      return {
        partnerOrgId: partner.id,
        partnerName: partner.name,
        tier: partner.tier,
        approvedDealCount,
        approvedDealArr,
        reimbursedMdf,
        certificationCount,
        score: computeScore({
          approvedDealCount,
          approvedDealArr,
          reimbursedMdf,
          certificationCount,
        }),
      };
    })
    .sort((left, right) => right.score - left.score || left.partnerName.localeCompare(right.partnerName));
}

export const reportingService = {
  async getLeaderboard(quarter: string) {
    const snapshots = await reportingRepository.listLeaderboardSnapshots(quarter);

    if (snapshots.length > 0) {
      return {
        source: "snapshot" as const,
        quarter,
        rows: snapshots.map((row) => ({
          partnerOrgId: row.partnerOrgId,
          partnerName: row.partnerOrg.name,
          tier: row.partnerOrg.tier,
          approvedDealCount: row.approvedDealCount,
          approvedDealArr: Number(row.approvedDealArr),
          reimbursedMdf: Number(row.reimbursedMdf),
          certificationCount: row.certificationCount,
          score: Number(row.score),
        })),
      };
    }

    // Falling back to live computation keeps the report useful even before the first async refresh has run.
    return {
      source: "live" as const,
      quarter,
      rows: await buildLeaderboardRows(quarter),
    };
  },

  async refreshLeaderboardSnapshot(quarter: string, sourcedJobId?: string) {
    const rows = await buildLeaderboardRows(quarter);

    await Promise.all(
      rows.map((row) =>
        reportingRepository.upsertSnapshot({
          id: randomUUID(),
          quarter,
          partnerOrgId: row.partnerOrgId,
          sourcedJobId,
          approvedDealCount: row.approvedDealCount,
          approvedDealArr: row.approvedDealArr,
          reimbursedMdf: row.reimbursedMdf,
          certificationCount: row.certificationCount,
          score: row.score,
        }),
      ),
    );

    // ⚠️ SENIOR NOTE: Snapshot refresh is idempotent by `(quarter, partnerOrgId)` so reprocessing a job does not duplicate leaderboard rows.
    return {
      quarter,
      refreshedCount: rows.length,
    };
  },
};
