import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, value, delta }: { title: string; value: string | number; delta?: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="font-medium text-slate-600">{title}</CardDescription>
        <CardTitle className="text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      {delta ? <CardContent className="text-sm text-muted-foreground">{delta}</CardContent> : null}
    </Card>
  );
}
