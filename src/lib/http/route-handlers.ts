/**
 * What this file does: wraps API handlers with session loading, permission checks, and consistent error translation.
 * What calls it: src/app/api/**/route.ts files.
 * What it calls: src/lib/auth/session.ts, src/lib/auth/permissions.ts, and src/lib/errors.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: duplicating try/catch and auth code in every route until behavior drifts.
 */
import { NextResponse } from "next/server";

import { assertPermission, type Permission } from "@/lib/auth/permissions";
import { normalizeError } from "@/lib/errors";
import { getRequestSession } from "@/lib/auth/session";
import type { RequestSession } from "@/types/auth";

type RouteContext<TParams> = {
  request: Request;
  params: TParams;
  session: RequestSession;
};

type RouteOptions = {
  permission?: Permission;
};

type NextRouteContext<TParams> = {
  params: Promise<TParams> | TParams;
};

export function createAuthedRoute<TParams = Record<string, never>>(
  options: RouteOptions,
  handler: (context: RouteContext<TParams>) => Promise<Response>,
) {
  return async (request: Request, nextContext?: NextRouteContext<TParams>): Promise<Response> => {
    try {
      const session = await getRequestSession(request);

      if (options.permission) {
        assertPermission(session, options.permission);
      }

      const params = nextContext ? await nextContext.params : ({} as TParams);
      return await handler({ request, params, session });
    } catch (error) {
      const normalized = normalizeError(error);
      return NextResponse.json(
        {
          error: normalized.message,
          code: normalized.code,
          details: normalized.details ?? null,
        },
        { status: normalized.statusCode },
      );
    }
  };
}
