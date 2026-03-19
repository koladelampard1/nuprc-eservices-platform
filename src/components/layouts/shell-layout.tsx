"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";

type NavItem = { href: string; label: string };

export function ShellLayout({
  sidebarTitle,
  navItems,
  headerTitle,
  headerSubtitle,
  children
}: {
  sidebarTitle: string;
  navItems: NavItem[];
  headerTitle: string;
  headerSubtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar title={sidebarTitle} items={navItems} pathname={pathname} />
      <main className="flex-1 p-6">
        <AppHeader title={headerTitle} subtitle={headerSubtitle} />
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
