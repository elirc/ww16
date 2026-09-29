/**
 * What this file does: provides an operator endpoint to process queued background jobs.
 * What calls it: manual ops tooling or a scheduler.
 * What it calls: src/lib/http/route-handlers.ts and src/services/backgroundJobService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: leaving a job-processing endpoint unauthenticated because "it is only called internally."
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { backgroundJobService } from "@/services/backgroundJobService";

export const POST = createAuthedRoute({ permission: "jobs:process" }, async () => {
  const results = await backgroundJobService.processDueJobs();

  // ⚠️ SENIOR NOTE: Operator endpoints should return structured run results so failed jobs can be retried intentionally rather than by guesswork.
  return NextResponse.json({ data: results });
});
