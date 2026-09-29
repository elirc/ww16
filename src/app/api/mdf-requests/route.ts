/**
 * What this file does: exposes MDF list and submission endpoints.
 * What calls it: src/hooks/useMdfRequests.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/mdfSchemas.ts, and src/services/mdfService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: merging finance-only decision fields into the create endpoint.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { createMdfRequestSchema, listMdfRequestsQuerySchema } from "@/lib/validation/mdfSchemas";
import { mdfService } from "@/services/mdfService";

export const GET = createAuthedRoute({ permission: "mdf:read" }, async ({ request, session }) => {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = listMdfRequestsQuerySchema.parse(searchParams);
  const requests = await mdfService.listRequests(session, filters);

  return NextResponse.json({ data: requests });
});

export const POST = createAuthedRoute({ permission: "mdf:create" }, async ({ request, session }) => {
  const body = createMdfRequestSchema.parse(await request.json());
  const mdfRequest = await mdfService.createRequest(session, body);

  return NextResponse.json({ data: mdfRequest }, { status: 201 });
});
