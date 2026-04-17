export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

export function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0
  }).format(value);
}

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function toCsv(rows: CsvRow[]) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: CsvValue) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = toCsv(rows);
  if (!csv) {
    return false;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export function groupCounts<T>(items: T[], resolveKey: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = resolveKey(item) ?? "Unassigned";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function isDueWithinDays(value: string | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const dueDate = new Date(value);
  const today = new Date();
  const difference = dueDate.getTime() - today.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return difference >= 0 && difference <= days * dayMs;
}

export function isOverdue(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
}
