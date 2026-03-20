import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

type EmailLogMetadata = {
  recipient?: string;
  subject?: string;
  bodyPreview?: string;
  applicationId?: string | null;
};

function parseEmailLogMetadata(value: unknown): EmailLogMetadata {
  if (!value || typeof value !== "object") {
    return {};
  }

  const metadata = value as Record<string, unknown>;
  return {
    recipient: typeof metadata.recipient === "string" ? metadata.recipient : undefined,
    subject: typeof metadata.subject === "string" ? metadata.subject : undefined,
    bodyPreview: typeof metadata.bodyPreview === "string" ? metadata.bodyPreview : undefined,
    applicationId: typeof metadata.applicationId === "string" ? metadata.applicationId : null
  };
}

export default async function EmailSimulationLogPage() {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: "EMAIL_SIMULATION" },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Simulation Log"
        description="Internal outbound-email style records captured for major workflow events."
      />

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        {logs.length ? (
          <div className="space-y-3">
            {logs.map((log) => {
              const metadata = parseEmailLogMetadata(log.metadata);
              return (
                <div key={log.id} className="rounded-lg border p-4">
                  <p className="text-sm"><span className="font-medium">Recipient:</span> {metadata.recipient ?? "N/A"}</p>
                  <p className="text-sm"><span className="font-medium">Subject:</span> {metadata.subject ?? "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{metadata.bodyPreview ?? "No body preview logged."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
                  </p>
                  {metadata.applicationId ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Related application:{" "}
                      <Link href={`/workspace/queue/${metadata.applicationId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                        Open workspace detail
                      </Link>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No simulated email records yet.</p>
        )}
      </div>
    </div>
  );
}
