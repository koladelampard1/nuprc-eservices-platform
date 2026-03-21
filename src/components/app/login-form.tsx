"use client";

import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { StateBanner } from "@/components/app/state-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getHomeRouteForRole } from "@/lib/permissions";

type RoleContext = "operator" | "workspace" | "admin";

const roleCopy: Record<RoleContext, { title: string; subtitle: string; chip: string; emailHint: string }> = {
  operator: {
    title: "Sign in to Operator Portal",
    subtitle: "Access application initiation, document upload, and submission tracking.",
    chip: "Operator Access",
    emailHint: "operator@deltaenergy.ng"
  },
  workspace: {
    title: "Sign in to Regulatory Workspace",
    subtitle: "Continue review operations, queue prioritization, and workflow decisions.",
    chip: "Regulatory Access",
    emailHint: "reviewer@nuprc.gov.ng"
  },
  admin: {
    title: "Sign in to Admin Console",
    subtitle: "Manage user accounts, service configuration, and governance settings.",
    chip: "Admin Access",
    emailHint: "admin@nuprc.gov.ng"
  }
};

function resolveRoleContext(roleContext?: string): RoleContext | null {
  if (roleContext === "operator" || roleContext === "workspace" || roleContext === "admin") {
    return roleContext;
  }

  return null;
}

export function LoginForm({ roleContext }: { roleContext?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resolvedRoleContext = useMemo(() => resolveRoleContext(roleContext), [roleContext]);
  const copy = resolvedRoleContext ? roleCopy[resolvedRoleContext] : {
    title: "Sign in to NUPRC Platform",
    subtitle: "Choose any seeded demo account. Password for all demo users: Demo@123.",
    chip: "Secure Sign-In",
    emailHint: "operator@deltaenergy.ng"
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const session = (await sessionResponse.json()) as { user?: { roleCode?: string } };
    const roleCode = session.user?.roleCode;

    if (!roleCode) {
      setError("Unable to resolve your account role. Please try again.");
      setIsLoading(false);
      return;
    }

    router.replace(getHomeRouteForRole(roleCode));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md pt-12">
      <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/35 shadow-lg shadow-emerald-900/10">
        <CardHeader className="space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> {copy.chip}
          </span>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder={copy.emailHint}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? <StateBanner tone="error" message={error} /> : null}
            <Button className="w-full bg-gradient-to-r from-primary to-emerald-700 hover:from-primary/95 hover:to-emerald-700/95" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Demo password for seeded accounts: <span className="font-semibold">Demo@123</span></p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
