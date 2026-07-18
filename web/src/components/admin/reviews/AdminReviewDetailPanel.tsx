import type { ReactNode } from "react";
import { ReviewStarRating } from "@/components/admin/reviews/ReviewStarRating";
import {
  customerInitials,
  formatReviewDate,
  formatReviewTime,
  reviewReferenceLabel,
  reviewSourceLabel,
} from "@/components/admin/reviews/reviewHelpers";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReviewRead, ReviewStatus } from "@/types/api";
import { formatDateTimeLabel } from "@/utils/format";

type AdminReviewDetailPanelProps = {
  review: ReviewRead;
  acting: boolean;
  onClose: () => void;
  onRequestStatusChange: (status: ReviewStatus) => void;
};

export function AdminReviewDetailPanel({
  review,
  acting,
  onClose,
  onRequestStatusChange,
}: AdminReviewDetailPanelProps) {
  const initials = customerInitials(review.customer_name) || "?";
  const source = reviewSourceLabel(review);

  return (
    <div
      className="h-fit space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="admin-review-detail-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0 space-y-2">
          <p className="truncate text-base font-semibold text-gray-900">
            {reviewReferenceLabel(review)}
          </p>
          <StatusBadge status={review.status} kind="review" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-lg leading-none text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{review.customer_name}</p>
          {review.booking_reference ? (
            <p className="truncate text-sm text-gray-500">Booking {review.booking_reference}</p>
          ) : null}
          {review.order_reference ? (
            <p className="truncate text-sm text-gray-500">Order {review.order_reference}</p>
          ) : null}
        </div>
      </div>

      <dl className="space-y-3.5 border-b border-gray-100 pb-4 text-sm">
        <DetailRow label="Service">{review.service_name || "—"}</DetailRow>
        <DetailRow label="Date">
          {formatReviewDate(review.created_at)} at {formatReviewTime(review.created_at)}
        </DetailRow>
        <DetailRow label="Source">{source}</DetailRow>
        <DetailRow label="Rating">
          <span className="inline-flex items-center gap-2">
            <ReviewStarRating rating={review.rating} size="md" />
            <span className="font-semibold text-gray-900">{review.rating.toFixed(1)}</span>
          </span>
        </DetailRow>
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3">
          <dt className="pt-2 text-gray-500">Review</dt>
          <dd className="min-w-0 rounded-xl bg-gray-50 px-3.5 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
            {review.comment?.trim() || "No written review."}
          </dd>
        </div>
      </dl>

      <div className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Visibility</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {review.status === "published" ? "Public on your site" : "Hidden from public view"}
            </p>
          </div>
          <StatusBadge status={review.status} kind="review" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">Actions</p>
        <div className="grid grid-cols-1 gap-2.5">
          {review.status === "published" ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => onRequestStatusChange("hidden")}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              data-testid="admin-review-detail-hide"
            >
              Hide Review
            </button>
          ) : (
            <button
              type="button"
              disabled={acting}
              onClick={() => onRequestStatusChange("published")}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-700 bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              data-testid="admin-review-detail-publish"
            >
              Publish Review
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-900">Review history</p>
        <p className="mt-1.5 text-sm text-gray-500">
          {review.status === "published" ? "Published" : "Hidden"}{" "}
          {formatDateTimeLabel(review.updated_at || review.created_at)}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3">
      <dt className="pt-0.5 text-gray-500">{label}</dt>
      <dd className="min-w-0 font-medium text-gray-900">{children}</dd>
    </div>
  );
}
