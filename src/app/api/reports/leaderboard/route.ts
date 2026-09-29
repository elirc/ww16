/**
 * What this file does: serves the partner leaderboard report for a requested quarter.
 * What calls it: src/hooks/useLeaderboard.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/services/reportingService.ts, and src/lib/time.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: hardcoding "current quarter" in the UI and making the API impossible to reuse for audits or exports.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { currentQuarterLabel } from "@/lib/time";
import { reportingService } from "@/services/reportingService";

export const GET = createAuthedRoute({ permission: "reports:view" }, async ({ request }) => {
  const quarter = new URL(request.url).searchParams.get("quarter") ?? currentQuarterLabel(new Date());
  const leaderboard = await reportingService.getLeaderboard(quarter);

  return NextResponse.json({ data: leaderboard });
});
