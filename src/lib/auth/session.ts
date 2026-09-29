/**
 * What this file does: converts an inbound request into a typed application session.
 * What calls it: src/lib/http/route-handlers.ts.
 * What it calls: src/repositories/userRepository.ts to hydrate the acting user.
 * One thing a junior engineer would likely get wrong when writing something similar: trusting a raw header or cookie without resolving it back to a real user record and a canonical role.
 */
import { UnauthorizedError } from "@/lib/errors";
import { userRepository } from "@/repositories/userRepository";
import type { RequestSession } from "@/types/auth";

const DEFAULT_DEMO_USER_ID = "demo-channel-manager";

export async function getRequestSession(request: Request): Promise<RequestSession> {
  const requestedUserId = request.headers.get("x-demo-user-id") ?? DEFAULT_DEMO_USER_ID;
  const user = await userRepository.findSessionUserById(requestedUserId);

  if (!user) {
    throw new UnauthorizedError("The supplied demo user could not be resolved.");
  }

  // This header-based session keeps the scaffold easy to run locally while preserving a realistic permission boundary everywhere else.
  return {
    userId: user.id,
    email: user.email,
    displayName: user.name,
    role: user.role,
    partnerOrgId: user.partnerOrgId,
  };
}
