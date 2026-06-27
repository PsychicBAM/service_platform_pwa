import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "@/api/adminApi";
import { AdminOrderDetailPanel } from "@/components/admin/AdminOrderDetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { OrderStatus } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type StatusFilter = "all" | OrderStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
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

export function AdminOrdersPage() {
  const { businessId } = useAdminBusiness();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", businessId, statusFilter],
    queryFn: () =>
      listAdminOrders(
        businessId!,
        statusFilter === "all" ? undefined : { status: statusFilter },
      ),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Orders</h2>

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
              setSelectedOrderId(null);
              setSuccessMessage(null);
              setActionError(null);
            }}
          />
        ))}
      </div>

      {selectedOrderId && businessId ? (
        <AdminOrderDetailPanel
          businessId={businessId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
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

      {isLoading ? <LoadingState message="Loading orders…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load orders"
          message={getMeErrorMessage(error, "Unable to load orders")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No orders match this filter" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((order) => (
            <article
              key={order.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                selectedOrderId === order.id
                  ? "border-brand-400 ring-1 ring-brand-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{order.reference}</p>
                <StatusBadge status={order.status} kind="order" />
              </div>
              <p className="mt-2 text-sm text-slate-800">{order.service_name}</p>
              <p className="text-sm text-slate-600">{order.client_name}</p>
              <p className="mt-2 text-xs text-slate-500">
                Created {formatDateTimeLabel(order.created_at)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderId(order.id);
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
