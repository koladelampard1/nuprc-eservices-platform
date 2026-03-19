import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, value, delta }: { title: string; value: string | number; delta?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {delta ? <CardContent className="text-sm text-muted-foreground">{delta}</CardContent> : null}
    </Card>
  );
}
