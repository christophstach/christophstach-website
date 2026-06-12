const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);

  return monthFormatter.format(new Date(year ?? 0, (month ?? 1) - 1));
}
