export type DateRangeOption =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "this_year";

export type CompareOption = "previous_period" | "previous_month" | "none";

export type ChartGranularity = "daily" | "weekly" | "monthly";

export type DateRange = { start: Date; end: Date };

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
];

export const COMPARE_OPTIONS: Array<{ value: CompareOption; label: string }> = [
  { value: "previous_period", label: "Previous period" },
  { value: "previous_month", label: "Previous month" },
  { value: "none", label: "No comparison" },
];

export const CHART_GRANULARITY_OPTIONS: Array<{ value: ChartGranularity; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getDateRange(option: DateRangeOption, now = new Date()): DateRange {
  const end = endOfDay(now);
  const start = startOfDay(now);

  switch (option) {
    case "last_7_days":
      start.setDate(start.getDate() - 6);
      break;
    case "last_30_days":
      start.setDate(start.getDate() - 29);
      break;
    case "last_90_days":
      start.setDate(start.getDate() - 89);
      break;
    case "this_month":
      start.setDate(1);
      break;
    case "last_month": {
      start.setMonth(start.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(lastMonthEnd) };
    }
    case "this_year":
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(start.getDate() - 29);
  }

  return { start, end };
}

export function formatDateRangeLabel(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${range.start.toLocaleDateString("en-US", opts)} – ${range.end.toLocaleDateString("en-US", opts)}`;
}

export function getCompareRange(option: CompareOption, current: DateRange): DateRange | null {
  if (option === "none") {
    return null;
  }

  const durationMs = current.end.getTime() - current.start.getTime();

  if (option === "previous_month") {
    const start = new Date(current.start);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(current.end);
    end.setMonth(end.getMonth() - 1);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  // previous_period: same length immediately before current range
  const end = new Date(current.start.getTime() - 1);
  const start = new Date(end.getTime() - durationMs);
  return { start: startOfDay(start), end: endOfDay(end) };
}

export function isInRange(iso: string, range: DateRange): boolean {
  const time = new Date(iso).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildBuckets(
  range: DateRange,
  granularity: ChartGranularity,
): { keys: string[]; labels: string[] } {
  const keys: string[] = [];
  const labels: string[] = [];
  const cursor = startOfDay(range.start);
  const end = startOfDay(range.end);

  if (granularity === "monthly") {
    cursor.setDate(1);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      keys.push(key);
      labels.push(
        cursor.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { keys, labels };
  }

  if (granularity === "weekly") {
    // Align to Monday-start week containing range.start
    const day = cursor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    cursor.setDate(cursor.getDate() + diff);
    while (cursor <= end) {
      const key = dayKey(cursor);
      keys.push(key);
      labels.push(
        `W/c ${cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
      );
      cursor.setDate(cursor.getDate() + 7);
    }
    return { keys, labels };
  }

  while (cursor <= end) {
    keys.push(dayKey(cursor));
    labels.push(
      cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return { keys, labels };
}

function bucketKeyForDate(iso: string, granularity: ChartGranularity): string {
  const date = new Date(iso);
  if (granularity === "monthly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "weekly") {
    const cursor = startOfDay(date);
    const day = cursor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    cursor.setDate(cursor.getDate() + diff);
    return dayKey(cursor);
  }
  return dayKey(date);
}

export function countByBuckets(
  dates: string[],
  keys: string[],
  granularity: ChartGranularity,
): number[] {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<string, number>;
  for (const iso of dates) {
    const key = bucketKeyForDate(iso, granularity);
    if (key in counts) {
      counts[key] += 1;
    }
  }
  return keys.map((key) => counts[key] ?? 0);
}

/** Aggregate a dense daily-like series into fewer points for demo data. */
export function groupSeriesByGranularity(
  values: number[],
  granularity: ChartGranularity,
): number[] {
  if (granularity === "daily" || values.length <= 1) {
    return values;
  }
  const size = granularity === "weekly" ? 7 : Math.max(4, Math.ceil(values.length / 6));
  const grouped: number[] = [];
  for (let i = 0; i < values.length; i += size) {
    const chunk = values.slice(i, i + size);
    grouped.push(chunk.reduce((sum, value) => sum + value, 0));
  }
  return grouped.length > 0 ? grouped : values;
}

export function groupLabelsByGranularity(
  labels: string[],
  granularity: ChartGranularity,
): string[] {
  if (granularity === "daily" || labels.length <= 1) {
    return labels;
  }
  const size = granularity === "weekly" ? 7 : Math.max(4, Math.ceil(labels.length / 6));
  const grouped: string[] = [];
  for (let i = 0; i < labels.length; i += size) {
    grouped.push(labels[i] ?? "");
  }
  return grouped.length > 0 ? grouped : labels;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAnalyticsCsv(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatFileDate(date = new Date()): string {
  return dayKey(date);
}
