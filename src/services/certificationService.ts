/**
 * What this file does: records partner certifications after partner visibility and permission checks.
 * What calls it: src/app/api/partners/[partnerId]/certifications/route.ts.
 * What it calls: src/lib/auth/permissions.ts, src/services/partnerService.ts, src/repositories/certificationRepository.ts, and src/lib/audit/auditLogger.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: accepting a partner ID from the route without first proving the caller can act on that partner.
 */
import { randomUUID } from "node:crypto";

import { assertPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit/auditLogger";
import { certificationRepository } from "@/repositories/certificationRepository";
import { partnerService } from "@/services/partnerService";
import type { RequestSession } from "@/types/auth";

type RecordCertificationInput = {
  definitionId: string;
  status: "ACTIVE" | "EXPIRED";
  achievedAt: Date;
  expiresAt: Date;
};

export const certificationService = {
  async recordCertification(
    session: RequestSession,
    partnerId: string,
    input: RecordCertificationInput,
  ) {
    assertPermission(session, "certification:manage");
    await partnerService.getPartner(session, partnerId);

    return db.$transaction(async (tx) => {
      const record = await certificationRepository.createRecord(
        {
          id: randomUUID(),
          partnerOrgId: partnerId,
          definitionId: input.definitionId,
          status: input.status,
          achievedAt: input.achievedAt,
          expiresAt: input.expiresAt,
          recordedByUserId: session.userId,
        },
        tx,
      );

      await recordAuditEvent(
        session,
        {
          entityType: "CertificationRecord",
          entityId: record.id,
          action: "certification.recorded",
          metadata: {
            partnerOrgId: partnerId,
            definitionId: input.definitionId,
          },
        },
        tx,
      );

      return record;
    });
  },
};
