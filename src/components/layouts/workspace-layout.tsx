import type { ReactNode } from "react";

import { ShellLayout } from "@/components/layouts/shell-layout";

export function WorkspaceLayout({ children, unreadCount }: { children: ReactNode; unreadCount: number }) {
  return (
    <ShellLayout
      sidebarTitle="Regulatory Workspace"
      navItems={[
        { href: "/workspace/dashboard", label: "Dashboard" },
        { href: "/workspace/queue", label: "Review Queue" },
        { href: "/workspace/notifications", label: "Notifications", badgeCount: unreadCount }
      ]}
      headerTitle="Internal Review Workspace"
      headerSubtitle="Coordinate assessments, track SLA performance, and issue decisions."
    >
      {children}
    </ShellLayout>
  );
}
