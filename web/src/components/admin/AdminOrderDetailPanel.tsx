import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptAdminOrder,
  cancelAdminOrder,
  completeAdminOrder,
  declineAdminOrder,
  getAdminOrder,
  listAdminOrderMessages,
  markAdminOrderInProgress,
  sendAdminOrderMessage,
  updateAdminOrder,
} from "@/api/adminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import type { AdminOrderRead, OrderStatus } from "@/types/api";
import { getAdminOrderErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const MESSAGE_MAX_LENGTH = 5000;

const MESSAGING_OPEN_STATUSES: OrderStatus[] = [
  "submitted",
  "pending_payment",
  "accepted",
  "in_progress",
];

type AdminOrderDetailPanelProps = {
  businessId: string;
  orderId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

function isMessagingOpen(status: OrderStatus): boolean {
  return MESSAGING_OPEN_STATUSES.includes(status);
}

function canAccept(status: OrderStatus): boolean {
  return status === "submitted";
}

function canDecline(status: OrderStatus): boolean {
  return status === "submitted";
}

function canStartWork(status: OrderStatus): boolean {
  return status === "accepted";
}

function canComplete(status: OrderStatus): boolean {
  return status === "in_progress";
}

function canCancel(status: OrderStatus): boolean {
  return status === "submitted" || status === "accepted" || status === "in_progress";
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

function parseQuotedPriceCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function AdminOrderDetailPanel({
  businessId,
  orderId,
  onClose,
  onSuccess,
  onError,
}: AdminOrderDetailPanelProps) {
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [quotedPriceInput, setQuotedPriceInput] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messagesClosed, setMessagesClosed] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["admin-order", businessId, orderId],
    queryFn: () => getAdminOrder(businessId, orderId),
  });

  const messagesQuery = useQuery({
    queryKey: ["admin-order", businessId, orderId, "messages"],
    queryFn: () => listAdminOrderMessages(businessId, orderId),
    enabled: Boolean(detailQuery.data),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setAdminNotes(detailQuery.data.admin_notes ?? "");
      setQuotedPriceInput(
        detailQuery.data.quoted_price_cents != null
          ? String(detailQuery.data.quoted_price_cents)
          : "",
      );
      setShowDeclineForm(false);
      setShowCancelForm(false);
      setDeclineReason("");
      setCancelReason("");
      setMessagesClosed(!isMessagingOpen(detailQuery.data.status));
    }
  }, [detailQuery.data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-orders", businessId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-order", businessId, orderId] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateAdminOrder>[2]) =>
      updateAdminOrder(businessId, orderId, payload),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (payload: Parameters<typeof acceptAdminOrder>[2]) =>
      acceptAdminOrder(businessId, orderId, payload),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const declineMutation = useMutation({
    mutationFn: (payload: Parameters<typeof declineAdminOrder>[2]) =>
      declineAdminOrder(businessId, orderId, payload),
    onSuccess: async () => {
      await invalidate();
      setShowDeclineForm(false);
      setDeclineReason("");
    },
  });

  const inProgressMutation = useMutation({
    mutationFn: () => markAdminOrderInProgress(businessId, orderId),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeAdminOrder(businessId, orderId),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: Parameters<typeof cancelAdminOrder>[2]) =>
      cancelAdminOrder(businessId, orderId, payload),
    onSuccess: async () => {
      await invalidate();
      setShowCancelForm(false);
      setCancelReason("");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (body: string) => sendAdminOrderMessage(businessId, orderId, { body }),
    onSuccess: async () => {
      setMessageBody("");
      await queryClient.invalidateQueries({
        queryKey: ["admin-order", businessId, orderId, "messages"],
      });
    },
  });

  const acting =
    updateMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending ||
    inProgressMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    sendMessageMutation.isPending;

  function buildAcceptPayload(startWork: boolean) {
    const quotedPrice = parseQuotedPriceCents(quotedPriceInput);
    return {
      admin_notes: adminNotes.trim() || undefined,
      quoted_price_cents: quotedPrice,
      start_work: startWork,
    };
  }

  async function handleAccept(startWork: boolean) {
    const confirmMessage = startWork
      ? "Accept this request and start work?"
      : "Accept this request?";
    if (!window.confirm(confirmMessage)) {
      return;
    }
    try {
      await acceptMutation.mutateAsync(buildAcceptPayload(startWork));
      onSuccess(startWork ? "Request accepted and work started." : "Request accepted.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not accept request."));
    }
  }

  async function handleDeclineSubmit() {
    const reason = declineReason.trim();
    if (!reason) {
      onError("Please enter a decline reason.");
      return;
    }
    if (!window.confirm("Decline this request?")) {
      return;
    }
    try {
      await declineMutation.mutateAsync({
        decline_reason: reason,
        admin_notes: adminNotes.trim() || undefined,
      });
      onSuccess("Request declined.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not decline request."));
    }
  }

  async function handleStartWork() {
    if (!window.confirm("Mark this request as in progress?")) {
      return;
    }
    try {
      await inProgressMutation.mutateAsync();
      onSuccess("Work started.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not start work."));
    }
  }

  async function handleComplete() {
    if (!window.confirm("Mark this request as completed?")) {
      return;
    }
    try {
      await completeMutation.mutateAsync();
      onSuccess("Request completed.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not complete request."));
    }
  }

  async function handleCancelSubmit() {
    if (!window.confirm("Cancel this request?")) {
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        reason: cancelReason.trim() || undefined,
      });
      onSuccess("Request cancelled.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not cancel request."));
    }
  }

  async function handleSaveDetails() {
    const quotedPrice = parseQuotedPriceCents(quotedPriceInput);
    if (quotedPriceInput.trim() && quotedPrice === null) {
      onError("Quoted price must be a whole number of cents (0 or greater).");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        admin_notes: adminNotes.trim() || null,
        quoted_price_cents: quotedPrice,
      });
      onSuccess("Notes and quoted price saved.");
    } catch (error) {
      onError(getAdminOrderErrorMessage(error, "Could not save changes."));
    }
  }

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body) {
      return;
    }
    try {
      await sendMessageMutation.mutateAsync(body);
      onSuccess("Message sent.");
    } catch (error) {
      const message = getAdminOrderErrorMessage(error, "Could not send message.");
      if (message === "Messages are closed for this request.") {
        setMessagesClosed(true);
      }
      onError(message);
    }
  }

  if (detailQuery.isLoading) {
    return <LoadingState message="Loading order…" />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Could not load order"
        message={getAdminOrderErrorMessage(detailQuery.error, "Unable to load order")}
      />
    );
  }

  const order = detailQuery.data;
  if (!order) {
    return null;
  }

  const formDetails = formatFormData(order.form_data);
  const messagingOpen = isMessagingOpen(order.status) && !messagesClosed;

  return (
    <OrderDetailContent
      order={order}
      formDetails={formDetails}
      adminNotes={adminNotes}
      quotedPriceInput={quotedPriceInput}
      declineReason={declineReason}
      cancelReason={cancelReason}
      showDeclineForm={showDeclineForm}
      showCancelForm={showCancelForm}
      messageBody={messageBody}
      messagingOpen={messagingOpen}
      messagesQuery={messagesQuery}
      acting={acting}
      onClose={onClose}
      onAdminNotesChange={setAdminNotes}
      onQuotedPriceChange={setQuotedPriceInput}
      onDeclineReasonChange={setDeclineReason}
      onCancelReasonChange={setCancelReason}
      onMessageBodyChange={setMessageBody}
      onShowDeclineForm={() => setShowDeclineForm(true)}
      onShowCancelForm={() => setShowCancelForm(true)}
      onAccept={() => handleAccept(false)}
      onAcceptAndStart={() => handleAccept(true)}
      onDeclineSubmit={handleDeclineSubmit}
      onStartWork={handleStartWork}
      onComplete={handleComplete}
      onCancelSubmit={handleCancelSubmit}
      onSaveDetails={handleSaveDetails}
      onSendMessage={handleSendMessage}
    />
  );
}

function OrderDetailContent({
  order,
  formDetails,
  adminNotes,
  quotedPriceInput,
  declineReason,
  cancelReason,
  showDeclineForm,
  showCancelForm,
  messageBody,
  messagingOpen,
  messagesQuery,
  acting,
  onClose,
  onAdminNotesChange,
  onQuotedPriceChange,
  onDeclineReasonChange,
  onCancelReasonChange,
  onMessageBodyChange,
  onShowDeclineForm,
  onShowCancelForm,
  onAccept,
  onAcceptAndStart,
  onDeclineSubmit,
  onStartWork,
  onComplete,
  onCancelSubmit,
  onSaveDetails,
  onSendMessage,
}: {
  order: AdminOrderRead;
  formDetails: string | null;
  adminNotes: string;
  quotedPriceInput: string;
  declineReason: string;
  cancelReason: string;
  showDeclineForm: boolean;
  showCancelForm: boolean;
  messageBody: string;
  messagingOpen: boolean;
  messagesQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listAdminOrderMessages>>>>;
  acting: boolean;
  onClose: () => void;
  onAdminNotesChange: (value: string) => void;
  onQuotedPriceChange: (value: string) => void;
  onDeclineReasonChange: (value: string) => void;
  onCancelReasonChange: (value: string) => void;
  onMessageBodyChange: (value: string) => void;
  onShowDeclineForm: () => void;
  onShowCancelForm: () => void;
  onAccept: () => void;
  onAcceptAndStart: () => void;
  onDeclineSubmit: () => void;
  onStartWork: () => void;
  onComplete: () => void;
  onCancelSubmit: () => void;
  onSaveDetails: () => void;
  onSendMessage: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">{order.reference}</p>
          <div className="mt-2">
            <StatusBadge status={order.status} kind="order" />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-600 hover:text-brand-700"
        >
          Close
        </button>
      </div>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Service</dt>
          <dd className="font-medium text-slate-900">{order.service.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Client</dt>
          <dd className="font-medium text-slate-900">{order.client.full_name}</dd>
          {order.client.email ? <dd className="text-slate-600">{order.client.email}</dd> : null}
          {order.client.phone ? <dd className="text-slate-600">{order.client.phone}</dd> : null}
        </div>
        {formDetails ? (
          <div>
            <dt className="text-slate-500">Request details</dt>
            <dd className="whitespace-pre-wrap text-slate-800">{formDetails}</dd>
          </div>
        ) : null}
        {order.quoted_price_cents != null ? (
          <div>
            <dt className="text-slate-500">Quoted price</dt>
            <dd className="font-medium text-slate-900">
              {formatQuotedPrice(order.quoted_price_cents, order.service.currency)}
            </dd>
          </div>
        ) : null}
        {order.decline_reason ? (
          <div>
            <dt className="text-slate-500">Decline reason</dt>
            <dd className="text-red-700">{order.decline_reason}</dd>
          </div>
        ) : null}
        {order.accepted_at ? (
          <div>
            <dt className="text-slate-500">Accepted at</dt>
            <dd className="text-slate-800">{formatDateTimeLabel(order.accepted_at)}</dd>
          </div>
        ) : null}
        {order.completed_at ? (
          <div>
            <dt className="text-slate-500">Completed at</dt>
            <dd className="text-slate-800">{formatDateTimeLabel(order.completed_at)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(order.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Updated</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(order.updated_at)}</dd>
        </div>
      </dl>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <TextAreaField
          name="adminNotes"
          label="Admin notes"
          value={adminNotes}
          onChange={(event) => onAdminNotesChange(event.target.value)}
          disabled={acting}
        />
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Quoted price (cents)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={quotedPriceInput}
            onChange={(event) => onQuotedPriceChange(event.target.value)}
            disabled={acting}
            placeholder="e.g. 15000 for $150.00"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={onSaveDetails}
          disabled={acting}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Save notes &amp; price
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        {canAccept(order.status) ? (
          <>
            <ActionButton label="Accept" onClick={onAccept} disabled={acting} primary />
            <ActionButton
              label="Accept & start work"
              onClick={onAcceptAndStart}
              disabled={acting}
              primary
            />
          </>
        ) : null}
        {canDecline(order.status) && !showDeclineForm ? (
          <ActionButton label="Decline" onClick={onShowDeclineForm} disabled={acting} />
        ) : null}
        {canStartWork(order.status) ? (
          <ActionButton label="Start work" onClick={onStartWork} disabled={acting} primary />
        ) : null}
        {canComplete(order.status) ? (
          <ActionButton label="Complete" onClick={onComplete} disabled={acting} primary />
        ) : null}
        {canCancel(order.status) && !showCancelForm ? (
          <ActionButton label="Cancel request" onClick={onShowCancelForm} disabled={acting} danger />
        ) : null}
      </div>

      {showDeclineForm && canDecline(order.status) ? (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <TextAreaField
            name="declineReason"
            label="Decline reason"
            value={declineReason}
            onChange={(event) => onDeclineReasonChange(event.target.value)}
            disabled={acting}
            required
          />
          <button
            type="button"
            onClick={onDeclineSubmit}
            disabled={acting}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Confirm decline
          </button>
        </div>
      ) : null}

      {showCancelForm && canCancel(order.status) ? (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <TextAreaField
            name="cancelReason"
            label="Cancellation reason (optional)"
            value={cancelReason}
            onChange={(event) => onCancelReasonChange(event.target.value)}
            disabled={acting}
          />
          <button
            type="button"
            onClick={onCancelSubmit}
            disabled={acting}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm cancel
          </button>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-medium text-slate-700">Messages</h3>

        {messagesQuery.isLoading ? <LoadingState message="Loading messages…" /> : null}

        {messagesQuery.isError ? (
          <ErrorState
            title="Could not load messages"
            message={getAdminOrderErrorMessage(messagesQuery.error, "Unable to load messages")}
          />
        ) : null}

        {messagesQuery.data && messagesQuery.data.data.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : null}

        {messagesQuery.data && messagesQuery.data.data.length > 0 ? (
          <div className="space-y-2">
            {messagesQuery.data.data.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  message.sender_type === "client"
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{message.sender_type === "client" ? "Client" : "Admin"}</span>
                  <time dateTime={message.created_at}>
                    {formatDateTimeLabel(message.created_at)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.body}</p>
              </div>
            ))}
          </div>
        ) : null}

        {messagingOpen ? (
          <form onSubmit={onSendMessage} className="space-y-2">
            <TextAreaField
              name="adminMessage"
              label="Reply to client"
              value={messageBody}
              onChange={(event) => onMessageBodyChange(event.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              disabled={acting}
            />
            <button
              type="submit"
              disabled={acting || !messageBody.trim()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Send message
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Messages are closed for this request.</p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  let className = "rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ";
  if (danger) {
    className += "border-red-300 text-red-700 hover:bg-red-50";
  } else if (primary) {
    className += "border-brand-600 bg-brand-600 text-white hover:bg-brand-700";
  } else {
    className += "border-slate-300 text-slate-700 hover:bg-slate-50";
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {label}
    </button>
  );
}
