import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReviewRequestLink, sendReviewRequestEmail } from "@/api/adminApi";
import type { AdminBookingListItem, BookingStatus } from "@/types/api";
import { getAdminBookingErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type PendingKind = "confirm" | "complete" | "cancel";

type AdminBookingRowActionsProps = {
  booking: AdminBookingListItem;
  businessId: string | null | undefined;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onView: () => void;
  onRequestAction: (kind: PendingKind) => void;
  onReviewSent: (message: string) => void;
  onReviewError: (message: string) => void;
};

function canConfirm(status: BookingStatus): boolean {
  return status === "pending";
}

function canComplete(status: BookingStatus): boolean {
  return status === "confirmed";
}

function canCancel(status: BookingStatus): boolean {
  return status === "pending" || status === "pending_payment" || status === "confirmed";
}

const actionBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap";

const menuItemBtn =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};

export function AdminBookingRowActions({
  booking,
  businessId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onView,
  onRequestAction,
  onReviewSent,
  onReviewError,
}: AdminBookingRowActionsProps) {
  const queryClient = useQueryClient();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [fallbackReviewUrl, setFallbackReviewUrl] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const showConfirm = canConfirm(booking.status);
  const showComplete = canComplete(booking.status);
  const showCancel = canCancel(booking.status);

  const canCopyReviewLink =
    Boolean(businessId) && booking.can_review && !booking.has_review;

  const sendDisabledReason =
    Boolean(businessId) &&
    booking.can_review &&
    !booking.has_review &&
    !booking.review_request_email_sent_at
      ? !booking.follow_up_email_consent
        ? "Client did not agree to follow-up emails."
        : !booking.client_email?.trim()
          ? "No client email available."
          : null
      : null;

  const canSendReviewRequest =
    Boolean(businessId) &&
    booking.can_review &&
    !booking.has_review &&
    !booking.review_request_email_sent_at &&
    booking.follow_up_email_consent &&
    Boolean(booking.client_email?.trim());

  const showMenu =
    showCancel || canCopyReviewLink || canSendReviewRequest || Boolean(sendDisabledReason);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = menuButtonRef.current;
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 168;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      const right = Math.max(8, window.innerWidth - rect.right);

      if (openUpward) {
        setMenuPosition({
          right,
          bottom: Math.max(8, window.innerHeight - rect.top + gap),
        });
      } else {
        setMenuPosition({
          right,
          top: Math.min(window.innerHeight - menuHeight - 8, rect.bottom + gap),
        });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, canCopyReviewLink, canSendReviewRequest, showCancel, sendDisabledReason]);

  const copyLinkMutation = useMutation({
    mutationFn: () =>
      createReviewRequestLink(businessId!, {
        booking_id: booking.id,
      }),
    onSuccess: async (result) => {
      try {
        await navigator.clipboard.writeText(result.review_url);
        setFallbackReviewUrl(null);
        onReviewSent("Review link copied.");
      } catch {
        setFallbackReviewUrl(result.review_url);
        onReviewSent("Review link ready — copy the URL below.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      onCloseMenu();
    },
    onError: (error: unknown) => {
      onReviewError(getAdminBookingErrorMessage(error, "Could not create review link."));
    },
  });

  const sendReviewMutation = useMutation({
    mutationFn: () =>
      sendReviewRequestEmail(businessId!, {
        booking_id: booking.id,
      }),
    onSuccess: async (result) => {
      const message = result.message || "Review request sent.";
      setSendSuccessMessage(message);
      onReviewSent(message);
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      onCloseMenu();
    },
    onError: (error: unknown) => {
      setSendSuccessMessage(null);
      onReviewError(getAdminBookingErrorMessage(error, "Could not send review request."));
    },
  });

  const reviewSentAt = booking.review_request_email_sent_at;
  const showReviewSentChip = Boolean(reviewSentAt) && !booking.has_review;
  const showReviewedChip = booking.has_review;

  return (
    <div className="relative flex min-w-[220px] flex-col items-end gap-1">
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <button
          type="button"
          className={`${actionBtn} border border-brand-600 bg-white text-brand-700 hover:bg-brand-50`}
          data-testid={`admin-booking-view-${booking.id}`}
          onClick={onView}
        >
          <span data-testid="admin-booking-view">View</span>
        </button>

        {showConfirm ? (
          <button
            type="button"
            className={`${actionBtn} bg-brand-600 text-white hover:bg-brand-700`}
            data-testid="admin-booking-confirm"
            onClick={() => onRequestAction("confirm")}
          >
            Confirm
          </button>
        ) : null}

        {showComplete ? (
          <button
            type="button"
            className={`${actionBtn} bg-brand-600 text-white hover:bg-brand-700`}
            data-testid="admin-booking-complete"
            onClick={() => onRequestAction("complete")}
          >
            Complete
          </button>
        ) : null}

        {showMenu ? (
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              className={`${actionBtn} w-9 border border-gray-200 bg-white px-0 text-gray-600 hover:bg-gray-50`}
              aria-label="More actions"
              aria-expanded={menuOpen}
              data-testid="admin-booking-actions-menu"
              onClick={() => {
                setSendSuccessMessage(null);
                onToggleMenu();
              }}
            >
              ▾
            </button>
            {menuOpen ? (
              <div
                ref={menuRef}
                className={
                  menuPosition
                    ? "fixed z-40 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                    : "absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                }
                style={
                  menuPosition
                    ? {
                        top: menuPosition.top,
                        bottom: menuPosition.bottom,
                        right: menuPosition.right,
                      }
                    : undefined
                }
                data-testid="admin-booking-actions-menu-panel"
              >
                {canCopyReviewLink ? (
                  <button
                    type="button"
                    className={`${menuItemBtn} text-gray-700`}
                    data-testid="copy-review-link-button"
                    disabled={copyLinkMutation.isPending}
                    onClick={() => copyLinkMutation.mutate()}
                  >
                    {copyLinkMutation.isPending ? "Creating link…" : "Copy review link"}
                  </button>
                ) : null}

                {canSendReviewRequest ? (
                  <button
                    type="button"
                    className={`${menuItemBtn} text-gray-700`}
                    data-testid="send-review-request-button"
                    disabled={sendReviewMutation.isPending}
                    onClick={() => {
                      setSendSuccessMessage(null);
                      sendReviewMutation.mutate();
                    }}
                  >
                    <span data-testid="admin-booking-send-review-request">
                      {sendReviewMutation.isPending ? "Sending…" : "Send review request"}
                    </span>
                  </button>
                ) : null}

                {sendDisabledReason ? (
                  <p
                    className="px-3 py-2 text-left text-xs leading-snug text-slate-500"
                    data-testid="send-review-request-disabled-note"
                  >
                    {sendDisabledReason}
                  </p>
                ) : null}

                {showCancel ? (
                  <button
                    type="button"
                    className={`${menuItemBtn} text-rose-700 hover:bg-rose-50`}
                    data-testid="admin-booking-cancel"
                    onClick={() => {
                      onCloseMenu();
                      onRequestAction("cancel");
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showReviewedChip ? (
        <span
          className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
          data-testid="admin-review-submitted"
        >
          Review submitted
        </span>
      ) : null}

      {showReviewSentChip && reviewSentAt ? (
        <p
          className="inline-flex max-w-[15rem] flex-wrap items-center justify-end gap-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium leading-tight text-emerald-700"
          data-testid="review-request-email-sent"
        >
          <span>Review request sent</span>
          <span className="font-normal text-emerald-600/80">
            · {formatDateTimeLabel(reviewSentAt)}
          </span>
        </p>
      ) : null}

      {sendSuccessMessage ? (
        <p
          className="text-[11px] font-medium text-emerald-700"
          data-testid="send-review-request-success"
        >
          {sendSuccessMessage}
        </p>
      ) : null}

      {fallbackReviewUrl ? (
        <input
          readOnly
          value={fallbackReviewUrl}
          className="max-w-[14rem] rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700"
          data-testid="review-link-fallback-input"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
