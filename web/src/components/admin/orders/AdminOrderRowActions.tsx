import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReviewRequestLink, sendReviewRequestEmail } from "@/api/adminApi";
import type { AdminOrderListItem, OrderStatus } from "@/types/api";
import { getAdminOrderErrorMessage } from "@/utils/errors";

type AdminOrderRowActionsProps = {
  order: AdminOrderListItem;
  businessId: string | null | undefined;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onView: () => void;
  onReviewSent: (message: string) => void;
  onReviewError: (message: string) => void;
};

const actionBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40";

const menuItemBtn =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};

function canCopyOrReview(status: OrderStatus, canReview: boolean, hasReview: boolean): boolean {
  return status === "completed" && canReview && !hasReview;
}

export function AdminOrderRowActions({
  order,
  businessId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onView,
  onReviewSent,
  onReviewError,
}: AdminOrderRowActionsProps) {
  const queryClient = useQueryClient();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [fallbackReviewUrl, setFallbackReviewUrl] = useState<string | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const canCopyReviewLink =
    Boolean(businessId) && canCopyOrReview(order.status, order.can_review, order.has_review);

  const sendDisabledReason =
    Boolean(businessId) &&
    order.status === "completed" &&
    order.can_review &&
    !order.has_review &&
    !order.review_request_email_sent_at
      ? !order.follow_up_email_consent
        ? "Client did not agree to follow-up emails."
        : !order.client_email?.trim()
          ? "No client email available."
          : null
      : null;

  const canSendReviewRequest =
    Boolean(businessId) &&
    order.status === "completed" &&
    order.can_review &&
    !order.has_review &&
    !order.review_request_email_sent_at &&
    order.follow_up_email_consent &&
    Boolean(order.client_email?.trim());

  const showMenu = canCopyReviewLink || canSendReviewRequest || Boolean(sendDisabledReason);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = menuButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 140;
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
  }, [menuOpen, canCopyReviewLink, canSendReviewRequest, sendDisabledReason]);

  const copyLinkMutation = useMutation({
    mutationFn: () =>
      createReviewRequestLink(businessId!, {
        order_id: order.id,
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
      await queryClient.invalidateQueries({ queryKey: ["admin-orders", businessId] });
      onCloseMenu();
    },
    onError: (error: unknown) => {
      onReviewError(getAdminOrderErrorMessage(error, "Could not create review link."));
    },
  });

  const sendReviewMutation = useMutation({
    mutationFn: () =>
      sendReviewRequestEmail(businessId!, {
        order_id: order.id,
      }),
    onSuccess: async (result) => {
      const message = result.message || "Review request sent.";
      setSendSuccessMessage(message);
      onReviewSent(message);
      await queryClient.invalidateQueries({ queryKey: ["admin-orders", businessId] });
      onCloseMenu();
    },
    onError: (error: unknown) => {
      setSendSuccessMessage(null);
      onReviewError(getAdminOrderErrorMessage(error, "Could not send review request."));
    },
  });

  return (
    <div className="relative ml-auto flex max-w-full items-center justify-end gap-1.5">
      <button
        type="button"
        className={`${actionBtn} border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50`}
        data-testid={`admin-order-view-${order.id}`}
        onClick={onView}
      >
        <span data-testid="admin-order-view">View</span>
      </button>

      {showMenu ? (
        <div className="relative shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            className={`${actionBtn} w-9 border border-gray-200 bg-white px-0 text-gray-600 hover:bg-gray-50`}
            aria-label="More actions"
            aria-expanded={menuOpen}
            data-testid="admin-order-actions-menu"
            onClick={onToggleMenu}
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
              data-testid="admin-order-actions-menu-panel"
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
                  onClick={() => sendReviewMutation.mutate()}
                >
                  <span data-testid="admin-order-send-review-request">
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
            </div>
          ) : null}
        </div>
      ) : null}

      {sendSuccessMessage ? (
        <span className="sr-only" data-testid="send-review-request-success">
          {sendSuccessMessage}
        </span>
      ) : null}

      {fallbackReviewUrl ? (
        <input
          readOnly
          value={fallbackReviewUrl}
          className="sr-only"
          data-testid="review-link-fallback-input"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
