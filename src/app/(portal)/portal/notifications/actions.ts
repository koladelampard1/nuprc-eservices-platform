"use server";

import { revalidatePath } from "next/cache";

import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

export async function markPortalNotificationReadAction(notificationId: string) {
  const user = await requirePortalUser();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");
}
