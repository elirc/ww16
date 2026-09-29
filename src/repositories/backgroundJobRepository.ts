/**
 * What this file does: persists and updates background jobs that decouple operational work from the request cycle.
 * What calls it: src/services/dealRegistrationService.ts, src/services/mdfService.ts, and src/services/backgroundJobService.ts.
 * What it calls: src/lib/db.ts for Prisma access.
 * One thing a junior engineer would likely get wrong when writing something similar: storing jobs but never transitioning them through a lifecycle that can be retried or inspected.
 */
import { db, type DbExecutor } from "@/lib/db";

type CreateJobInput = {
  id: string;
  type: "LEADERBOARD_REFRESH";
  status: "QUEUED";
  payload: Record<string, unknown>;
  availableAt: Date;
};

export const backgroundJobRepository = {
  async create(input: CreateJobInput, executor: DbExecutor = db) {
    return executor.backgroundJob.create({
      data: input,
    });
  },

  async listDueJobs(limit: number, executor: DbExecutor = db) {
    return executor.backgroundJob.findMany({
      where: {
        status: "QUEUED",
        availableAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        availableAt: "asc",
      },
      take: limit,
    });
  },

  async markRunning(jobId: string, executor: DbExecutor = db) {
    return executor.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });
  },

  async markSucceeded(jobId: string, executor: DbExecutor = db) {
    return executor.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        failureReason: null,
      },
    });
  },

  async markFailed(jobId: string, failureReason: string, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: Keeping failure text on the job makes postmortems faster than relying on ephemeral application logs.
    return executor.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        failureReason,
      },
    });
  },
};
