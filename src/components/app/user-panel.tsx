"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function UserPanel() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="mt-6 rounded-md border bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-800">{session.user.name ?? "Authenticated User"}</p>
      <p className="text-xs text-muted-foreground">{session.user.roleCode}</p>
      <Button
        className="mt-3 w-full"
        size="sm"
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
