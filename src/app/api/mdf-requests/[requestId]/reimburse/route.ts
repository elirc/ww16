/**
 * What this file does: records the reimbursement for an already approved MDF request.
 * What calls it: src/hooks/useMdfRequests.ts.
 * What it calls: src/lib/http/route-handlers.ts, src/lib/validation/mdfSchemas.ts, and src/services/mdfService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: trusting the client-side approved amount instead of reloading the authoritative request record.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { reimburseMdfRequestSchema } from "@/lib/validation/mdfSchemas";
import { mdfService } from "@/services/mdfService";

export const POST = createAuthedRoute<{ requestId: string }>(
  { permission: "mdf:reimburse" },
  async ({ request, params, session }) => {
    const body = reimburseMdfRequestSchema.parse(await request.json());
    const reimbursement = await mdfService.reimburseRequest(session, params.requestId, body);

    return NextResponse.json({ data: reimbursement }, { status: 201 });
  },
);
