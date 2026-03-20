"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/workspace-review";

export async function markWorkspaceNotificationReadAction(notificationId: string) {
  const user = await requireWorkspaceUser();

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

  revalidatePath("/workspace/notifications");
  revalidatePath("/workspace", "layout");
}
