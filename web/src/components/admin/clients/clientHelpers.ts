import {
  DATE_RANGE_OPTIONS as ANALYTICS_DATE_RANGE_OPTIONS,
  formatDateRangeLabel,
  formatFileDate,
  getCompareRange,
  getDateRange as getAnalyticsDateRange,
  isInRange,
  type DateRange,
  type DateRangeOption as AnalyticsDateRangeOption,
} from "@/components/admin/analytics/adminAnalyticsHelpers";
import type { ClientDetail, ClientListItem, ClientSource, ReviewRead } from "@/types/api";

export { formatDateRangeLabel, formatFileDate, getCompareRange, isInRange };
export type { DateRange };

export type DateRangeOption = AnalyticsDateRangeOption | "all_time";

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: "all_time", label: "All time" },
  ...ANALYTICS_DATE_RANGE_OPTIONS,
];

export function getDateRange(option: DateRangeOption, now = new Date()): DateRange | null {
  if (option === "all_time") {
    return null;
  }
  return getAnalyticsDateRange(option, now);
}

export type ClientLifecycleStatus = "active" | "new" | "returning" | "inactive";
export type ClientStatusFilter = "all" | ClientLifecycleStatus;
export type ClientTabFilter = "all" | ClientLifecycleStatus;
export type ClientSourceFilter = "all" | ClientSource;

export const CLIENT_STATUS_SELECT_OPTIONS: Array<{
  value: ClientStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "new", label: "New" },
  { value: "returning", label: "Returning" },
  { value: "inactive", label: "Inactive" },
];

export const CLIENT_SOURCE_OPTIONS: Array<{ value: ClientSourceFilter; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "guest", label: "Guest" },
  { value: "registered", label: "Registered" },
  { value: "admin_created", label: "Admin created" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_WINDOW_MS = 30 * DAY_MS;
const ACTIVE_WINDOW_MS = 90 * DAY_MS;

export function customerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatSource(source: ClientSource): string {
  if (source === "admin_created") return "Admin created";
  if (source === "registered") return "Registered";
  return "Guest";
}

export function formatClientDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatClientTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function activityCount(client: ClientListItem): number {
  return client.bookings_count + client.orders_count;
}

export function isNewClient(client: ClientListItem, range: DateRange | null, now = new Date()): boolean {
  if (range) {
    return isInRange(client.created_at, range);
  }
  return now.getTime() - new Date(client.created_at).getTime() <= NEW_WINDOW_MS;
}

export function isReturningClient(client: ClientListItem): boolean {
  return activityCount(client) >= 2;
}

export function isActiveClient(client: ClientListItem, now = new Date()): boolean {
  if (!client.last_activity_at) {
    return false;
  }
  return now.getTime() - new Date(client.last_activity_at).getTime() <= ACTIVE_WINDOW_MS;
}

export function isInactiveClient(client: ClientListItem, now = new Date()): boolean {
  return !isActiveClient(client, now);
}

/** Primary status badge: New > Returning > Active > Inactive */
export function deriveClientStatus(
  client: ClientListItem,
  range: DateRange | null,
  now = new Date(),
): ClientLifecycleStatus {
  if (isNewClient(client, range, now)) return "new";
  if (isReturningClient(client)) return "returning";
  if (isActiveClient(client, now)) return "active";
  return "inactive";
}

export function matchesClientTab(
  client: ClientListItem,
  tab: ClientTabFilter,
  range: DateRange | null,
  now = new Date(),
): boolean {
  if (tab === "all") return true;
  if (tab === "new") return isNewClient(client, range, now);
  if (tab === "returning") return isReturningClient(client);
  if (tab === "active") return isActiveClient(client, now);
  if (tab === "inactive") return isInactiveClient(client, now);
  return true;
}

export function matchesClientStatusFilter(
  client: ClientListItem,
  status: ClientStatusFilter,
  range: DateRange | null,
  now = new Date(),
): boolean {
  return matchesClientTab(client, status, range, now);
}

export function matchesClientSearch(client: ClientListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [client.full_name, client.email, client.phone, client.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function percentChange(current: number, previous: number): string | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return "↑ new";
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(delta));
  if (delta > 0) return `↑ ${rounded}%`;
  if (delta < 0) return `↓ ${rounded}%`;
  return "→ 0%";
}

export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadClientsCsv(
  filename: string,
  rows: Array<Array<string | number>>,
): void {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n");
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

export type ClientReviewStats = {
  count: number;
  average: number | null;
};

function emptyReviewStats(): ClientReviewStats {
  return { count: 0, average: null };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Match reviews to list clients by exact customer name (only shared stable field). */
export function buildClientReviewStatsByName(
  clients: ClientListItem[],
  reviews: ReviewRead[],
): Map<string, ClientReviewStats> {
  const buckets = new Map<string, { count: number; sum: number }>();
  for (const review of reviews) {
    const key = normalizeName(review.customer_name);
    if (!key) continue;
    const current = buckets.get(key) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += review.rating;
    buckets.set(key, current);
  }

  const result = new Map<string, ClientReviewStats>();
  for (const client of clients) {
    const bucket = buckets.get(normalizeName(client.full_name));
    if (!bucket || bucket.count === 0) {
      result.set(client.id, emptyReviewStats());
      continue;
    }
    result.set(client.id, {
      count: bucket.count,
      average: bucket.sum / bucket.count,
    });
  }
  return result;
}

/**
 * Prefer booking/order id matches from client detail summaries;
 * fall back to exact customer name.
 */
export function getDetailReviewStats(
  client: ClientDetail,
  reviews: ReviewRead[],
): ClientReviewStats {
  const bookingIds = new Set(client.bookings.map((booking) => booking.id));
  const orderIds = new Set(client.orders.map((order) => order.id));
  const nameKey = normalizeName(client.full_name);

  const matched = reviews.filter((review) => {
    if (review.booking_id && bookingIds.has(review.booking_id)) return true;
    if (review.order_id && orderIds.has(review.order_id)) return true;
    return normalizeName(review.customer_name) === nameKey;
  });

  if (matched.length === 0) {
    return emptyReviewStats();
  }
  const sum = matched.reduce((total, review) => total + review.rating, 0);
  return {
    count: matched.length,
    average: sum / matched.length,
  };
}

export function averageReviewsPerClient(
  clients: ClientListItem[],
  statsByClientId: Map<string, ClientReviewStats>,
): number {
  if (clients.length === 0) return 0;
  const total = clients.reduce(
    (sum, client) => sum + (statsByClientId.get(client.id)?.count ?? 0),
    0,
  );
  return total / clients.length;
}

/** Client records have no location fields today. */
export function clientLocationLabel(_client: ClientListItem | ClientDetail): string | null {
  return null;
}
