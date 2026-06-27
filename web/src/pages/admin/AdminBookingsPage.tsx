import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminBookings } from "@/api/adminApi";
import { AdminBookingDetailPanel } from "@/components/admin/AdminBookingDetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { BookingStatus } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type StatusFilter = "all" | BookingStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-brand-600 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminBookingsPage() {
  const { businessId } = useAdminBusiness();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-bookings", businessId, statusFilter],
    queryFn: () =>
      listAdminBookings(
        businessId!,
        statusFilter === "all" ? undefined : { status: statusFilter },
      ),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Bookings</h2>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={statusFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setSelectedBookingId(null);
              setSuccessMessage(null);
              setActionError(null);
            }}
          />
        ))}
      </div>

      {selectedBookingId && businessId ? (
        <AdminBookingDetailPanel
          businessId={businessId}
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setActionError(null);
          }}
          onError={(message) => {
            setActionError(message);
            setSuccessMessage(null);
          }}
        />
      ) : null}

      {isLoading ? <LoadingState message="Loading bookings…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load bookings"
          message={getMeErrorMessage(error, "Unable to load bookings")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No bookings match this filter" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((booking) => (
            <article
              key={booking.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                selectedBookingId === booking.id
                  ? "border-brand-400 ring-1 ring-brand-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{booking.reference}</p>
                <StatusBadge status={booking.status} kind="booking" />
              </div>
              <p className="mt-2 text-sm text-slate-800">{booking.service_name}</p>
              <p className="text-sm text-slate-600">{booking.client_name}</p>
              <p className="mt-2 text-sm text-slate-500">
                {formatDateTimeLabel(booking.starts_at)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBookingId(booking.id);
                  setSuccessMessage(null);
                  setActionError(null);
                }}
                className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View details
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
