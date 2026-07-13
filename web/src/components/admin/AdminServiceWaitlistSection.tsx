import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listWaitlistEntries, updateWaitlistEntryStatus } from "@/api/adminApi";
import type { ServiceType, WaitlistStatus } from "@/types/api";
import { formatDateTimeLabel } from "@/utils/format";
import { getAdminServiceErrorMessage } from "@/utils/errors";

type AdminServiceWaitlistSectionProps = {
  businessId: string;
  serviceId: string;
  serviceType: ServiceType;
  waitlistEnabled: boolean;
};

const STATUS_OPTIONS: WaitlistStatus[] = ["waiting", "contacted", "cancelled", "resolved"];

function statusLabel(status: WaitlistStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function AdminServiceWaitlistSection({
  businessId,
  serviceId,
  serviceType,
  waitlistEnabled,
}: AdminServiceWaitlistSectionProps) {
  const queryClient = useQueryClient();
  const isBooking = serviceType === "booking";

  const waitlistQuery = useQuery({
    queryKey: ["waitlist-entries", businessId, serviceId],
    queryFn: () => listWaitlistEntries(businessId, { service_id: serviceId }),
    enabled: isBooking && waitlistEnabled && Boolean(serviceId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, status }: { entryId: string; status: WaitlistStatus }) =>
      updateWaitlistEntryStatus(businessId, entryId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["waitlist-entries", businessId, serviceId],
      });
    },
  });

  if (!isBooking || !waitlistEnabled || !serviceId) {
    return null;
  }

  const entries = waitlistQuery.data?.data ?? [];

  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="admin-service-waitlist"
      id="admin-service-waitlist-entries"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Waitlist entries</h3>
        <p className="mt-1 text-xs text-slate-600">
          Customers who join the waitlist appear here. Cancelling a booking does not
          automatically create a new booking yet.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          For now, contact the customer manually or change the status. Automatic promotion
          will be added later.
        </p>
      </div>

      {waitlistQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading waitlist…</p>
      ) : null}

      {waitlistQuery.isError ? (
        <p className="text-sm text-red-600" role="alert">
          {getAdminServiceErrorMessage(waitlistQuery.error)}
        </p>
      ) : null}

      {!waitlistQuery.isLoading && entries.length === 0 ? (
        <p className="text-sm text-slate-500">No waitlist entries yet.</p>
      ) : null}

      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
              data-testid="waitlist-entry"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{entry.customer_name}</p>
                  <p className="text-slate-600">{formatDateTimeLabel(entry.starts_at)}</p>
                  <p className="text-xs text-slate-500">
                    {[entry.customer_email, entry.customer_phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {statusLabel(entry.status)}
                </span>
              </div>
              <label className="mt-2 block text-xs text-slate-600">
                <span>Update status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={entry.status}
                  disabled={updateMutation.isPending}
                  onChange={(event) =>
                    updateMutation.mutate({
                      entryId: entry.id,
                      status: event.target.value as WaitlistStatus,
                    })
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
