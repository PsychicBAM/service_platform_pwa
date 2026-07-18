import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
import {
  AdminConfirmDialog,
  type AdminConfirmDialogVariant,
} from "@/components/admin/AdminConfirmDialog";
import { AdminReviewLinkAction } from "@/components/admin/AdminReviewLinkAction";
import { AdminReviewRequestEmailAction } from "@/components/admin/AdminReviewRequestEmailAction";
import {
  customerInitials,
  extractAttachments,
  extractBudgetLabel,
  extractPreferredDate,
  formatMoney,
} from "@/components/admin/orders/orderHelpers";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { NewMessageNotification } from "@/components/NewMessageNotification";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import { useIncomingMessageNotification } from "@/hooks/useIncomingMessageNotification";
import type { AdminOrderRead, OrderStatus } from "@/types/api";
import { getAdminOrderErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const MESSAGE_MAX_LENGTH = 5000;
const MESSAGE_POLL_INTERVAL_MS = 1000;

type PendingConfirm = {
  kind: "accept" | "accept_and_start" | "decline" | "start_work" | "complete" | "cancel";
  title: string;
  description: string;
  confirmLabel: string;
  variant: AdminConfirmDialogVariant;
  successMessage: string;
};

const MESSAGING_OPEN_STATUSES: OrderStatus[] = [
  "submitted",
  "pending_payment",
  "accepted",
  "in_progress",
];

type AdminOrderDetailPanelProps = {
  businessId: string;
  orderId: string;
  canReview?: boolean;
  hasReview?: boolean;
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
  canReview = false,
  hasReview = false,
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
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-order", businessId, orderId],
    queryFn: () => getAdminOrder(businessId, orderId),
  });

  const messagesQuery = useQuery({
    queryKey: ["admin-order", businessId, orderId, "messages"],
    queryFn: () => listAdminOrderMessages(businessId, orderId),
    enabled: Boolean(detailQuery.data),
    refetchInterval: MESSAGE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
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
      setPendingConfirm(null);
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

  const { showNotification, dismissNotification } = useIncomingMessageNotification(
    messagesQuery.data?.data,
    "client",
    `${businessId}:${orderId}`,
  );

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

  function closePendingConfirm() {
    if (acting) {
      return;
    }
    setPendingConfirm(null);
  }

  function requestAccept(startWork: boolean) {
    setPendingConfirm({
      kind: startWork ? "accept_and_start" : "accept",
      title: startWork ? "Accept request and start work?" : "Accept request?",
      description: startWork
        ? "This request will be accepted and marked as in progress."
        : "This request will be marked as accepted.",
      confirmLabel: startWork ? "Accept & start" : "Accept",
      variant: "success",
      successMessage: startWork
        ? "Request accepted and work started."
        : "Request accepted.",
    });
  }

  function requestDeclineSubmit() {
    const reason = declineReason.trim();
    if (!reason) {
      onError("Please enter a decline reason.");
      return;
    }
    setPendingConfirm({
      kind: "decline",
      title: "Decline request?",
      description: "This request will be marked as declined.",
      confirmLabel: "Decline request",
      variant: "danger",
      successMessage: "Request declined.",
    });
  }

  function requestStartWork() {
    setPendingConfirm({
      kind: "start_work",
      title: "Mark request as in progress?",
      description: "This request will be marked as in progress.",
      confirmLabel: "Start work",
      variant: "default",
      successMessage: "Work started.",
    });
  }

  function requestComplete() {
    setPendingConfirm({
      kind: "complete",
      title: "Mark request as completed?",
      description: "This will mark the request as completed.",
      confirmLabel: "Mark completed",
      variant: "success",
      successMessage: "Request completed.",
    });
  }

  function requestCancelSubmit() {
    setPendingConfirm({
      kind: "cancel",
      title: "Cancel request?",
      description: "This request will be marked as cancelled.",
      confirmLabel: "Cancel request",
      variant: "danger",
      successMessage: "Request cancelled.",
    });
  }

  async function confirmPendingAction() {
    if (!pendingConfirm) {
      return;
    }

    try {
      switch (pendingConfirm.kind) {
        case "accept":
          await acceptMutation.mutateAsync(buildAcceptPayload(false));
          break;
        case "accept_and_start":
          await acceptMutation.mutateAsync(buildAcceptPayload(true));
          break;
        case "decline":
          await declineMutation.mutateAsync({
            decline_reason: declineReason.trim(),
            admin_notes: adminNotes.trim() || undefined,
          });
          break;
        case "start_work":
          await inProgressMutation.mutateAsync();
          break;
        case "complete":
          await completeMutation.mutateAsync();
          break;
        case "cancel":
          await cancelMutation.mutateAsync({
            reason: cancelReason.trim() || undefined,
          });
          break;
      }
      onSuccess(pendingConfirm.successMessage);
      setPendingConfirm(null);
    } catch (error) {
      setPendingConfirm(null);
      const fallback =
        pendingConfirm.kind === "decline"
          ? "Could not decline request."
          : pendingConfirm.kind === "cancel"
            ? "Could not cancel request."
            : pendingConfirm.kind === "complete"
              ? "Could not complete request."
              : pendingConfirm.kind === "start_work"
                ? "Could not start work."
                : "Could not accept request.";
      onError(getAdminOrderErrorMessage(error, fallback));
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
    <>
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
        showNewMessageNotification={showNotification}
        onDismissNewMessageNotification={dismissNotification}
        acting={acting}
        canReview={canReview}
        hasReview={hasReview}
        onClose={onClose}
        onAdminNotesChange={setAdminNotes}
        onQuotedPriceChange={setQuotedPriceInput}
        onDeclineReasonChange={setDeclineReason}
        onCancelReasonChange={setCancelReason}
        onMessageBodyChange={setMessageBody}
        onShowDeclineForm={() => setShowDeclineForm(true)}
        onShowCancelForm={() => setShowCancelForm(true)}
        onAccept={() => requestAccept(false)}
        onAcceptAndStart={() => requestAccept(true)}
        onDeclineSubmit={requestDeclineSubmit}
        onStartWork={requestStartWork}
        onComplete={requestComplete}
        onCancelSubmit={requestCancelSubmit}
        onSaveDetails={() => void handleSaveDetails()}
        onSendMessage={handleSendMessage}
        onReviewSent={onSuccess}
        onReviewError={onError}
      />

      <AdminConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        variant={pendingConfirm?.variant ?? "default"}
        isLoading={acting}
        onCancel={closePendingConfirm}
        onConfirm={() => void confirmPendingAction()}
      />
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
      <dt className="pt-0.5 text-gray-500">{label}</dt>
      <dd className="min-w-0 font-medium text-gray-900">{children}</dd>
    </div>
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
  showNewMessageNotification,
  onDismissNewMessageNotification,
  acting,
  canReview,
  hasReview,
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
  onReviewSent,
  onReviewError,
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
  showNewMessageNotification: boolean;
  onDismissNewMessageNotification: () => void;
  acting: boolean;
  canReview: boolean;
  hasReview: boolean;
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
  onReviewSent: (message: string) => void;
  onReviewError: (message: string) => void;
}) {
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  const preferredDate = extractPreferredDate(order.form_data);
  const budgetLabel = extractBudgetLabel(order.form_data);
  const attachments = extractAttachments(order.form_data);
  const initials = customerInitials(order.client.full_name) || "?";
  const estimatedLabel =
    order.quoted_price_cents != null
      ? formatQuotedPrice(order.quoted_price_cents, order.service.currency)
      : order.service.price_cents != null
        ? formatMoney(order.service.price_cents, order.service.currency)
        : null;
  const budgetDisplay = budgetLabel || estimatedLabel;

  const showAccept = canAccept(order.status);
  const showStart = canStartWork(order.status);
  const showComplete = canComplete(order.status);
  const showDecline = canDecline(order.status) && !showDeclineForm;
  const showCancel = canCancel(order.status) && !showCancelForm;
  const moreAcceptAndStart = showAccept;
  const moreCancel = showCancel && showDecline;
  const showCancelPrimary = showCancel && !showDecline;
  const hasMoreActions = moreAcceptAndStart || moreCancel;
  const hasPrimaryActions =
    showAccept || showStart || showComplete || showDecline || showCancelPrimary || hasMoreActions;

  return (
    <div
      className="h-fit space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="admin-order-detail-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <p className="truncate font-mono text-base font-semibold text-gray-900">
            {order.reference}
          </p>
          <StatusBadge status={order.status} kind="order" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-lg leading-none text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">
            {order.client.full_name}
          </p>
          {order.client.email ? (
            <p className="truncate text-sm text-gray-500">{order.client.email}</p>
          ) : null}
          {order.client.phone ? (
            <p className="truncate text-sm text-gray-500">{order.client.phone}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {order.client.email ? (
            <a
              href={`mailto:${order.client.email}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Email customer"
              title={order.client.email}
            >
              <EnvelopeIcon />
            </a>
          ) : null}
          {order.client.phone ? (
            <a
              href={`tel:${order.client.phone}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Call customer"
              title={order.client.phone}
            >
              <PhoneIcon />
            </a>
          ) : null}
        </div>
      </div>

      <dl className="space-y-3.5 border-b border-gray-100 pb-4">
        <DetailRow label="Service">{order.service.name}</DetailRow>
        <DetailRow label="Requested">{formatDateTimeLabel(order.created_at)}</DetailRow>
        {preferredDate ? <DetailRow label="Preferred date">{preferredDate}</DetailRow> : null}
        {budgetDisplay ? <DetailRow label="Budget">{budgetDisplay}</DetailRow> : null}
        {formDetails ? (
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
            <dt className="pt-2 text-gray-500">Message</dt>
            <dd className="min-w-0 rounded-xl bg-gray-50 px-3.5 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
              {formDetails}
            </dd>
          </div>
        ) : null}
        {attachments.length > 0 ? (
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
            <dt className="pt-2 text-gray-500">Attachments</dt>
            <dd className="min-w-0 space-y-2">
              {attachments.map((file) => (
                <div
                  key={`${file.name}-${file.url ?? ""}`}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <FileIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                    {file.sizeLabel ? (
                      <p className="text-xs text-gray-500">{file.sizeLabel}</p>
                    ) : null}
                  </div>
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                      aria-label={`Download ${file.name}`}
                    >
                      <DownloadIcon />
                    </a>
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center text-gray-300">
                      <DownloadIcon />
                    </span>
                  )}
                </div>
              ))}
            </dd>
          </div>
        ) : null}
        {order.decline_reason ? (
          <DetailRow label="Decline reason">
            <span className="font-medium text-red-700">{order.decline_reason}</span>
          </DetailRow>
        ) : null}
        {order.accepted_at ? (
          <DetailRow label="Accepted">{formatDateTimeLabel(order.accepted_at)}</DetailRow>
        ) : null}
        {order.completed_at ? (
          <DetailRow label="Completed">{formatDateTimeLabel(order.completed_at)}</DetailRow>
        ) : null}
      </dl>

      <div className="space-y-2" data-testid="admin-order-messages">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowNotesEditor((open) => !open)}
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              showNotesEditor
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-expanded={showNotesEditor}
          >
            <NotesIcon />
            Notes &amp; price
          </button>
          <button
            type="button"
            onClick={() => setShowMessagesPanel((open) => !open)}
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              showMessagesPanel
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-expanded={showMessagesPanel}
          >
            <ChatIcon />
            Messages
          </button>
        </div>
        <p className="text-xs text-gray-500">Messages refresh automatically.</p>
        {showNewMessageNotification ? (
          <NewMessageNotification
            label="New message from client"
            onDismiss={onDismissNewMessageNotification}
          />
        ) : null}
      </div>

      {showNotesEditor ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <TextAreaField
            name="adminNotes"
            label="Admin notes"
            value={adminNotes}
            onChange={(event) => onAdminNotesChange(event.target.value)}
            disabled={acting}
          />
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Quoted price (cents)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={quotedPriceInput}
              onChange={(event) => onQuotedPriceChange(event.target.value)}
              disabled={acting}
              placeholder="e.g. 15000 for $150.00"
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            onClick={onSaveDetails}
            disabled={acting}
            className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Save notes &amp; price
          </button>
        </div>
      ) : null}

      {showMessagesPanel ? (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <h3 className="text-sm font-semibold text-gray-800">Messages</h3>

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
              <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
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
                    <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">
                      {message.body}
                    </p>
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
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Send message
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Messages are closed for this request.</p>
            )}
          </div>
      ) : null}

      {hasPrimaryActions ? (
        <div className="space-y-3 border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-900">Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            {showAccept ? (
              <>
                <ActionButton
                  label="Accept Request"
                  icon={<CheckIcon />}
                  testId="admin-order-action-accept"
                  onClick={onAccept}
                  disabled={acting}
                  variant="primary"
                />
                <span data-testid="admin-order-accept" className="sr-only">
                  Accept
                </span>
              </>
            ) : null}
            {showStart ? (
              <>
                <ActionButton
                  label="Start Work"
                  icon={<PlayIcon />}
                  testId="admin-order-action-start"
                  onClick={onStartWork}
                  disabled={acting}
                  variant="warning"
                />
                <span data-testid="admin-order-start" className="sr-only">
                  Start
                </span>
              </>
            ) : null}
            {showComplete ? (
              <>
                <ActionButton
                  label="Complete"
                  icon={<CheckIcon />}
                  testId="admin-order-action-complete"
                  onClick={onComplete}
                  disabled={acting}
                  variant="primary"
                />
                <span data-testid="admin-order-complete" className="sr-only">
                  Complete
                </span>
              </>
            ) : null}
            {showDecline ? (
              <>
                <ActionButton
                  label="Decline Request"
                  icon={<CloseIcon />}
                  testId="admin-order-action-decline"
                  onClick={onShowDeclineForm}
                  disabled={acting}
                  variant="danger"
                />
                <span data-testid="admin-order-decline" className="sr-only">
                  Decline
                </span>
              </>
            ) : null}
            {showCancelPrimary ? (
              <>
                <ActionButton
                  label="Cancel request"
                  icon={<CloseIcon />}
                  testId="admin-order-action-cancel"
                  onClick={onShowCancelForm}
                  disabled={acting}
                  variant="danger"
                />
                <span data-testid="admin-order-cancel" className="sr-only">
                  Cancel
                </span>
              </>
            ) : null}
            {hasMoreActions ? (
              <div className="relative">
                <ActionButton
                  label="More Actions"
                  icon={<ChevronDownIcon />}
                  onClick={() => setMoreActionsOpen((open) => !open)}
                  disabled={acting}
                  variant="neutral"
                  ariaExpanded={moreActionsOpen}
                />
                {moreActionsOpen ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                    {moreAcceptAndStart ? (
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        data-testid="admin-order-action-accept-start"
                        disabled={acting}
                        onClick={() => {
                          setMoreActionsOpen(false);
                          onAcceptAndStart();
                        }}
                      >
                        Accept &amp; start work
                      </button>
                    ) : null}
                    {moreCancel ? (
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        data-testid="admin-order-action-cancel"
                        disabled={acting}
                        onClick={() => {
                          setMoreActionsOpen(false);
                          onShowCancelForm();
                        }}
                      >
                        Cancel request
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

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
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            data-testid="admin-order-action-confirm-decline"
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
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            data-testid="admin-order-action-confirm-cancel"
          >
            Confirm cancel
          </button>
        </div>
      ) : null}

      <div
        className="space-y-2 border-t border-gray-100 pt-4"
        data-testid="admin-order-send-review-request"
      >
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900">Review request</p>
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-400"
            title="Ask the client for a review after the request is completed."
          >
            i
          </span>
        </div>
        {order.status !== "completed" ? (
          <p className="text-sm text-gray-500">Will be available after completion.</p>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <AdminReviewLinkAction
              businessId={order.business_id}
              orderId={order.id}
              canReview={canReview}
              hasReview={hasReview}
              onCopied={onReviewSent}
              onError={onReviewError}
            />
            <AdminReviewRequestEmailAction
              businessId={order.business_id}
              orderId={order.id}
              canReview={canReview}
              hasReview={hasReview}
              followUpEmailConsent={order.follow_up_email_consent}
              clientEmail={order.client.email}
              reviewRequestEmailSentAt={order.review_request_email_sent_at}
              onSent={onReviewSent}
              onError={onReviewError}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
  testId,
  icon,
  ariaExpanded,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "warning" | "danger" | "neutral";
  testId?: string;
  icon?: ReactNode;
  ariaExpanded?: boolean;
}) {
  const variants: Record<typeof variant, string> = {
    primary:
      "border-teal-700 bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-500/40",
    warning:
      "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-500/30",
    danger:
      "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500/30",
    neutral:
      "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-emerald-500/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      className={`inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold outline-none focus-visible:ring-2 disabled:opacity-60 ${variants[variant]}`}
      data-testid={testId}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3 5.5h14v9H3v-9Zm0 0 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4.5 4.5c0-.8.7-1.5 1.5-1.5h1.2c.6 0 1.1.4 1.2 1l.3 1.8c.1.5-.1 1-.5 1.3L7.3 8.4a9.5 9.5 0 0 0 4.3 4.3l1.3-.9c.3-.4.8-.6 1.3-.5l1.8.3c.6.1 1 .6 1 1.2V15c0 .8-.7 1.5-1.5 1.5C8.8 16.5 3.5 11.2 3.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 3.5h5l3 3V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 3.5V7h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 3.5v8m0 0 3-3m-3 3-3-3M4.5 14.5h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5 4.5h10v11H5v-11Zm2 3h6M7 10h6M7 13h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4.5 5.5h11v7.5H9l-3 2v-2H4.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v9l8-4.5-8-4.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m6 6 8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
