import type { ReactNode } from "react";

import { ShellLayout } from "@/components/layouts/shell-layout";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <ShellLayout
      sidebarTitle="Regulatory Workspace"
      navItems={[
        { href: "/workspace/dashboard", label: "Dashboard" },
        { href: "/workspace/queue", label: "Review Queue" }
      ]}
      headerTitle="Internal Review Workspace"
      headerSubtitle="Coordinate assessments, track SLA performance, and issue decisions."
    >
      {children}
    </ShellLayout>
  );
}
