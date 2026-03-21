export function compactStateLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function formatShortDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function formatShortMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

export function buildRecentDays(days: number) {
  const dates: Date[] = [];
  const today = new Date();

  for (let idx = days - 1; idx >= 0; idx -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - idx);
    dates.push(date);
  }

  return dates;
}

export function buildRecentMonths(months: number) {
  const dates: Date[] = [];
  const today = new Date();

  for (let idx = months - 1; idx >= 0; idx -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - idx, 1);
    dates.push(date);
  }

  return dates;
}

export function groupDatesByLabel(items: Date[], labels: Date[], labeler: (date: Date) => string) {
  const counts = new Map(labels.map((date) => [labeler(date), 0]));

  items.forEach((item) => {
    const key = labeler(item);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return labels.map((date) => ({ label: labeler(date), value: counts.get(labeler(date)) ?? 0 }));
}
