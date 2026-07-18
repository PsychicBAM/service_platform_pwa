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
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
      <p className="text-sm text-gray-500">
        Customers who join a full time slot appear here. Use Promote when a spot opens —
        promotion creates a booking only if the slot still has capacity.
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
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          data-testid="admin-waitlist-table"
        >
          <div
            className="grid grid-cols-1 divide-y divide-gray-100"
            data-testid="admin-waitlist-list"
          >
            {/* Desktop header */}
            <div className="hidden bg-gray-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr] md:gap-3">
              <span>Customer</span>
              <span>Service</span>
              <span>Requested slot</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {entries.map((entry) => {
              const canPromote = PROMOTABLE_STATUSES.includes(entry.status);
              const isPromoting = promotingEntryId === entry.id && promoteMutation.isPending;

              return (
                <article
                  key={entry.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr] md:items-start md:gap-3"
                  data-testid="waitlist-entry-card"
                >
                  <div data-testid="admin-waitlist-row">
                    <p className="font-semibold text-gray-900">{entry.customer_name}</p>
                    {entry.customer_email || entry.customer_phone ? (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {[entry.customer_email, entry.customer_phone].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {entry.note ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Note:</span> {entry.note}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-400">
                      Joined {formatDateTimeLabel(entry.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.service_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-800">{formatDateTimeLabel(entry.starts_at)}</p>
                  </div>

                  <div>
                    <StatusBadge status={entry.status} kind="waitlist" />
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    {canPromote ? (
                      <button
                        type="button"
                        onClick={() => requestPromote(entry.id, entry.customer_name)}
                        disabled={isPromoting || updateMutation.isPending}
                        className="min-h-10 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 md:min-h-0 md:py-1.5"
                        data-testid={`waitlist-promote-${entry.id}`}
                      >
                        <span data-testid="admin-waitlist-promote">
                          {isPromoting ? "Promoting…" : "Promote to booking"}
                        </span>
                      </button>
                    ) : null}
                    <label className="block w-full text-sm text-gray-700 md:max-w-[12rem]">
                      <span className="sr-only">Update status</span>
                      <select
                        className="mt-0 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm md:min-h-0 md:py-1.5"
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
