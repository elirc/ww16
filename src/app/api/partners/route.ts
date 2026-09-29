/**
 * What this file does: exposes partner listing and partner onboarding over REST.
 * What calls it: src/hooks/usePartners.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/partnerSchemas.ts, and src/services/partnerService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: putting validation in the React form only and assuming the API can trust the payload.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { createPartnerSchema, listPartnersQuerySchema } from "@/lib/validation/partnerSchemas";
import { partnerService } from "@/services/partnerService";

export const GET = createAuthedRoute({ permission: "partner:read" }, async ({ request, session }) => {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = listPartnersQuerySchema.parse(searchParams);
  const partners = await partnerService.listPartners(session, filters);

  return NextResponse.json({ data: partners });
});

export const POST = createAuthedRoute({ permission: "partner:manage" }, async ({ request, session }) => {
  const body = createPartnerSchema.parse(await request.json());
  const partner = await partnerService.createPartner(session, body);

  // ⚠️ SENIOR NOTE: Returning the created resource is helpful, but do not leak related records here that were not explicitly created or requested.
  return NextResponse.json({ data: partner }, { status: 201 });
});
