import { useQuery } from "@tanstack/react-query";
import { listAdminBookings } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

export function AdminBookingsPage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-bookings", businessId],
    queryFn: () => listAdminBookings(businessId!),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Bookings</h2>

      {isLoading ? <LoadingState message="Loading bookings…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load bookings"
          message={getMeErrorMessage(error, "Unable to load bookings")}
        />
      ) : null}
      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No bookings yet" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
