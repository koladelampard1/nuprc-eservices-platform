import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, ClipboardCheck, Gauge, Landmark, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const accessOptions = [
  {
    title: "Operator Portal",
    description: "For regulated companies to initiate applications, upload documents, and monitor progress.",
    href: "/login?role=operator"
  },
  {
    title: "Regulatory Workspace",
    description: "For review teams to assess submissions, request clarifications, and drive decisions.",
    href: "/login?role=workspace"
  },
  {
    title: "Admin Console",
    description: "For platform administrators managing users, service configurations, and audit posture.",
    href: "/login?role=admin"
  }
] as const;

const highlights = [
  { icon: Gauge, title: "Fast Throughput", description: "Structured workflows reduce bottlenecks and improve service turnaround time." },
  { icon: ShieldCheck, title: "Regulatory Trust", description: "Role-based access and auditable decision trails maintain governance integrity." },
  { icon: BadgeCheck, title: "Enterprise-Ready", description: "Formal design language and consistent UX built for executive demonstrations." }
] as const;

const workflow = [
  "Operator initiates service application with required documentation.",
  "Regulatory teams validate submissions and issue clarifications where needed.",
  "Approvals, decisions, payment records, and letters are generated with full traceability."
];

export default function HomePage() {
  return (
    <div className="space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/20 bg-gradient-to-br from-[#042817] via-[#063a22] to-[#0b5d36] p-10 text-white shadow-2xl md:p-14">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative max-w-4xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/35 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Landmark className="h-3.5 w-3.5" /> NUPRC Regulatory Digital Infrastructure
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Unified digital platform for upstream licensing, compliance, and regulatory service delivery.
          </h1>
          <p className="max-w-3xl text-base text-slate-200 md:text-lg">
            A unified, role-secure operating platform that enables operators, reviewers, and administrators to execute
            petroleum regulatory services with speed, transparency, and institutional confidence.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?role=operator">
              <Button size="lg" className="bg-white text-[#07351f] hover:bg-emerald-50">
                Launch Platform <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#access-pathways">
              <Button size="lg" variant="outline" className="border-white/45 bg-white/5 text-white hover:bg-white/15">
                Explore Access Pathways
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="border-emerald-100/90 bg-white/95 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="w-fit rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section id="access-pathways" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">User Access Pathways</h2>
          <p className="text-sm text-muted-foreground">Choose the right environment for your role. Each option applies context on sign-in.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {accessOptions.map((item) => (
            <Card key={item.title} className="group border-emerald-100 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={item.href}>
                  <Button className="w-full justify-between bg-gradient-to-r from-primary to-emerald-700 hover:from-primary/95 hover:to-emerald-700/95">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Simple Process Flow</CardTitle>
            <CardDescription>From submission to decision, users can understand what happens next at every stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {workflow.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/35 p-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{index + 1}</span>
                <p className="text-slate-700">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Platform Value</CardTitle>
            <CardDescription>Built for digital public service excellence with strong regulatory credibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p className="rounded-lg border border-emerald-100 bg-emerald-50/35 p-3">Centralized application processing across operators, workspaces, and admins.</p>
            <p className="rounded-lg border border-emerald-100 bg-emerald-50/35 p-3">Transparent milestones, payment records, and communication history for every application.</p>
            <p className="rounded-lg border border-emerald-100 bg-emerald-50/35 p-3">Consistent governance controls with clear visibility into operational and compliance metrics.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
