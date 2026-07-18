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
import type { AdminOrderListItem, AdminServiceRead, OrderStatus } from "@/types/api";

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

export type OrderStatusFilter = "all" | OrderStatus;
export type OrderTabFilter = "all" | "new" | "in_progress" | "completed" | "cancelled";

export const ORDER_STATUS_SELECT_OPTIONS: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

export const ORDER_STATUS_CHIP_FILTERS: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

export function isNewRequestStatus(status: OrderStatus): boolean {
  return status === "submitted" || status === "pending_payment";
}

export function isInProgressGroupStatus(status: OrderStatus): boolean {
  return status === "accepted" || status === "in_progress";
}

export function isCancelledGroupStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "declined";
}

export function matchesOrderTab(status: OrderStatus, tab: OrderTabFilter): boolean {
  if (tab === "all") return true;
  if (tab === "new") return isNewRequestStatus(status);
  if (tab === "in_progress") return isInProgressGroupStatus(status);
  if (tab === "completed") return status === "completed";
  if (tab === "cancelled") return isCancelledGroupStatus(status);
  return true;
}

export function formatMoney(cents: number | null | undefined, currency: string): string {
  if (cents == null) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency || "USD"}`;
  }
}

export function customerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function matchesOrderSearch(order: AdminOrderListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    order.reference,
    order.client_name,
    order.client_email,
    order.client_phone,
    order.service_name,
    order.id,
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

export function percentChange(current: number, previous: number): string | null {
  if (previous <= 0 && current <= 0) {
    return null;
  }
  if (previous <= 0) {
    return "↑ new";
  }
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

export function downloadOrdersCsv(
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

export function consentLabel(order: AdminOrderListItem): string {
  if (order.has_review) return "reviewed";
  if (order.review_request_email_sent_at) return "review_request_sent";
  if (!order.follow_up_email_consent) return "no_consent";
  if (!order.client_email) return "no_email";
  if (order.can_review) return "eligible";
  return "not_eligible";
}

export function extractPreferredDate(formData: Record<string, unknown> | null | undefined): string | null {
  if (!formData) return null;
  for (const key of ["preferred_date", "preferredDate", "preferred_at", "date"]) {
    const value = formData[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractBudgetLabel(
  formData: Record<string, unknown> | null | undefined,
): string | null {
  if (!formData) return null;
  for (const key of ["budget", "budget_range", "budgetRange"]) {
    const value = formData[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export type OrderAttachment = {
  name: string;
  sizeLabel?: string | null;
  url?: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractAttachments(
  formData: Record<string, unknown> | null | undefined,
): OrderAttachment[] {
  if (!formData) return [];

  const raw =
    formData.attachments ?? formData.files ?? formData.attachment ?? formData.file ?? null;

  if (typeof raw === "string" && raw.trim()) {
    return [
      {
        name: raw.trim(),
        sizeLabel: null,
        url: raw.startsWith("http") ? raw : null,
      },
    ];
  }

  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const attachments: OrderAttachment[] = [];

  for (const item of list) {
    if (typeof item === "string" && item.trim()) {
      attachments.push({
        name: item.trim(),
        sizeLabel: null,
        url: item.startsWith("http") ? item : null,
      });
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const name =
      (typeof record.name === "string" && record.name) ||
      (typeof record.filename === "string" && record.filename) ||
      (typeof record.file_name === "string" && record.file_name) ||
      null;
    if (!name) {
      continue;
    }
    const url =
      (typeof record.url === "string" && record.url) ||
      (typeof record.href === "string" && record.href) ||
      null;
    const size =
      typeof record.size === "number"
        ? record.size
        : typeof record.size_bytes === "number"
          ? record.size_bytes
          : null;
    attachments.push({
      name,
      sizeLabel: size != null ? formatFileSize(size) : null,
      url,
    });
  }

  return attachments;
}
