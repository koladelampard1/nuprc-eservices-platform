import Link from "next/link";

import { UserPanel } from "@/components/app/user-panel";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  badgeCount?: number;
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
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-6">
      <div>
        <h2 className="mb-6 px-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">{title}</h2>
        <nav className="space-y-1.5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-700 hover:bg-white hover:shadow-sm"
                )}
              >
                <span>{item.label}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      active ? "bg-white/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    )}
                  >
                    {item.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <UserPanel />
    </aside>
  );
}
