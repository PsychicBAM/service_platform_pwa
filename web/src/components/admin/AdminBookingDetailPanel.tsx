import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAdminBooking,
  getAdminBooking,
  updateAdminBooking,
} from "@/api/adminApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import type { AdminBookingRead, BookingStatus } from "@/types/api";
import { getAdminBookingErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type AdminBookingDetailPanelProps = {
  businessId: string;
  bookingId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type PendingConfirm =
  | {
      kind: "confirm" | "complete" | "no_show";
      status: "confirmed" | "completed" | "no_show";
      title: string;
      description: string;
      confirmLabel: string;
      variant: "default" | "success" | "danger";
      successMessage: string;
    }
  | {
      kind: "cancel";
      title: string;
      description: string;
      confirmLabel: string;
      variant: "danger";
      successMessage: string;
    };

function canConfirm(status: BookingStatus): boolean {
  return status === "pending";
}

function canComplete(status: BookingStatus): boolean {
  return status === "confirmed";
}

function canMarkNoShow(status: BookingStatus): boolean {
  return status === "confirmed";
}

function canCancel(status: BookingStatus): boolean {
  return status === "pending" || status === "pending_payment" || status === "confirmed";
}

export function AdminBookingDetailPanel({
  businessId,
  bookingId,
  onClose,
  onSuccess,
  onError,
}: AdminBookingDetailPanelProps) {
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-booking", businessId, bookingId],
    queryFn: () => getAdminBooking(businessId, bookingId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setAdminNotes(detailQuery.data.admin_notes ?? "");
      setShowCancelForm(false);
      setCancelReason("");
      setPendingConfirm(null);
    }
  }, [detailQuery.data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-booking", businessId, bookingId] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateAdminBooking>[2]) =>
      updateAdminBooking(businessId, bookingId, payload),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => cancelAdminBooking(businessId, bookingId, { reason }),
    onSuccess: async () => {
      await invalidate();
      setShowCancelForm(false);
      setCancelReason("");
    },
  });

  const acting = updateMutation.isPending || cancelMutation.isPending;

  function closePendingConfirm() {
    if (acting) {
      return;
    }
    setPendingConfirm(null);
  }

  async function confirmPendingAction() {
    if (!pendingConfirm) {
      return;
    }

    try {
      if (pendingConfirm.kind === "cancel") {
        await cancelMutation.mutateAsync(cancelReason.trim() || undefined);
      } else {
        await updateMutation.mutateAsync({ status: pendingConfirm.status });
      }
      onSuccess(pendingConfirm.successMessage);
      setPendingConfirm(null);
    } catch (error) {
      setPendingConfirm(null);
      if (pendingConfirm.kind === "cancel") {
        onError(getAdminBookingErrorMessage(error, "Could not cancel booking."));
      } else {
        onError(getAdminBookingErrorMessage(error, "Could not update booking."));
      }
    }
  }

  async function handleSaveNotes() {
    try {
      await updateMutation.mutateAsync({ admin_notes: adminNotes.trim() || null });
      onSuccess("Admin notes saved.");
    } catch (error) {
      onError(getAdminBookingErrorMessage(error, "Could not save notes."));
    }
  }

  if (detailQuery.isLoading) {
    return <LoadingState message="Loading booking…" />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Could not load booking"
        message={getAdminBookingErrorMessage(detailQuery.error, "Unable to load booking")}
      />
    );
  }

  const booking = detailQuery.data;
  if (!booking) {
    return null;
  }

  return (
    <>
      <BookingDetailContent
        booking={booking}
        adminNotes={adminNotes}
        cancelReason={cancelReason}
        showCancelForm={showCancelForm}
        acting={acting}
        onClose={onClose}
        onAdminNotesChange={setAdminNotes}
        onCancelReasonChange={setCancelReason}
        onShowCancelForm={() => setShowCancelForm(true)}
        onConfirm={() =>
          setPendingConfirm({
            kind: "confirm",
            status: "confirmed",
            title: "Confirm booking?",
            description: "This booking will be marked as confirmed.",
            confirmLabel: "Confirm booking",
            variant: "success",
            successMessage: "Booking confirmed.",
          })
        }
        onComplete={() =>
          setPendingConfirm({
            kind: "complete",
            status: "completed",
            title: "Mark booking as completed?",
            description: "This will mark the booking as completed.",
            confirmLabel: "Mark completed",
            variant: "success",
            successMessage: "Booking completed.",
          })
        }
        onNoShow={() =>
          setPendingConfirm({
            kind: "no_show",
            status: "no_show",
            title: "Mark booking as no-show?",
            description: "This booking will be marked as no-show.",
            confirmLabel: "Mark no-show",
            variant: "default",
            successMessage: "Booking marked as no-show.",
          })
        }
        onSaveNotes={() => void handleSaveNotes()}
        onCancelSubmit={() =>
          setPendingConfirm({
            kind: "cancel",
            title: "Cancel booking?",
            description: "This booking will be marked as cancelled. The time slot may become available again.",
            confirmLabel: "Cancel booking",
            variant: "danger",
            successMessage: "Booking cancelled.",
          })
        }
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

function BookingDetailContent({
  booking,
  adminNotes,
  cancelReason,
  showCancelForm,
  acting,
  onClose,
  onAdminNotesChange,
  onCancelReasonChange,
  onShowCancelForm,
  onConfirm,
  onComplete,
  onNoShow,
  onSaveNotes,
  onCancelSubmit,
}: {
  booking: AdminBookingRead;
  adminNotes: string;
  cancelReason: string;
  showCancelForm: boolean;
  acting: boolean;
  onClose: () => void;
  onAdminNotesChange: (value: string) => void;
  onCancelReasonChange: (value: string) => void;
  onShowCancelForm: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onSaveNotes: () => void;
  onCancelSubmit: () => void;
}) {
  return (
    <div
      className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-3 sm:p-4"
      data-testid="admin-booking-detail-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-slate-900">
            {booking.reference}
          </p>
          <div className="mt-2">
            <StatusBadge status={booking.status} kind="booking" />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-brand-700"
        >
          Close
        </button>
      </div>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Service</dt>
          <dd className="font-medium text-slate-900">{booking.service.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Client</dt>
          <dd className="font-medium text-slate-900">{booking.client.full_name}</dd>
          {booking.client.email ? (
            <dd className="break-all text-slate-600">{booking.client.email}</dd>
          ) : null}
          {booking.client.phone ? (
            <dd className="text-slate-600">{booking.client.phone}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-slate-500">Starts</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(booking.starts_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ends</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(booking.ends_at)}</dd>
        </div>
        {booking.client_notes ? (
          <div>
            <dt className="text-slate-500">Client notes</dt>
            <dd className="whitespace-pre-wrap break-words text-slate-800">
              {booking.client_notes}
            </dd>
          </div>
        ) : null}
        {booking.status === "cancelled" ? (
          <>
            {booking.cancellation_reason ? (
              <div>
                <dt className="text-slate-500">Cancellation reason</dt>
                <dd className="break-words text-slate-800">{booking.cancellation_reason}</dd>
              </div>
            ) : null}
            {booking.cancelled_at ? (
              <div>
                <dt className="text-slate-500">Cancelled at</dt>
                <dd className="text-slate-800">{formatDateTimeLabel(booking.cancelled_at)}</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        <TextAreaField
          name="adminNotes"
          label="Admin notes"
          value={adminNotes}
          onChange={(event) => onAdminNotesChange(event.target.value)}
          disabled={acting}
        />
        <button
          type="button"
          onClick={onSaveNotes}
          disabled={acting}
          className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:min-h-0 sm:py-1.5"
        >
          Save notes
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        {canConfirm(booking.status) ? (
          <ActionButton
            label="Confirm"
            testId="admin-booking-action-confirm"
            onClick={onConfirm}
            disabled={acting}
            primary
          />
        ) : null}
        {canComplete(booking.status) ? (
          <ActionButton
            label="Complete"
            testId="admin-booking-action-complete"
            onClick={onComplete}
            disabled={acting}
            primary
          />
        ) : null}
        {canMarkNoShow(booking.status) ? (
          <ActionButton
            label="Mark no-show"
            testId="admin-booking-action-no-show"
            onClick={onNoShow}
            disabled={acting}
          />
        ) : null}
        {canCancel(booking.status) && !showCancelForm ? (
          <ActionButton
            label="Cancel booking"
            testId="admin-booking-action-cancel"
            onClick={onShowCancelForm}
            disabled={acting}
            danger
          />
        ) : null}
      </div>

      {showCancelForm && canCancel(booking.status) ? (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <TextAreaField
            name="cancelReason"
            label="Cancellation reason (optional)"
            value={cancelReason}
            onChange={(event) => onCancelReasonChange(event.target.value)}
            disabled={acting}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCancelSubmit}
              disabled={acting}
              className="min-h-11 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 sm:min-h-0 sm:py-1.5"
              data-testid="admin-booking-action-confirm-cancel"
            >
              Confirm cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
  danger,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  testId?: string;
}) {
  let className =
    "min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-1.5 ";
  if (danger) {
    className += "border-red-300 bg-white text-red-700 hover:bg-red-50";
  } else if (primary) {
    className += "border-brand-600 bg-brand-600 text-white hover:bg-brand-700";
  } else {
    className += "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
