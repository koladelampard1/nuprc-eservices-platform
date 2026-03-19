import { PrismaClient, type ApplicationState } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.decisionLetter.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.clarificationRequest.deleteMany();
  await prisma.reviewAction.deleteMany();
  await prisma.workflowTransition.deleteMany();
  await prisma.paymentReference.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.applicationFormEntry.deleteMany();
  await prisma.application.deleteMany();
  await prisma.serviceDocumentRequirement.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.role.deleteMany();

  const roles = await Promise.all([
    prisma.role.create({ data: { code: "SUPER_ADMIN", name: "Super Admin" } }),
    prisma.role.create({ data: { code: "ADMIN", name: "Admin" } }),
    prisma.role.create({ data: { code: "DIRECTOR", name: "Director, Permits & Licensing" } }),
    prisma.role.create({ data: { code: "REVIEW_OFFICER", name: "Review Officer" } }),
    prisma.role.create({ data: { code: "EXTERNAL_OPERATOR", name: "External Operator" } }),
    prisma.role.create({ data: { code: "COMPANY_ADMIN", name: "Company Admin" } })
  ]);

  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role]));

  const [companyA, companyB, companyC] = await Promise.all([
    prisma.company.create({ data: { name: "Delta Energy Ltd", rcNumber: "RC-102233", contactEmail: "compliance@deltaenergy.ng" } }),
    prisma.company.create({ data: { name: "Atlas Deepwater Plc", rcNumber: "RC-445091", contactEmail: "permits@atlasdw.ng" } }),
    prisma.company.create({ data: { name: "Niger Basin Resources", rcNumber: "RC-889101", contactEmail: "ops@nigerbasin.ng" } })
  ]);

  const passwordHash = await hash("Demo@123", 10);

  const users = await Promise.all([
    prisma.user.create({ data: { fullName: "Platform Super Admin", email: "superadmin@nuprc.demo", passwordHash, roleId: roleByCode.SUPER_ADMIN.id } }),
    prisma.user.create({ data: { fullName: "System Admin", email: "admin@nuprc.demo", passwordHash, roleId: roleByCode.ADMIN.id } }),
    prisma.user.create({ data: { fullName: "Director Amina Yusuf", email: "director@nuprc.demo", passwordHash, roleId: roleByCode.DIRECTOR.id } }),
    prisma.user.create({ data: { fullName: "Review Officer Emeka Obi", email: "review1@nuprc.demo", passwordHash, roleId: roleByCode.REVIEW_OFFICER.id } }),
    prisma.user.create({ data: { fullName: "Review Officer Adaeze Nwosu", email: "review2@nuprc.demo", passwordHash, roleId: roleByCode.REVIEW_OFFICER.id } }),
    prisma.user.create({ data: { fullName: "Delta Operator", email: "operator@deltaenergy.ng", passwordHash, roleId: roleByCode.EXTERNAL_OPERATOR.id, companyId: companyA.id } }),
    prisma.user.create({ data: { fullName: "Atlas Company Admin", email: "admin@atlasdw.ng", passwordHash, roleId: roleByCode.COMPANY_ADMIN.id, companyId: companyB.id } }),
    prisma.user.create({ data: { fullName: "Niger Operator", email: "operator@nigerbasin.ng", passwordHash, roleId: roleByCode.EXTERNAL_OPERATOR.id, companyId: companyC.id } })
  ]);

  const userByEmail = Object.fromEntries(users.map((user) => [user.email, user]));

  const serviceTypes = await Promise.all([
    prisma.serviceType.create({
      data: {
        code: "LTO",
        name: "License to Operate",
        description: "Application for upstream operational license.",
        baseFeeNgn: 500000
      }
    }),
    prisma.serviceType.create({
      data: {
        code: "EP",
        name: "Environmental Permit",
        description: "Permit for environmental compliance approval.",
        baseFeeNgn: 250000
      }
    }),
    prisma.serviceType.create({
      data: {
        code: "FAR",
        name: "Field Activity Report Approval",
        description: "Regulatory approval for field activity submissions.",
        baseFeeNgn: 100000
      }
    })
  ]);

  await prisma.serviceDocumentRequirement.createMany({
    data: [
      { serviceTypeId: serviceTypes[0].id, name: "Corporate Profile", sortOrder: 1 },
      { serviceTypeId: serviceTypes[0].id, name: "Safety Policy", sortOrder: 2 },
      { serviceTypeId: serviceTypes[1].id, name: "Environmental Impact Assessment", sortOrder: 1 },
      { serviceTypeId: serviceTypes[2].id, name: "Previous Field Report", sortOrder: 1 }
    ]
  });

  const applicationsSeed: Array<{
    referenceNo: string;
    companyId: string;
    serviceTypeId: string;
    submittedById: string;
    assignedToId?: string;
    state: ApplicationState;
  }> = [
    { referenceNo: "NUPRC-APP-1001", companyId: companyA.id, serviceTypeId: serviceTypes[0].id, submittedById: userByEmail["operator@deltaenergy.ng"].id, assignedToId: userByEmail["review1@nuprc.demo"].id, state: "IN_REVIEW" },
    { referenceNo: "NUPRC-APP-1002", companyId: companyB.id, serviceTypeId: serviceTypes[1].id, submittedById: userByEmail["admin@atlasdw.ng"].id, assignedToId: userByEmail["review2@nuprc.demo"].id, state: "SUBMITTED" },
    { referenceNo: "NUPRC-APP-1003", companyId: companyC.id, serviceTypeId: serviceTypes[2].id, submittedById: userByEmail["operator@nigerbasin.ng"].id, assignedToId: userByEmail["review1@nuprc.demo"].id, state: "CLARIFICATION_REQUIRED" },
    { referenceNo: "NUPRC-APP-1004", companyId: companyA.id, serviceTypeId: serviceTypes[1].id, submittedById: userByEmail["operator@deltaenergy.ng"].id, assignedToId: userByEmail["review2@nuprc.demo"].id, state: "APPROVED" },
    { referenceNo: "NUPRC-APP-1005", companyId: companyB.id, serviceTypeId: serviceTypes[2].id, submittedById: userByEmail["admin@atlasdw.ng"].id, assignedToId: userByEmail["review1@nuprc.demo"].id, state: "REJECTED" },
    { referenceNo: "NUPRC-APP-1006", companyId: companyC.id, serviceTypeId: serviceTypes[0].id, submittedById: userByEmail["operator@nigerbasin.ng"].id, state: "DRAFT" }
  ];

  const applications = [];
  for (const appData of applicationsSeed) {
    const app = await prisma.application.create({
      data: {
        ...appData,
        submittedAt: appData.state === "DRAFT" ? null : new Date(),
        currentStep: appData.state === "DRAFT" ? "Draft" : "Initial Review"
      }
    });
    applications.push(app);
  }

  await prisma.workflowTransition.createMany({
    data: [
      {
        applicationId: applications[0].id,
        fromState: "SUBMITTED",
        toState: "IN_REVIEW",
        actorId: userByEmail["review1@nuprc.demo"].id,
        comment: "Initial completeness check passed."
      },
      {
        applicationId: applications[2].id,
        fromState: "IN_REVIEW",
        toState: "CLARIFICATION_REQUIRED",
        actorId: userByEmail["review1@nuprc.demo"].id,
        comment: "Awaiting corrected HSE annexures."
      },
      {
        applicationId: applications[3].id,
        fromState: "IN_REVIEW",
        toState: "APPROVED",
        actorId: userByEmail["director@nuprc.demo"].id,
        comment: "Approved after director endorsement."
      }
    ]
  });

  await prisma.reviewAction.createMany({
    data: [
      { applicationId: applications[0].id, reviewerId: userByEmail["review1@nuprc.demo"].id, actionType: "COMMENTED", note: "Technical review in progress." },
      { applicationId: applications[2].id, reviewerId: userByEmail["review1@nuprc.demo"].id, actionType: "RETURNED_FOR_CLARIFICATION", note: "Need updated spill prevention plan." },
      { applicationId: applications[3].id, reviewerId: userByEmail["director@nuprc.demo"].id, actionType: "FINAL_APPROVAL", note: "Meets all threshold requirements." }
    ]
  });

  await prisma.clarificationRequest.create({
    data: {
      applicationId: applications[2].id,
      requestedById: userByEmail["review1@nuprc.demo"].id,
      message: "Please upload revised environmental risk matrix in the next cycle."
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: userByEmail["operator@deltaenergy.ng"].id,
        applicationId: applications[0].id,
        type: "APPLICATION_UPDATE",
        title: "Application moved to in-review",
        message: "NUPRC-APP-1001 is now assigned to a review officer."
      },
      {
        userId: userByEmail["operator@nigerbasin.ng"].id,
        applicationId: applications[2].id,
        type: "CLARIFICATION",
        title: "Clarification requested",
        message: "Please respond to the review clarification for NUPRC-APP-1003."
      },
      {
        userId: userByEmail["admin@atlasdw.ng"].id,
        applicationId: applications[4].id,
        type: "APPLICATION_UPDATE",
        title: "Application decision issued",
        message: "A decision has been issued for NUPRC-APP-1005."
      }
    ]
  });

  await prisma.paymentReference.createMany({
    data: [
      { applicationId: applications[0].id, referenceNo: "PAY-1001", amountNgn: 500000, status: "PAID", paidAt: new Date() },
      { applicationId: applications[1].id, referenceNo: "PAY-1002", amountNgn: 250000, status: "PENDING" },
      { applicationId: applications[4].id, referenceNo: "PAY-1005", amountNgn: 100000, status: "FAILED" }
    ]
  });

  await prisma.decisionLetter.createMany({
    data: [
      {
        applicationId: applications[3].id,
        issuedById: userByEmail["director@nuprc.demo"].id,
        decisionType: "APPROVAL",
        letterRef: "DL-2026-0001",
        summary: "Environmental Permit approved subject to annual compliance filing."
      },
      {
        applicationId: applications[4].id,
        issuedById: userByEmail["director@nuprc.demo"].id,
        decisionType: "REJECTION",
        letterRef: "DL-2026-0002",
        summary: "Field report rejected pending geotechnical reconciliation."
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: userByEmail["admin@nuprc.demo"].id,
        action: "USER_SEEDED",
        entityType: "User",
        entityId: userByEmail["review2@nuprc.demo"].id,
        metadata: { source: "seed-script" }
      },
      {
        actorId: userByEmail["review1@nuprc.demo"].id,
        action: "APPLICATION_REVIEWED",
        entityType: "Application",
        entityId: applications[0].id,
        metadata: { state: "IN_REVIEW" }
      },
      {
        actorId: userByEmail["director@nuprc.demo"].id,
        action: "DECISION_ISSUED",
        entityType: "DecisionLetter",
        entityId: "DL-2026-0001",
        metadata: { decision: "APPROVAL" }
      }
    ]
  });

  console.log("✅ Seed complete: NUPRC demo baseline data generated.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
