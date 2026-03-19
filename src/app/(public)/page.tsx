import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">NUPRC</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Digital E-Services Platform</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Trusted regulatory infrastructure for external operators, internal reviewers, and platform administrators.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login">
            <Button size="lg">Access Demo</Button>
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["External Operator Portal", "Initiate applications, upload records later, and track service progress."],
          ["Regulatory Workspace", "Prioritize queues, issue clarifications, and monitor decisions."],
          ["Admin Console", "Control access, service catalogues, and audit-readiness posture."]
        ].map(([title, description]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">MVP foundation scaffolded for chairman demo.</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
