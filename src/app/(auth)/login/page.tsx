import { redirect } from "next/navigation";

import { LoginForm } from "@/components/app/login-form";
import { auth } from "@/lib/auth";
import { getHomeRouteForRole } from "@/lib/permissions";

export default async function LoginPage() {
  const session = await auth();
  const roleCode = session?.user?.roleCode;

  if (roleCode) {
    redirect(getHomeRouteForRole(roleCode));
  }

  return <LoginForm />;
}
