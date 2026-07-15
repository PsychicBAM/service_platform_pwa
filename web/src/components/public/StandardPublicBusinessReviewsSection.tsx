import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/marketplace/StarRating";
import { formatDateTimeLabel } from "@/utils/format";
import type { PublicReviewItem, PublicReviewSummary } from "@/types/api";

type StandardPublicBusinessReviewsSectionProps = {
  summary: PublicReviewSummary | null;
  reviews: PublicReviewItem[];
  isLoading?: boolean;
};

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`text-sm ${rating >= index + 1 ? "text-amber-400" : "text-slate-300"}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function StandardPublicBusinessReviewsSection({
  summary,
  reviews,
  isLoading = false,
}: StandardPublicBusinessReviewsSectionProps) {
  const averageRating = summary?.average_rating ?? null;
  const reviewCount = summary?.review_count ?? 0;
  const hasSummary = averageRating != null && reviewCount > 0;
  const hasReviews = reviews.length > 0;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      data-testid="standard-public-reviews-section"
    >
      <h2 className="text-lg font-semibold text-slate-900 md:text-xl">Reviews</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading reviews…</p>
      ) : null}

      {!isLoading && hasSummary ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4" data-testid="standard-public-reviews-summary">
          <StarRating rating={averageRating} reviewCount={reviewCount} size="md" />
          <p className="mt-2 text-sm text-slate-600">
            {averageRating?.toFixed(1)} average · {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      {!isLoading && hasReviews ? (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
              data-testid="public-review"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{review.customer_name}</p>
                  {review.service_name ? (
                    <p className="mt-1 text-sm text-slate-500">{review.service_name}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <ReviewStars rating={review.rating} />
                  <p className="mt-1 text-xs text-slate-500">{formatDateTimeLabel(review.created_at)}</p>
                </div>
              </div>
              {review.comment ? (
                <p
                  className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-700"
                  data-testid="standard-public-review-comment"
                >
                  {review.comment}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && !hasReviews ? (
        <div className="mt-4" data-testid="standard-public-reviews-empty">
          <EmptyState
            title="No reviews yet"
            description="Reviews will appear here after completed bookings or requests."
          />
        </div>
      ) : null}
    </section>
  );
}
