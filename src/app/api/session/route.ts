/**
 * What this file does: returns the current request session and its derived permissions for the demo portal.
 * What calls it: src/hooks/useSession.ts.
 * What it calls: src/lib/http/route-handlers.ts and src/lib/auth/permissions.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: returning a raw user object without showing which permissions the UI can actually rely on.
 */
import { NextResponse } from "next/server";

import { createAuthedRoute } from "@/lib/http/route-handlers";
import { listPermissionsForRole } from "@/lib/auth/permissions";

export const GET = createAuthedRoute({}, async ({ session }) => {
  // ⚠️ SENIOR NOTE: Exposing the derived permission list keeps UI affordances aligned with the same centralized RBAC matrix the API enforces.
  return NextResponse.json({
    data: {
      ...session,
      permissions: listPermissionsForRole(session.role),
    },
  });
});
