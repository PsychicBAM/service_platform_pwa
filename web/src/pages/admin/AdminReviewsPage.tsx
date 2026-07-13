import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminReviews, updateAdminReviewStatus } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { ReviewStatus } from "@/types/api";
import { getAdminServiceErrorMessage, getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const STATUS_FILTERS: Array<{ value: "all" | ReviewStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-brand-600 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminReviewsPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-reviews", businessId, statusFilter],
    queryFn: () =>
      listAdminReviews(
        businessId!,
        statusFilter === "all" ? undefined : { status: statusFilter },
      ),
    enabled: Boolean(businessId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      updateAdminReviewStatus(businessId!, reviewId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews", businessId] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(getAdminServiceErrorMessage(err, "Could not update review."));
    },
  });

  const reviews = data ?? [];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Reviews</h2>

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={statusFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setActionError(null);
            }}
          />
        ))}
      </div>

      {isLoading ? <LoadingState message="Loading reviews…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load reviews"
          message={getMeErrorMessage(error, "Unable to load reviews")}
        />
      ) : null}

      {!isLoading && !isError && reviews.length === 0 ? (
        <EmptyState title="No reviews yet." />
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              data-testid="admin-review-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{review.customer_name}</p>
                <StatusBadge status={review.status} kind="review" />
              </div>
              <p className="mt-2 text-sm font-semibold text-amber-700">{review.rating} ★</p>
              {review.service_name ? (
                <p className="mt-1 text-sm text-slate-700">{review.service_name}</p>
              ) : null}
              {review.booking_reference ? (
                <p className="mt-1 text-xs text-slate-500">Booking {review.booking_reference}</p>
              ) : null}
              {review.order_reference ? (
                <p className="mt-1 text-xs text-slate-500">Order {review.order_reference}</p>
              ) : null}
              {review.comment ? (
                <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">{formatDateTimeLabel(review.created_at)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {review.status === "published" ? (
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ reviewId: review.id, status: "hidden" })}
                    disabled={updateMutation.isPending}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    data-testid={`admin-review-hide-${review.id}`}
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      updateMutation.mutate({ reviewId: review.id, status: "published" })
                    }
                    disabled={updateMutation.isPending}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    data-testid={`admin-review-publish-${review.id}`}
                  >
                    Publish
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

