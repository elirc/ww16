/**
 * What this file does: lets finance approve or reject an MDF request.
 * What calls it: src/hooks/useMdfRequests.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/mdfSchemas.ts, and src/services/mdfService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: performing status validation in the route and duplicating logic that should stay reusable in the service and domain layers.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { mdfDecisionSchema } from "@/lib/validation/mdfSchemas";
import { mdfService } from "@/services/mdfService";

export const POST = createAuthedRoute<{ requestId: string }>(
  { permission: "mdf:decide" },
  async ({ request, params, session }) => {
    const body = mdfDecisionSchema.parse(await request.json());
    const requestRecord = await mdfService.decideRequest(session, params.requestId, body);

    return NextResponse.json({ data: requestRecord });
  },
);
