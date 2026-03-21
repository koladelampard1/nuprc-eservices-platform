import { Inbox } from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-slate-300 bg-slate-50/60">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl text-slate-800">{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
