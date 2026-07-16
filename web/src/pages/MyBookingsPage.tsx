import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMyBooking, listMyBookings } from "@/api/meApi";
import { AuthPrompt } from "@/components/AuthPrompt";
import { CancelWithReasonDialog } from "@/components/CancelWithReasonDialog";
import { ClientLeaveReviewSection } from "@/components/ClientLeaveReviewSection";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { MyBookingStatusFilter } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const FILTERS: Array<{ value: MyBookingStatusFilter; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

type PendingCancel = {
  id: string;
  reference: string;
};

const actionButtonClass =
  "min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-1.5";

export function MyBookingsPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MyBookingStatusFilter>("upcoming");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<PendingCancel | null>(null);
  const linkedMessage =
    typeof (location.state as { message?: unknown } | null)?.message === "string"
      ? (location.state as { message: string }).message
      : null;

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings", statusFilter],
    queryFn: () => listMyBookings(statusFilter),
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelMyBooking(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  if (!isAuthenticated) {
    return (
      <section className="space-y-4" data-testid="my-bookings-page">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">My bookings</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Log in to view bookings linked to your account.
          </p>
        </div>
        <AuthPrompt description="Log in to view bookings linked to your account." />
      </section>
    );
  }

  async function confirmCancel(reason: string) {
    if (!pendingCancel) {
      return;
    }
    const { id } = pendingCancel;
    setActionError(null);
    try {
      await cancelMutation.mutateAsync({ id, reason: reason || undefined });
      setPendingCancel(null);
    } catch (error) {
      setActionError(getMeErrorMessage(error, "Could not cancel booking."));
    }
  }

  return (
    <section className="space-y-4" data-testid="my-bookings-page">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">My bookings</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Upcoming and past appointments linked to your account.
        </p>
      </div>
      {linkedMessage ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
          data-testid="my-bookings-linked-banner"
        >
          {linkedMessage}
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        Made a booking as a guest?{" "}
        <Link
          to="/me/claim?type=booking"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Claim a guest booking
        </Link>
      </p>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="my-bookings-filters"
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter.value
                ? "bg-brand-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {bookingsQuery.isLoading ? <LoadingState message="Loading bookings…" /> : null}

      {bookingsQuery.isError ? (
        <ErrorState
          title="Could not load bookings"
          message={getMeErrorMessage(bookingsQuery.error, "Unable to load bookings")}
        />
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      {!bookingsQuery.isLoading &&
      !bookingsQuery.isError &&
      bookingsQuery.data?.data.length === 0 ? (
        <div className="space-y-3" data-testid="my-bookings-empty">
          <EmptyState
            title="No bookings yet"
            description="Book a service from a business page and it will appear here."
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/businesses"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Browse businesses
            </Link>
            <Link
              to="/me/claim?type=booking"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Claim guest booking
            </Link>
          </div>
        </div>
      ) : null}

      {!bookingsQuery.isLoading &&
      !bookingsQuery.isError &&
      bookingsQuery.data &&
      bookingsQuery.data.data.length > 0 ? (
        <div
          className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
          data-testid="my-bookings-list"
        >
          {bookingsQuery.data.data.map((booking) => (
            <article
              key={booking.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              data-testid="my-booking-card"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {booking.business.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                      Reference: {booking.reference}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} kind="booking" />
                </div>
                <p className="truncate text-sm font-medium text-slate-800">{booking.service.name}</p>
                <p className="mt-auto text-sm text-slate-600">
                  {formatDateTimeLabel(booking.starts_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-stretch gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
                {booking.can_cancel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setPendingCancel({ id: booking.id, reference: booking.reference });
                    }}
                    disabled={cancelMutation.isPending}
                    className={`${actionButtonClass} border-red-300 bg-white text-red-700 hover:bg-red-50`}
                    data-testid={`my-booking-cancel-${booking.id}`}
                  >
                    Cancel
                  </button>
                ) : null}
                {booking.can_reschedule ? (
                  <button
                    type="button"
                    disabled
                    className={`${actionButtonClass} cursor-not-allowed border-slate-300 text-slate-500`}
                    title="Reschedule coming in a future slice"
                  >
                    Reschedule (coming next)
                  </button>
                ) : null}
                <ClientLeaveReviewSection
                  targetType="booking"
                  targetId={booking.id}
                  canReview={booking.can_review}
                  hasReview={booking.has_review}
                  queryKeysToInvalidate={[["my-bookings"]]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <CancelWithReasonDialog
        open={pendingCancel !== null}
        title="Cancel booking?"
        description={
          pendingCancel
            ? `This booking (${pendingCancel.reference}) will be marked as cancelled.`
            : "This booking will be marked as cancelled."
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        isLoading={cancelMutation.isPending}
        onCancel={() => {
          if (!cancelMutation.isPending) {
            setPendingCancel(null);
          }
        }}
        onConfirm={(reason) => {
          void confirmCancel(reason);
        }}
      />
    </section>
  );
}
