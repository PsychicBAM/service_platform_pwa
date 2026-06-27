import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMyBooking, listMyBookings } from "@/api/meApi";
import { AuthPrompt } from "@/components/AuthPrompt";
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

export function MyBookingsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MyBookingStatusFilter>("upcoming");
  const [actionError, setActionError] = useState<string | null>(null);

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
      <section className="space-y-4">
        <h1 className="text-xl font-bold">My bookings</h1>
        <AuthPrompt description="Log in to view bookings linked to your account." />
      </section>
    );
  }

  async function handleCancel(id: string, reference: string) {
    setActionError(null);
    const confirmed = window.confirm(`Cancel booking ${reference}?`);
    if (!confirmed) {
      return;
    }
    const reason = window.prompt("Optional reason for cancellation:") ?? undefined;
    try {
      await cancelMutation.mutateAsync({ id, reason: reason || undefined });
    } catch (error) {
      setActionError(getMeErrorMessage(error, "Could not cancel booking."));
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">My bookings</h1>
      <p className="text-sm text-slate-600">
        Made a booking as a guest? Claim it to see it here.
      </p>
      <Link
        to="/me/claim?type=booking"
        className="inline-flex text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Claim a guest booking
      </Link>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
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

      {actionError ? (
        <ErrorState title="Action failed" message={actionError} />
      ) : null}

      {!bookingsQuery.isLoading &&
      !bookingsQuery.isError &&
      bookingsQuery.data?.data.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : null}

      {!bookingsQuery.isLoading && !bookingsQuery.isError && bookingsQuery.data ? (
        <div className="space-y-3">
          {bookingsQuery.data.data.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {booking.reference}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{booking.business.name}</p>
                  <p className="text-sm font-medium text-slate-800">{booking.service.name}</p>
                </div>
                <StatusBadge status={booking.status} kind="booking" />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {formatDateTimeLabel(booking.starts_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.can_cancel ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id, booking.reference)}
                    disabled={cancelMutation.isPending}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                ) : null}
                {booking.can_reschedule ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-500"
                    title="Reschedule coming in a future slice"
                  >
                    Reschedule (coming next)
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
