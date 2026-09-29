/**
 * What this file does: advances a deal registration through the approval workflow.
 * What calls it: src/hooks/useDeals.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/dealSchemas.ts, and src/services/dealRegistrationService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: enforcing only a top-level route permission instead of checking the current-to-next status transition.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { dealTransitionSchema } from "@/lib/validation/dealSchemas";
import { dealRegistrationService } from "@/services/dealRegistrationService";

export const POST = createAuthedRoute<{ dealId: string }>({}, async ({ request, params, session }) => {
  const body = dealTransitionSchema.parse(await request.json());
  const deal = await dealRegistrationService.transitionDeal(session, params.dealId, body);

  // ⚠️ SENIOR NOTE: Transition routes are where implicit workflow shortcuts usually sneak in, so keep this route extremely thin and let the domain/service layer own the rules.
  return NextResponse.json({ data: deal });
});
