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
import type { AdminBookingListItem, AdminServiceRead, BookingStatus } from "@/types/api";
import { resolveServiceImagePreviewUrl } from "@/lib/serviceImage";

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

export type BookingStatusFilter = "all" | BookingStatus;

export const BOOKING_STATUS_CHIP_FILTERS: Array<{ value: BookingStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export const BOOKING_STATUS_SELECT_OPTIONS: Array<{
  value: BookingStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export function formatMoney(cents: number | null | undefined, currency: string): string {
  if (cents == null) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "AED",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency || "AED"}`;
  }
}

export function formatDurationMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours}h ${remainder}m`;
}

export function customerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function matchesBookingSearch(booking: AdminBookingListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    booking.reference,
    booking.client_name,
    booking.client_email,
    booking.client_phone,
    booking.service_name,
    booking.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function findServiceByName(
  services: AdminServiceRead[],
  serviceName: string,
): AdminServiceRead | undefined {
  return services.find((service) => service.name === serviceName);
}

export function serviceThumbUrl(service: AdminServiceRead | undefined): string | null {
  if (!service?.image) {
    return null;
  }
  return resolveServiceImagePreviewUrl(service.image) || null;
}

export function percentChange(current: number, previous: number): string | null {
  if (previous <= 0 && current <= 0) {
    return null;
  }
  if (previous <= 0) {
    return "↑ new";
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(delta));
  if (delta > 0) {
    return `↑ ${rounded}%`;
  }
  if (delta < 0) {
    return `↓ ${rounded}%`;
  }
  return "→ 0%";
}

export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadBookingsCsv(
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

export function countByStatus(
  bookings: AdminBookingListItem[],
  status: BookingStatus | "rescheduled",
): number {
  if (status === "rescheduled") {
    return 0;
  }
  return bookings.filter((booking) => booking.status === status).length;
}
