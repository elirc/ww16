/**
 * What this file does: exposes deal listing and draft creation over REST.
 * What calls it: src/hooks/useDeals.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/dealSchemas.ts, and src/services/dealRegistrationService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: allowing the client to set the initial status and bypass the workflow.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { createDealSchema, listDealsQuerySchema } from "@/lib/validation/dealSchemas";
import { dealRegistrationService } from "@/services/dealRegistrationService";

export const GET = createAuthedRoute({ permission: "deal:read" }, async ({ request, session }) => {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = listDealsQuerySchema.parse(searchParams);
  const deals = await dealRegistrationService.listDeals(session, filters);

  return NextResponse.json({ data: deals });
});

export const POST = createAuthedRoute({ permission: "deal:create" }, async ({ request, session }) => {
  const body = createDealSchema.parse(await request.json());
  const deal = await dealRegistrationService.createDeal(session, body);

  return NextResponse.json({ data: deal }, { status: 201 });
});
