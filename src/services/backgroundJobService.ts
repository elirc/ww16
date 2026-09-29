/**
 * What this file does: processes queued jobs and dispatches them to the correct async workflow handler.
 * What calls it: src/app/api/jobs/process/route.ts.
 * What it calls: src/repositories/backgroundJobRepository.ts and src/services/reportingService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: leaving jobs in a queued state during processing so multiple workers can run the same payload.
 */
import { currentQuarterLabel } from "@/lib/time";
import { backgroundJobRepository } from "@/repositories/backgroundJobRepository";
import { reportingService } from "@/services/reportingService";

export const backgroundJobService = {
  async processDueJobs(limit = 25) {
    const jobs = await backgroundJobRepository.listDueJobs(limit);
    const results: Array<{ jobId: string; status: string; detail?: string }> = [];

    for (const job of jobs) {
      await backgroundJobRepository.markRunning(job.id);

      try {
        if (job.type === "LEADERBOARD_REFRESH") {
          const quarter =
            typeof job.payload === "object" &&
            job.payload &&
            "quarter" in job.payload &&
            typeof job.payload.quarter === "string"
              ? job.payload.quarter
              : currentQuarterLabel(new Date());

          await reportingService.refreshLeaderboardSnapshot(quarter, job.id);
        }

        await backgroundJobRepository.markSucceeded(job.id);
        results.push({ jobId: job.id, status: "SUCCEEDED" });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown failure";
        await backgroundJobRepository.markFailed(job.id, detail);
        results.push({ jobId: job.id, status: "FAILED", detail });
      }
    }

    // ⚠️ SENIOR NOTE: Job processors should always return per-job results so operators can reconcile partial success instead of rerunning blindly.
    return results;
  },
};
