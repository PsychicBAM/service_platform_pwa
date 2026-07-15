import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listWaitlistEntries,
  promoteWaitlistEntry,
  updateWaitlistEntryStatus,
} from "@/api/adminApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
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

const PROMOTABLE_STATUSES: WaitlistStatus[] = ["waiting", "contacted"];

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
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
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

type PendingPromote = {
  entryId: string;
  customerName: string;
};

export function AdminWaitlistView({ businessId }: AdminWaitlistViewProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [promotingEntryId, setPromotingEntryId] = useState<string | null>(null);
  const [pendingPromote, setPendingPromote] = useState<PendingPromote | null>(null);

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
      setSuccessMessage(null);
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (entryId: string) => promoteWaitlistEntry(businessId, entryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-waitlist", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      setActionError(null);
      setSuccessMessage("Booking created from waitlist.");
      setPromotingEntryId(null);
      setPendingPromote(null);
    },
    onError: (err) => {
      setActionError(
        getAdminServiceErrorMessage(err, "Could not promote waitlist entry to booking."),
      );
      setSuccessMessage(null);
      setPromotingEntryId(null);
      setPendingPromote(null);
    },
  });

  const entries = data?.data ?? [];

  function requestPromote(entryId: string, customerName: string) {
    setActionError(null);
    setSuccessMessage(null);
    setPendingPromote({ entryId, customerName });
  }

  function closePromoteDialog() {
    if (promoteMutation.isPending) {
      return;
    }
    setPendingPromote(null);
  }

  function confirmPromote() {
    if (!pendingPromote) {
      return;
    }
    setPromotingEntryId(pendingPromote.entryId);
    promoteMutation.mutate(pendingPromote.entryId);
  }

  return (
    <div className="space-y-4" data-testid="admin-waitlist-view">
      <p className="text-sm text-slate-600">
        Customers who join a full time slot appear here. Cancelling a booking does not
        automatically create a booking from the waitlist yet.
      </p>
      <p className="text-sm text-slate-600">
        Use Promote when a spot opens up. Promotion creates a booking only if the slot
        still has capacity.
      </p>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={statusFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setActionError(null);
              setSuccessMessage(null);
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
        <div
          className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
          data-testid="admin-waitlist-list"
        >
          {entries.map((entry) => {
            const canPromote = PROMOTABLE_STATUSES.includes(entry.status);
            const isPromoting = promotingEntryId === entry.id && promoteMutation.isPending;

            return (
              <article
                key={entry.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                data-testid="waitlist-entry-card"
              >
                <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{entry.customer_name}</p>
                    <StatusBadge status={entry.status} kind="waitlist" />
                  </div>
                  <p className="truncate text-sm text-slate-800">{entry.service_name}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateTimeLabel(entry.starts_at)}
                  </p>
                  {entry.customer_email || entry.customer_phone ? (
                    <p className="truncate text-sm text-slate-600">
                      {[entry.customer_email, entry.customer_phone].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {entry.note ? (
                    <p className="line-clamp-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Note:</span> {entry.note}
                    </p>
                  ) : null}
                  <p className="mt-auto text-xs text-slate-500">
                    Joined {formatDateTimeLabel(entry.created_at)}
                  </p>
                </div>
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4">
                  {canPromote ? (
                    <button
                      type="button"
                      onClick={() => requestPromote(entry.id, entry.customer_name)}
                      disabled={isPromoting || updateMutation.isPending}
                      className="min-h-10 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:py-1.5"
                      data-testid={`waitlist-promote-${entry.id}`}
                    >
                      {isPromoting ? "Promoting…" : "Promote to booking"}
                    </button>
                  ) : null}
                  <label className="block text-sm text-slate-700">
                    <span className="font-medium">Update status</span>
                    <select
                      className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:min-h-0 sm:py-1.5"
                      value={entry.status}
                      disabled={updateMutation.isPending || isPromoting}
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
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pendingPromote)}
        title="Promote waitlist entry?"
        description="This will create a booking if capacity is still available."
        confirmLabel="Promote"
        variant="success"
        isLoading={promoteMutation.isPending}
        onCancel={closePromoteDialog}
        onConfirm={confirmPromote}
      />
    </div>
  );
}
