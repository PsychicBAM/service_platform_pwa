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
import { categoryLabel } from "@/components/admin/services/serviceCategories";
import type { AdminServiceRead, ServiceType } from "@/types/api";
import { formatDuration } from "@/utils/format";

export { formatDateRangeLabel, formatFileDate, getCompareRange, isInRange };
export type { DateRange };

export type DateRangeOption = AnalyticsDateRangeOption | "all_time";
export type ServiceStatusFilter = "all" | "active" | "inactive";
export type ServiceTypeFilter = "all" | ServiceType;
export type ServiceTabFilter = "all" | "active" | "inactive" | "booking" | "order";
export type ServiceCategoryFilter = "all" | "uncategorized" | string;

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: "all_time", label: "All time" },
  ...ANALYTICS_DATE_RANGE_OPTIONS,
];

export const STATUS_SELECT_OPTIONS: Array<{ value: ServiceStatusFilter; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Hidden" },
];

export const TYPE_SELECT_OPTIONS: Array<{ value: ServiceTypeFilter; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "booking", label: "Booking" },
  { value: "order", label: "Request" },
];

export function getDateRange(option: DateRangeOption, now = new Date()): DateRange | null {
  if (option === "all_time") {
    return null;
  }
  return getAnalyticsDateRange(option, now);
}

export function percentChange(current: number, previous: number): string | null {
  if (previous === 0) {
    if (current === 0) return "→ 0";
    return `↑ ${current}`;
  }
  const delta = current - previous;
  if (delta === 0) return "No change";
  const pct = Math.round((delta / previous) * 100);
  if (pct > 0) return `↑ ${pct}%`;
  return `↓ ${Math.abs(pct)}%`;
}

export function matchesServiceSearch(service: AdminServiceRead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    service.name.toLowerCase().includes(q) ||
    (service.description ?? "").toLowerCase().includes(q) ||
    categoryLabel(service.category).toLowerCase().includes(q)
  );
}

export function matchesServiceTab(service: AdminServiceRead, tab: ServiceTabFilter): boolean {
  if (tab === "all") return true;
  if (tab === "active") return service.is_active;
  if (tab === "inactive") return !service.is_active;
  return service.type === tab;
}

export function serviceDurationLabel(service: AdminServiceRead): string {
  if (service.type !== "booking") return "—";
  return formatDuration(service.duration_minutes) || "—";
}

export function formatServiceMoney(cents: number | null | undefined, currency: string): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

export function formatServiceDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function downloadServicesCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function averageServicePriceCents(services: AdminServiceRead[]): number | null {
  const priced = services.filter(
    (service) => service.price_type === "fixed" && service.price_cents != null,
  );
  if (priced.length === 0) return null;
  const total = priced.reduce((sum, service) => sum + (service.price_cents ?? 0), 0);
  return Math.round(total / priced.length);
}
