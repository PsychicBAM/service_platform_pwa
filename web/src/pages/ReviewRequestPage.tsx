import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getReviewRequestContext, submitReviewRequest } from "@/api/publicApi";
import { ApiClientError } from "@/api/client";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

const COMMENT_MAX_LENGTH = 2000;

function getReviewRequestErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.code === "REVIEW_REQUEST_TOKEN_EXPIRED") {
      return "This review link has expired.";
    }
    if (error.code === "REVIEW_REQUEST_TOKEN_INVALID") {
      return "This review link is invalid.";
    }
    if (error.code === "REVIEW_DUPLICATE") {
      return "Review already submitted.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function ReviewRequestPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ["review-request", token],
    queryFn: () => getReviewRequestContext(token),
    enabled: Boolean(token),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitReviewRequest(token, {
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      setSubmitError(null);
    },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync();
    } catch (error) {
      setSubmitError(getReviewRequestErrorMessage(error, "Could not submit review."));
    }
  };

  if (!token) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold">Leave a review</h1>
        <ErrorState title="Invalid link" message="This review link is invalid." />
      </section>
    );
  }

  if (contextQuery.isLoading) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8">
        <LoadingState message="Loading review request…" />
      </section>
    );
  }

  if (contextQuery.isError) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold">Leave a review</h1>
        <ErrorState
          title="Unable to open review link"
          message={getReviewRequestErrorMessage(
            contextQuery.error,
            "This review link is invalid.",
          )}
        />
      </section>
    );
  }

  const context = contextQuery.data;

  if (submitted) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold">Leave a review</h1>
        <p className="text-sm text-emerald-700" data-testid="review-request-success">
          Thank you for your review.
        </p>
      </section>
    );
  }

  if (context?.already_reviewed) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold">Leave a review</h1>
        <p className="text-sm text-slate-700" data-testid="review-request-already-submitted">
          Review already submitted.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <h1 className="text-xl font-bold">Leave a review</h1>
      <p className="text-sm text-slate-600">
        How was your experience with {context?.business_name}?
      </p>
      {context?.service_name ? (
        <p className="text-sm font-medium text-slate-800">{context.service_name}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm text-slate-700">
          Rating
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="review-request-rating"
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
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="review-request-comment"
          />
        </label>
        {submitError ? (
          <p className="text-sm text-red-600" role="alert" data-testid="review-request-error">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          data-testid="review-request-submit"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
