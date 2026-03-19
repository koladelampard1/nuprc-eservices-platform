import type { ReactNode } from "react";

import { WorkspaceLayout } from "@/components/layouts/workspace-layout";

export default function WorkspaceRouteLayout({ children }: { children: ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
