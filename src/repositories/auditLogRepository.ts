/**
 * What this file does: persists audit events for sensitive workflow and permission-relevant actions.
 * What calls it: src/lib/audit/auditLogger.ts and service-layer transactions.
 * What it calls: src/lib/db.ts for Prisma access.
 * One thing a junior engineer would likely get wrong when writing something similar: logging a vague message string instead of structured metadata that can power later investigations.
 */
import { db, type DbExecutor } from "@/lib/db";

type AuditInput = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string;
  actorRole: string;
  metadata: Record<string, unknown>;
};

export const auditLogRepository = {
  async create(input: AuditInput, executor: DbExecutor = db) {
    // ⚠️ SENIOR NOTE: Audit logs must be written in the same transaction as the business change or they stop being trustworthy during incident review.
    return executor.auditLog.create({
      data: {
        id: input.id,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole as never,
        metadata: input.metadata,
      },
    });
  },
};
