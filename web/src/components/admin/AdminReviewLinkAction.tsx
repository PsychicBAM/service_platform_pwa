import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReviewRequestLink } from "@/api/adminApi";
import { getAdminBookingErrorMessage } from "@/utils/errors";

type AdminReviewLinkActionProps = {
  businessId: string;
  bookingId?: string;
  orderId?: string;
  canReview: boolean;
  hasReview: boolean;
  onCopied?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AdminReviewLinkAction({
  businessId,
  bookingId,
  orderId,
  canReview,
  hasReview,
  onCopied,
  onError,
}: AdminReviewLinkActionProps) {
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyMutation = useMutation({
    mutationFn: () =>
      createReviewRequestLink(businessId, {
        booking_id: bookingId,
        order_id: orderId,
      }),
    onSuccess: async (result) => {
      try {
        await navigator.clipboard.writeText(result.review_url);
        setCopiedUrl(null);
        onCopied?.("Review link copied.");
      } catch {
        setCopiedUrl(result.review_url);
        onCopied?.("Review link ready — copy the URL below.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders", businessId] });
    },
    onError: (error: unknown) => {
      onError?.(getAdminBookingErrorMessage(error, "Could not create review link."));
    },
  });

  if (hasReview) {
    return (
      <span className="text-sm font-medium text-emerald-700" data-testid="admin-review-submitted">
        Review submitted
      </span>
    );
  }

  if (!canReview) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => copyMutation.mutate()}
        disabled={copyMutation.isPending}
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
        data-testid="copy-review-link-button"
      >
        {copyMutation.isPending ? "Creating link…" : "Copy review link"}
      </button>
      {copiedUrl ? (
        <input
          readOnly
          value={copiedUrl}
          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
          data-testid="review-link-fallback-input"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
