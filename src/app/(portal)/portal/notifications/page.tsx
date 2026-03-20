import Link from "next/link";

import { markPortalNotificationReadAction } from "@/app/(portal)/portal/notifications/actions";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function PortalNotificationsPage() {
  const user = await requirePortalUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      application: {
        select: { id: true, referenceNo: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Stay informed on application milestones and reviewer feedback." />

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        {notifications.length ? (
          <div className="space-y-3">
            {notifications.map((item) => {
              const markAsRead = markPortalNotificationReadAction.bind(null, item.id);
              const href = item.applicationId ? `/portal/applications/${item.applicationId}` : "/portal/applications";
              return (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.application?.referenceNo ? `Application: ${item.application.referenceNo} • ` : ""}
                        {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.readAt ? "bg-slate-100 text-slate-600" : "bg-primary/10 text-primary"}`}>
                      {item.readAt ? "Read" : "Unread"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={href} className={cn("inline-flex", "h-9 items-center rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-muted")}>
                      Open Application
                    </Link>
                    {!item.readAt ? (
                      <form action={markAsRead}>
                        <Button type="submit" size="sm">Mark as read</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
