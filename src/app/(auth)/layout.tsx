import type { ReactNode } from "react";

import { PublicLayout } from "@/components/layouts/public-layout";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
