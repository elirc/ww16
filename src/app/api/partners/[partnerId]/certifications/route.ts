/**
 * What this file does: records a certification for a specific partner organization.
 * What calls it: future partner-ops UI or external admin clients.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/certificationSchemas.ts, and src/services/certificationService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: trusting the route param without verifying the session can act on that partner.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { recordCertificationSchema } from "@/lib/validation/certificationSchemas";
import { certificationService } from "@/services/certificationService";

export const POST = createAuthedRoute<{ partnerId: string }>(
  { permission: "certification:manage" },
  async ({ request, params, session }) => {
    const body = recordCertificationSchema.parse(await request.json());
    const record = await certificationService.recordCertification(session, params.partnerId, body);

    return NextResponse.json({ data: record }, { status: 201 });
  },
);
