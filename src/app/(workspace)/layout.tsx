import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { WorkspaceLayout } from "@/components/layouts/workspace-layout";
import { auth } from "@/lib/auth";
import { canAccessArea, getHomeRouteForRole } from "@/lib/permissions";

export default async function WorkspaceRouteLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const roleCode = session?.user?.roleCode;

  if (!roleCode) {
    redirect("/login");
  }

  if (!canAccessArea("workspace", roleCode)) {
    redirect(getHomeRouteForRole(roleCode));
  }

  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
