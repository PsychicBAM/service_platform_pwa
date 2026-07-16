import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyOrder, listOrderMessages, sendOrderMessage } from "@/api/meApi";
import { AuthPrompt } from "@/components/AuthPrompt";
import { ClientLeaveReviewSection } from "@/components/ClientLeaveReviewSection";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { NewMessageNotification } from "@/components/NewMessageNotification";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import { useAuth } from "@/hooks/useAuth";
import { useIncomingMessageNotification } from "@/hooks/useIncomingMessageNotification";
import type { OrderStatus } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const MESSAGE_MAX_LENGTH = 5000;
const MESSAGE_POLL_INTERVAL_MS = 1000;

const MESSAGING_OPEN_STATUSES: OrderStatus[] = [
  "submitted",
  "pending_payment",
  "accepted",
  "in_progress",
];

function isMessagingOpen(status: OrderStatus): boolean {
  return MESSAGING_OPEN_STATUSES.includes(status);
}

function formatQuotedPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function formatFormData(formData: Record<string, unknown>): string | null {
  const details = formData.details ?? formData.brief;
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }
  const entries = Object.entries(formData).filter(
    ([, value]) => value != null && String(value).trim(),
  );
  if (entries.length === 0) {
    return null;
  }
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join("\n");
}

export function MyOrderDetailPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [messageBody, setMessageBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ["my-order", orderId],
    queryFn: () => getMyOrder(orderId),
    enabled: isAuthenticated && Boolean(orderId),
  });

  const messagesQuery = useQuery({
    queryKey: ["my-order", orderId, "messages"],
    queryFn: () => listOrderMessages(orderId),
    enabled: isAuthenticated && Boolean(orderId),
    refetchInterval: MESSAGE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendOrderMessage(orderId, body),
    onSuccess: async () => {
      setMessageBody("");
      setSendError(null);
      await queryClient.invalidateQueries({ queryKey: ["my-order", orderId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  const { showNotification, dismissNotification } = useIncomingMessageNotification(
    messagesQuery.data?.data,
    "admin",
    orderId,
  );

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-bold">Request detail</h1>
        <AuthPrompt description="Log in to view this request." />
      </section>
    );
  }

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    setSendError(null);
    const body = messageBody.trim();
    if (!body) {
      setSendError("Message is required.");
      return;
    }
    if (body.length > MESSAGE_MAX_LENGTH) {
      setSendError(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    try {
      await sendMutation.mutateAsync(body);
    } catch (error) {
      setSendError(getMeErrorMessage(error, "Could not send message."));
    }
  };

  const order = orderQuery.data;
  const messagingOpen = order ? isMessagingOpen(order.status) : false;
  const formDetails = order ? formatFormData(order.form_data) : null;

  return (
    <section className="space-y-4" data-testid="my-order-detail-page">
      <Link
        to="/me/orders"
        className="inline-flex min-h-10 items-center text-sm font-medium text-brand-700 hover:underline"
      >
        ← Back to My requests
      </Link>

      {orderQuery.isLoading ? <LoadingState message="Loading request…" /> : null}

      {orderQuery.isError ? (
        <ErrorState
          title="Could not load request"
          message={getMeErrorMessage(orderQuery.error, "Unable to load request")}
        />
      ) : null}

      {order ? (
        <>
          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            data-testid="my-order-detail-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-slate-900">
                  {order.reference}
                </p>
                <p className="mt-1 break-words text-sm text-slate-600">{order.business.name}</p>
                <p className="break-words text-sm font-medium text-slate-800">{order.service.name}</p>
              </div>
              <StatusBadge status={order.status} kind="order" />
            </div>

            {formDetails ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Request details</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {formDetails}
                </p>
              </div>
            ) : null}

            {order.quoted_price_cents != null ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Quoted price</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatQuotedPrice(order.quoted_price_cents, order.service.currency)}
                </p>
              </div>
            ) : null}

            {order.decline_reason ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Decline reason</p>
                <p className="mt-1 break-words text-sm text-red-700">{order.decline_reason}</p>
              </div>
            ) : null}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <ClientLeaveReviewSection
                targetType="order"
                targetId={order.id}
                canReview={order.can_review}
                hasReview={order.has_review}
                queryKeysToInvalidate={[["my-order", orderId], ["my-orders"]]}
              />
            </div>
          </div>

          <div className="space-y-3" data-testid="my-order-messages">
            <div>
              <h2 className="text-sm font-medium text-slate-700">Messages</h2>
              <p className="text-xs text-slate-400">Messages refresh automatically.</p>
            </div>

            {showNotification ? (
              <NewMessageNotification
                label="New message from admin"
                onDismiss={dismissNotification}
              />
            ) : null}

            {messagesQuery.isLoading ? <LoadingState message="Loading messages…" /> : null}

            {messagesQuery.isError ? (
              <ErrorState
                title="Could not load messages"
                message={getMeErrorMessage(messagesQuery.error, "Unable to load messages")}
              />
            ) : null}

            {messagesQuery.data && messagesQuery.data.data.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : null}

            {messagesQuery.data && messagesQuery.data.data.length > 0 ? (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
                {messagesQuery.data.data.map((message) => (
                  <div
                    key={message.id}
                    className={`overflow-hidden rounded-xl border px-3 py-2 text-sm ${
                      message.sender_type === "client"
                        ? "border-brand-200 bg-brand-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{message.sender_type === "client" ? "You" : "Business"}</span>
                      <time dateTime={message.created_at} className="shrink-0">
                        {formatDateTimeLabel(message.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">
                      {message.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {messagingOpen ? (
            <form
              onSubmit={handleSend}
              className="space-y-3 border-t border-slate-200 pt-4"
              data-testid="my-order-reply-form"
            >
              <TextAreaField
                name="message"
                label="Send a message"
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                maxLength={MESSAGE_MAX_LENGTH}
                hint={`Up to ${MESSAGE_MAX_LENGTH} characters.`}
                disabled={sendMutation.isPending}
              />
              {sendError ? (
                <p className="text-sm text-red-600" role="alert">
                  {sendError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="min-h-11 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {sendMutation.isPending ? "Sending…" : "Send message"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Messages are closed for this request.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
