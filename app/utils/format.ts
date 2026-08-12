const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);

  return monthFormatter.format(new Date(year ?? 0, (month ?? 1) - 1));
}

/** Whole months between two ISO month strings; an omitted end means "until today". */
export function monthsBetween(from: string, to?: string): number {
  const [fromYear = 0, fromMonth = 1] = from.split("-").map(Number);
  const now = new Date();
  const [toYear = now.getFullYear(), toMonth = now.getMonth() + 1] = to
    ? to.split("-").map(Number)
    : [];

  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}
