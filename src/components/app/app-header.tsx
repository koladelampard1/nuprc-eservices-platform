export function AppHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 rounded-xl border bg-white px-6 py-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
