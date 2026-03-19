import type { ReactNode } from "react";

import { ShellLayout } from "@/components/layouts/shell-layout";

export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <ShellLayout
      sidebarTitle="Operator Portal"
      navItems={[
        { href: "/portal/dashboard", label: "Dashboard" },
        { href: "/portal/services", label: "Services" },
        { href: "/portal/applications", label: "Applications" }
      ]}
      headerTitle="External Operator Services"
      headerSubtitle="Submit and track licensing workflows with transparency."
    >
      {children}
    </ShellLayout>
  );
}
