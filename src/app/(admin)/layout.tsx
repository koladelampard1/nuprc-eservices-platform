import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminLayout } from "@/components/layouts/admin-layout";
import { auth } from "@/lib/auth";
import { canAccessArea, getHomeRouteForRole } from "@/lib/permissions";

export default async function AdminRouteLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const roleCode = session?.user?.roleCode;

  if (!roleCode) {
    redirect("/login");
  }

  if (!canAccessArea("admin", roleCode)) {
    redirect(getHomeRouteForRole(roleCode));
  }

  return <AdminLayout>{children}</AdminLayout>;
}
