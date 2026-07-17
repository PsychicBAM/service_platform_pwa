import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "@/api/adminApi";
import { AdminOrderDetailPanel } from "@/components/admin/AdminOrderDetailPanel";
import { AdminReviewLinkAction } from "@/components/admin/AdminReviewLinkAction";
import { AdminReviewRequestEmailAction } from "@/components/admin/AdminReviewRequestEmailAction";
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
    <section className="space-y-4" data-testid="admin-orders-page">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Orders</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Review service requests, update status, and reply to customers.
        </p>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="admin-orders-status-filters"
      >
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
        <div
          className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
          data-testid="admin-orders-list"
        >
          {data.data.map((order) => {
            const contact = [order.client_email, order.client_phone].filter(Boolean).join(" · ");

            return (
              <article
                key={order.id}
                className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  selectedOrderId === order.id
                    ? "border-brand-400 ring-1 ring-brand-200"
                    : "border-slate-200"
                }`}
                data-testid="admin-order-card"
              >
                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="truncate font-mono text-sm font-semibold text-slate-900">
                      {order.reference}
                    </p>
                    <StatusBadge status={order.status} kind="order" />
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">
                    {order.service_name}
                  </p>
                  <p className="truncate text-sm text-slate-600">{order.client_name}</p>
                  {contact ? (
                    <p className="truncate text-xs text-slate-500">{contact}</p>
                  ) : null}
                  <p className="mt-auto text-xs text-slate-500">
                    Created {formatDateTimeLabel(order.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSuccessMessage(null);
                      setActionError(null);
                    }}
                    className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:flex-none sm:py-1.5"
                    data-testid={`admin-order-view-${order.id}`}
                  >
                    View details
                  </button>
                  {businessId ? (
                    <>
                      <AdminReviewLinkAction
                        businessId={businessId}
                        orderId={order.id}
                        canReview={order.can_review}
                        hasReview={order.has_review}
                        onCopied={setSuccessMessage}
                        onError={setActionError}
                      />
                      <AdminReviewRequestEmailAction
                        businessId={businessId}
                        orderId={order.id}
                        canReview={order.can_review}
                        hasReview={order.has_review}
                        followUpEmailConsent={order.follow_up_email_consent}
                        clientEmail={order.client_email}
                        onSent={setSuccessMessage}
                        onError={setActionError}
                      />
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
