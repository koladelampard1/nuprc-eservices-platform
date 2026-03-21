import type { ReactNode } from "react";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-6xl bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.12),_transparent_45%)] px-4 py-10">{children}</main>;
}
