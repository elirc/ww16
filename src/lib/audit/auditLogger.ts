/**
 * What this file does: gives services a small, explicit helper for creating structured audit records.
 * What calls it: service files in src/services.
 * What it calls: src/repositories/auditLogRepository.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: hiding audit writes in repositories where reviewers can no longer see which business events are actually recorded.
 */
import { randomUUID } from "node:crypto";

import type { DbExecutor } from "@/lib/db";
import { auditLogRepository } from "@/repositories/auditLogRepository";
import type { RequestSession } from "@/types/auth";

type AuditEvent = {
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
};

export async function recordAuditEvent(
  session: RequestSession,
  event: AuditEvent,
  executor: DbExecutor,
) {
  return auditLogRepository.create(
    {
      id: randomUUID(),
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorUserId: session.userId,
      actorRole: session.role,
      metadata: event.metadata,
    },
    executor,
  );
}
