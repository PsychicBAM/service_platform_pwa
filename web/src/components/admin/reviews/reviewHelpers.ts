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
import type { ReviewRead, ReviewStatus } from "@/types/api";

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

export type ReviewStatusFilter = "all" | ReviewStatus;
export type ReviewTabFilter = "all" | ReviewStatus;
export type ReviewRatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
export type ReviewSourceFilter = "all" | "booking" | "order" | "direct";

export const REVIEW_STATUS_SELECT_OPTIONS: Array<{
  value: ReviewStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

export const REVIEW_RATING_OPTIONS: Array<{ value: ReviewRatingFilter; label: string }> = [
  { value: "all", label: "All Ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

export const REVIEW_SOURCE_OPTIONS: Array<{ value: ReviewSourceFilter; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "booking", label: "Booking" },
  { value: "order", label: "Order" },
  { value: "direct", label: "Direct" },
];

export function customerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatReviewTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function reviewSource(review: ReviewRead): ReviewSourceFilter {
  if (review.booking_id) return "booking";
  if (review.order_id) return "order";
  return "direct";
}

export function reviewSourceLabel(review: ReviewRead): string {
  const source = reviewSource(review);
  if (source === "booking") return "Booking";
  if (source === "order") return "Order";
  return "Direct";
}

export function reviewReferenceLabel(review: ReviewRead): string {
  if (review.booking_reference) return `Review from ${review.booking_reference}`;
  if (review.order_reference) return `Review from ${review.order_reference}`;
  return `Review #${review.id.slice(0, 8).toUpperCase()}`;
}

export function snippetText(comment: string | null, max = 90): string {
  if (!comment?.trim()) return "No written review";
  const text = comment.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function matchesReviewSearch(review: ReviewRead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    review.customer_name,
    review.service_name,
    review.comment,
    review.booking_reference,
    review.order_reference,
    review.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesReviewTab(status: ReviewStatus, tab: ReviewTabFilter): boolean {
  if (tab === "all") return true;
  return status === tab;
}

export function averageRating(reviews: ReviewRead[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

export function formatAverageRating(value: number | null): string {
  if (value == null) return "0.0";
  return value.toFixed(1);
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

export function averageRatingTrend(
  currentAvg: number | null,
  previousAvg: number | null,
): string | null {
  if (currentAvg == null && previousAvg == null) return null;
  if (previousAvg == null || previousAvg <= 0) {
    return currentAvg == null ? null : "↑ new";
  }
  if (currentAvg == null) return null;
  const delta = currentAvg - previousAvg;
  const rounded = Math.abs(delta).toFixed(1);
  if (delta > 0.04) return `↑ ${rounded}`;
  if (delta < -0.04) return `↓ ${rounded}`;
  return "→ 0.0";
}

export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadReviewsCsv(
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
