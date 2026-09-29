import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.dealApproval.deleteMany();
  await prisma.leaderboardSnapshot.deleteMany();
  await prisma.mdfReimbursement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.backgroundJob.deleteMany();
  await prisma.dealRegistration.deleteMany();
  await prisma.mdfRequest.deleteMany();
  await prisma.certificationRecord.deleteMany();
  await prisma.certificationDefinition.deleteMany();
  await prisma.partnerAgreement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.partnerOrg.deleteMany();

  await prisma.partnerOrg.createMany({
    data: [
      {
        id: "partner-acme",
        name: "Acme Systems",
        slug: "acme-systems",
        tier: "GOLD",
        agreementStatus: "ACTIVE",
        portalAccessEnabled: true,
      },
      {
        id: "partner-northstar",
        name: "Northstar Integrators",
        slug: "northstar-integrators",
        tier: "SILVER",
        agreementStatus: "ACTIVE",
        portalAccessEnabled: true,
      },
    ],
  });

  await prisma.partnerAgreement.createMany({
    data: [
      {
        id: "agreement-acme",
        partnerOrgId: "partner-acme",
        status: "ACTIVE",
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        renewalDate: new Date("2027-01-01T00:00:00.000Z"),
        commercialTerms: { rebateModel: "co-sell" },
      },
      {
        id: "agreement-northstar",
        partnerOrgId: "partner-northstar",
        status: "ACTIVE",
        effectiveDate: new Date("2026-02-01T00:00:00.000Z"),
        renewalDate: new Date("2027-02-01T00:00:00.000Z"),
        commercialTerms: { rebateModel: "services-led" },
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: "demo-platform-admin",
        email: "platform-admin@example.com",
        name: "Platform Admin",
        role: "PLATFORM_ADMIN",
      },
      {
        id: "demo-channel-manager",
        email: "channel-manager@example.com",
        name: "Casey Channel",
        role: "CHANNEL_MANAGER",
      },
      {
        id: "demo-sales-rep",
        email: "sales-rep@example.com",
        name: "Sam Sales",
        role: "SALES_REP",
      },
      {
        id: "demo-finance-manager",
        email: "finance-manager@example.com",
        name: "Finley Finance",
        role: "FINANCE_MANAGER",
      },
      {
        id: "demo-partner-admin-acme",
        email: "partner-admin@acme.example.com",
        name: "Avery Partner",
        role: "PARTNER_ADMIN",
        partnerOrgId: "partner-acme",
      },
      {
        id: "demo-partner-seller-acme",
        email: "partner-seller@acme.example.com",
        name: "Riley Seller",
        role: "PARTNER_SELLER",
        partnerOrgId: "partner-acme",
      },
      {
        id: "demo-partner-admin-northstar",
        email: "partner-admin@northstar.example.com",
        name: "Morgan Integrator",
        role: "PARTNER_ADMIN",
        partnerOrgId: "partner-northstar",
      },
    ],
  });

  await prisma.certificationDefinition.createMany({
    data: [
      {
        id: "cert-architect",
        name: "Solution Architect",
        requiredForTier: "GOLD",
        expiresInMonths: 12,
      },
      {
        id: "cert-implementation",
        name: "Implementation Specialist",
        requiredForTier: "SILVER",
        expiresInMonths: 12,
      },
    ],
  });

  await prisma.certificationRecord.create({
    data: {
      id: "cert-record-acme",
      partnerOrgId: "partner-acme",
      definitionId: "cert-architect",
      status: "ACTIVE",
      achievedAt: new Date("2026-01-15T00:00:00.000Z"),
      expiresAt: new Date("2027-01-15T00:00:00.000Z"),
      recordedByUserId: "demo-channel-manager",
    },
  });

  await prisma.dealRegistration.createMany({
    data: [
      {
        id: "deal-acme-draft",
        partnerOrgId: "partner-acme",
        createdByUserId: "demo-partner-admin-acme",
        assignedSalesRepId: "demo-sales-rep",
        channelManagerId: "demo-channel-manager",
        status: "DRAFT",
        endCustomerName: "Blue Yonder Retail",
        projectedArr: 85000,
        closeDate: new Date("2026-06-30T00:00:00.000Z"),
        notes: "Initial co-sell opportunity.",
      },
      {
        id: "deal-acme-approved",
        partnerOrgId: "partner-acme",
        createdByUserId: "demo-partner-admin-acme",
        assignedSalesRepId: "demo-sales-rep",
        channelManagerId: "demo-channel-manager",
        status: "APPROVED",
        endCustomerName: "North Ridge Health",
        projectedArr: 145000,
        closeDate: new Date("2026-05-15T00:00:00.000Z"),
        notes: "Approved strategic account.",
        submittedAt: new Date("2026-04-01T00:00:00.000Z"),
        approvedAt: new Date("2026-04-10T00:00:00.000Z"),
      },
    ],
  });

  await prisma.dealApproval.createMany({
    data: [
      {
        id: "approval-sales-acme",
        dealId: "deal-acme-approved",
        actorUserId: "demo-sales-rep",
        fromStatus: "SUBMITTED",
        toStatus: "SALES_APPROVED",
      },
      {
        id: "approval-channel-acme",
        dealId: "deal-acme-approved",
        actorUserId: "demo-channel-manager",
        fromStatus: "SALES_APPROVED",
        toStatus: "APPROVED",
      },
    ],
  });

  await prisma.mdfRequest.create({
    data: {
      id: "mdf-acme-approved",
      partnerOrgId: "partner-acme",
      submittedByUserId: "demo-partner-admin-acme",
      campaignName: "Q2 retail roadshow",
      amountRequested: 14000,
      plannedStartDate: new Date("2026-04-01T00:00:00.000Z"),
      plannedEndDate: new Date("2026-05-30T00:00:00.000Z"),
      status: "APPROVED",
      approvedAmount: 12000,
      submittedAt: new Date("2026-03-20T00:00:00.000Z"),
      decidedAt: new Date("2026-03-25T00:00:00.000Z"),
    },
  });

  console.log("Seeded demo partner ecosystem data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
