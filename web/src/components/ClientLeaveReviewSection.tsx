import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMyBookingReview, createMyOrderReview } from "@/api/meApi";
import { getMeErrorMessage } from "@/utils/errors";

const COMMENT_MAX_LENGTH = 2000;

type ReviewTargetType = "booking" | "order";

interface ClientLeaveReviewSectionProps {
  targetType: ReviewTargetType;
  targetId: string;
  canReview: boolean;
  hasReview: boolean;
  queryKeysToInvalidate: string[][];
}

export function ClientLeaveReviewSection({
  targetType,
  targetId,
  canReview,
  hasReview,
  queryKeysToInvalidate,
}: ClientLeaveReviewSectionProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        rating,
        comment: comment.trim() || undefined,
      };
      if (targetType === "booking") {
        return createMyBookingReview(targetId, payload);
      }
      return createMyOrderReview(targetId, payload);
    },
    onSuccess: async () => {
      setSubmitted(true);
      setIsOpen(false);
      setSubmitError(null);
      for (const queryKey of queryKeysToInvalidate) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  if (hasReview || submitted) {
    return (
      <p className="text-sm font-medium text-emerald-700" data-testid="review-submitted-label">
        Review submitted
      </p>
    );
  }

  if (!canReview) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync();
    } catch (error) {
      setSubmitError(getMeErrorMessage(error, "Could not submit review."));
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
        data-testid="leave-review-button"
      >
        Leave review
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
      data-testid="leave-review-form"
    >
      <p className="text-sm font-medium text-slate-800">Leave a review</p>
      <label className="block text-sm text-slate-700">
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          data-testid="review-rating-select"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} ★
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-slate-700">
        Comment (optional)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          data-testid="review-comment-input"
        />
      </label>
      {submitError ? (
        <p className="text-sm text-red-600" role="alert" data-testid="review-submit-error">
          {submitError}
        </p>
      ) : null}
      {submitMutation.isSuccess ? (
        <p className="text-sm text-emerald-700" data-testid="review-success-message">
          Thank you for your review.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          data-testid="review-submit-button"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setSubmitError(null);
          }}
          disabled={submitMutation.isPending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
