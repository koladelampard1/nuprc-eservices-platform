import { NotificationType, Prisma, UserRoleCode } from "@prisma/client";

type NotificationPayload = {
  userId: string;
  applicationId?: string;
  type: NotificationType;
  title: string;
  message: string;
};

type EmailSimulationPayload = {
  applicationId?: string;
  recipient: string;
  subject: string;
  bodyPreview: string;
  eventType: string;
};

export async function getUsersByRoleCodes(
  tx: Prisma.TransactionClient,
  roleCodes: UserRoleCode[]
) {
  return tx.user.findMany({
    where: {
      isActive: true,
      role: { code: { in: roleCodes } }
    },
    select: {
      id: true,
      email: true,
      fullName: true
    }
  });
}

export async function createNotifications(
  tx: Prisma.TransactionClient,
  notifications: NotificationPayload[]
) {
  if (!notifications.length) {
    return;
  }

  await tx.notification.createMany({
    data: notifications.map((entry) => ({
      userId: entry.userId,
      applicationId: entry.applicationId,
      type: entry.type,
      title: entry.title,
      message: entry.message
    }))
  });
}

export async function createEmailSimulationLogs(
  tx: Prisma.TransactionClient,
  emails: EmailSimulationPayload[]
) {
  if (!emails.length) {
    return;
  }

  await tx.auditLog.createMany({
    data: emails.map((entry) => ({
      action: "EMAIL_SIMULATION_SENT",
      entityType: "EMAIL_SIMULATION",
      entityId: entry.applicationId ?? "SYSTEM",
      metadata: {
        recipient: entry.recipient,
        subject: entry.subject,
        bodyPreview: entry.bodyPreview,
        applicationId: entry.applicationId ?? null,
        eventType: entry.eventType
      }
    }))
  });
}
