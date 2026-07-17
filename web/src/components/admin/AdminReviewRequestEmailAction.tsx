import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendReviewRequestEmail } from "@/api/adminApi";
import { getAdminBookingErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type AdminReviewRequestEmailActionProps = {
  businessId: string;
  bookingId?: string;
  orderId?: string;
  canReview: boolean;
  hasReview: boolean;
  followUpEmailConsent: boolean;
  clientEmail: string | null;
  reviewRequestEmailSentAt?: string | null;
  onSent?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AdminReviewRequestEmailAction({
  businessId,
  bookingId,
  orderId,
  canReview,
  hasReview,
  followUpEmailConsent,
  clientEmail,
  reviewRequestEmailSentAt = null,
  onSent,
  onError,
}: AdminReviewRequestEmailActionProps) {
  const queryClient = useQueryClient();
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendReviewRequestEmail(businessId, {
        booking_id: bookingId,
        order_id: orderId,
      }),
    onSuccess: async (result) => {
      const message = result.message || "Review request sent.";
      setLocalSuccess(message);
      onSent?.(message);
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders", businessId] });
    },
    onError: (error: unknown) => {
      setLocalSuccess(null);
      onError?.(getAdminBookingErrorMessage(error, "Could not send review request."));
    },
  });

  if (hasReview) {
    return null;
  }

  if (reviewRequestEmailSentAt) {
    return (
      <p
        className="text-xs font-medium leading-snug text-emerald-700"
        data-testid="review-request-email-sent"
      >
        Review request sent
        <span className="block font-normal text-slate-500">
          {formatDateTimeLabel(reviewRequestEmailSentAt)}
        </span>
      </p>
    );
  }

  if (!canReview) {
    return null;
  }

  const hasEmail = Boolean(clientEmail?.trim());
  const disabledReason = !followUpEmailConsent
    ? "Client did not agree to follow-up emails."
    : !hasEmail
      ? "No client email available."
      : null;

  if (disabledReason) {
    return (
      <p
        className="text-xs leading-snug text-slate-500"
        data-testid="send-review-request-disabled-note"
      >
        {disabledReason}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          setLocalSuccess(null);
          sendMutation.mutate();
        }}
        disabled={sendMutation.isPending}
        className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-60"
        data-testid="send-review-request-button"
      >
        {sendMutation.isPending ? "Sending…" : "Send review request"}
      </button>
      {localSuccess ? (
        <p className="text-xs text-emerald-700" data-testid="send-review-request-success">
          {localSuccess}
        </p>
      ) : null}
    </div>
  );
}
