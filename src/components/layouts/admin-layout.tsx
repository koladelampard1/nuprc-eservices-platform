import type { ReactNode } from "react";

import { ShellLayout } from "@/components/layouts/shell-layout";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ShellLayout
      sidebarTitle="Admin Console"
      navItems={[
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/services", label: "Services" },
        { href: "/admin/audit", label: "Audit" }
      ]}
      headerTitle="Platform Administration"
      headerSubtitle="Manage governance controls, identity, and service catalogue integrity."
    >
      {children}
    </ShellLayout>
  );
}
