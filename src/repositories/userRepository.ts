/**
 * What this file does: loads user records that are safe to use for request-session construction.
 * What calls it: src/lib/auth/session.ts.
 * What it calls: src/lib/db.ts for Prisma access.
 * One thing a junior engineer would likely get wrong when writing something similar: selecting the full user row and accidentally exposing secrets or unrelated fields into the request context.
 */
import { db, type DbExecutor } from "@/lib/db";

export const userRepository = {
  async findSessionUserById(userId: string, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: Session hydration should stay narrow because every extra selected field becomes tempting to trust elsewhere in the request lifecycle.
    return executor.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        partnerOrgId: true,
      },
    });
  },
};
