import type { ReactNode } from "react";

import { PortalLayout } from "@/components/layouts/portal-layout";

export default function PortalRouteLayout({ children }: { children: ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
