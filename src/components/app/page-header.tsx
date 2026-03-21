export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </header>
  );
}
