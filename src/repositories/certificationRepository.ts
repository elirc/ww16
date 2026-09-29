/**
 * What this file does: persists partner certification records and loads them for reporting views.
 * What calls it: src/services/certificationService.ts and src/repositories/reportingRepository.ts.
 * What it calls: src/lib/db.ts.
 * One thing a junior engineer would likely get wrong when writing something similar: forgetting to include the certification definition and leaving the UI with only opaque IDs.
 */
import { db, type DbExecutor } from "@/lib/db";

type CreateCertificationInput = {
  id: string;
  partnerOrgId: string;
  definitionId: string;
  status: "ACTIVE" | "EXPIRED";
  achievedAt: Date;
  expiresAt: Date;
  recordedByUserId: string;
};

export const certificationRepository = {
  async createRecord(input: CreateCertificationInput, executor: DbExecutor = db) {
    return executor.certificationRecord.create({
      data: input,
      include: {
        definition: true,
      },
    });
  },
};
