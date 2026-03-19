import Link from "next/link";

import { UserPanel } from "@/components/app/user-panel";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

export function AppSidebar({
  title,
  items,
  pathname
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r bg-white px-4 py-6">
      <div>
        <h2 className="mb-6 px-2 text-sm font-bold tracking-wide text-primary">{title}</h2>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <UserPanel />
    </aside>
  );
}
