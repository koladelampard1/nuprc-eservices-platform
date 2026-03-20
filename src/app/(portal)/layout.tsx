import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PortalLayout } from "@/components/layouts/portal-layout";
import { auth } from "@/lib/auth";
import { canAccessArea, getHomeRouteForRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function PortalRouteLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const roleCode = session?.user?.roleCode;

  if (!roleCode) {
    redirect("/login");
  }

  if (!canAccessArea("portal", roleCode)) {
    redirect(getHomeRouteForRole(roleCode));
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null
    }
  });

  return <PortalLayout unreadCount={unreadCount}>{children}</PortalLayout>;
}
