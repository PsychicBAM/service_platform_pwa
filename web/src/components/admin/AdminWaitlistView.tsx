import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listWaitlistEntries, updateWaitlistEntryStatus } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import type { WaitlistStatus } from "@/types/api";
import { getAdminServiceErrorMessage, getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type StatusFilter = "all" | WaitlistStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "contacted", label: "Contacted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_OPTIONS: WaitlistStatus[] = ["waiting", "contacted", "cancelled", "resolved"];

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

function statusLabel(status: WaitlistStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type AdminWaitlistViewProps = {
  businessId: string;
};

export function AdminWaitlistView({ businessId }: AdminWaitlistViewProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-waitlist", businessId, statusFilter],
    queryFn: () =>
      listWaitlistEntries(
        businessId,
        statusFilter === "all" ? undefined : { status: statusFilter },
      ),
    enabled: Boolean(businessId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, status }: { entryId: string; status: WaitlistStatus }) =>
      updateWaitlistEntryStatus(businessId, entryId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-waitlist", businessId] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(getAdminServiceErrorMessage(err, "Could not update waitlist status."));
    },
  });

  const entries = data?.data ?? [];

  return (
    <div className="space-y-4" data-testid="admin-waitlist-view">
      <p className="text-sm text-slate-600">
        Customers who join a full time slot appear here. Cancelling a booking does not
        automatically create a booking from the waitlist yet.
      </p>
      <p className="text-sm text-slate-600">
        Changing status does not create a booking.
      </p>

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={statusFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setActionError(null);
            }}
          />
        ))}
      </div>

      {isLoading ? <LoadingState message="Loading waitlist…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load waitlist"
          message={getMeErrorMessage(error, "Unable to load waitlist entries")}
        />
      ) : null}

      {!isLoading && !isError && entries.length === 0 ? (
        <EmptyState title="No waitlist entries yet." />
      ) : null}

      {!isLoading && !isError && entries.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              data-testid="waitlist-entry-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{entry.customer_name}</p>
                <StatusBadge status={entry.status} kind="waitlist" />
              </div>
              <p className="mt-2 text-sm text-slate-800">{entry.service_name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateTimeLabel(entry.starts_at)}
              </p>
              {entry.customer_email || entry.customer_phone ? (
                <p className="mt-1 text-sm text-slate-600">
                  {[entry.customer_email, entry.customer_phone].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {entry.note ? (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Note:</span> {entry.note}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Joined {formatDateTimeLabel(entry.created_at)}
              </p>
              <label className="mt-4 block text-sm text-slate-700">
                <span className="font-medium">Update status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  value={entry.status}
                  disabled={updateMutation.isPending}
                  data-testid={`waitlist-status-select-${entry.id}`}
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
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
