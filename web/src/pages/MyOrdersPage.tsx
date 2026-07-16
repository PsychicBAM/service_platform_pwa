import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMyOrder, listMyOrders } from "@/api/meApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AuthPrompt } from "@/components/AuthPrompt";
import { ClientLeaveReviewSection } from "@/components/ClientLeaveReviewSection";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { MyOrderStatusFilter } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const FILTERS: Array<{ value: MyOrderStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

type PendingCancel = {
  id: string;
  reference: string;
};

const actionButtonClass =
  "min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-1.5";

export function MyOrdersPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MyOrderStatusFilter>("active");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<PendingCancel | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["my-orders", statusFilter],
    queryFn: () => listMyOrders(statusFilter),
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelMyOrder(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  if (!isAuthenticated) {
    return (
      <section className="space-y-4" data-testid="my-orders-page">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">My requests</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Log in to view requests linked to your account.
          </p>
        </div>
        <AuthPrompt description="Log in to view orders linked to your account." />
      </section>
    );
  }

  async function confirmCancel() {
    if (!pendingCancel) {
      return;
    }
    const { id } = pendingCancel;
    setPendingCancel(null);
    setActionError(null);
    const reason = window.prompt("Optional reason for cancellation:") ?? undefined;
    try {
      await cancelMutation.mutateAsync({ id, reason: reason || undefined });
    } catch (error) {
      setActionError(getMeErrorMessage(error, "Could not cancel request."));
    }
  }

  return (
    <section className="space-y-4" data-testid="my-orders-page">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">My requests</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Track service requests, business replies, and status updates.
        </p>
      </div>
      <p className="text-sm text-slate-600">
        Submitted a request as a guest?{" "}
        <Link
          to="/me/claim?type=order"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Claim a guest request
        </Link>
      </p>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="my-orders-filters"
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

      {ordersQuery.isLoading ? <LoadingState message="Loading orders…" /> : null}

      {ordersQuery.isError ? (
        <ErrorState
          title="Could not load orders"
          message={getMeErrorMessage(ordersQuery.error, "Unable to load orders")}
        />
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      {!ordersQuery.isLoading &&
      !ordersQuery.isError &&
      ordersQuery.data?.data.length === 0 ? (
        <div className="space-y-3" data-testid="my-orders-empty">
          <EmptyState
            title="No requests yet"
            description="Send a service request to a business and it will appear here."
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/businesses"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Browse businesses
            </Link>
            <Link
              to="/me/claim?type=order"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Claim guest request
            </Link>
          </div>
        </div>
      ) : null}

      {!ordersQuery.isLoading &&
      !ordersQuery.isError &&
      ordersQuery.data &&
      ordersQuery.data.data.length > 0 ? (
        <div
          className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
          data-testid="my-orders-list"
        >
          {ordersQuery.data.data.map((order) => (
            <article
              key={order.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              data-testid="my-order-card"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="truncate font-mono text-sm font-semibold text-slate-900">
                    {order.reference}
                  </p>
                  <StatusBadge status={order.status} kind="order" />
                </div>
                <p className="truncate text-sm text-slate-600">{order.business.name}</p>
                <p className="truncate text-sm font-medium text-slate-800">{order.service.name}</p>
                <p className="text-xs text-slate-500">
                  Created {formatDateTimeLabel(order.created_at)}
                </p>
                {order.last_message_preview ? (
                  <p className="mt-auto line-clamp-2 break-words text-sm text-slate-500">
                    Last message: {order.last_message_preview}
                  </p>
                ) : (
                  <span className="mt-auto" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-stretch gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
                <Link
                  to={`/me/orders/${order.id}`}
                  className={`${actionButtonClass} border-transparent bg-brand-600 text-center text-white hover:bg-brand-700`}
                  data-testid={`my-order-view-${order.id}`}
                >
                  View & messages
                </Link>
                {order.can_cancel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setPendingCancel({ id: order.id, reference: order.reference });
                    }}
                    disabled={cancelMutation.isPending}
                    className={`${actionButtonClass} border-red-300 bg-white text-red-700 hover:bg-red-50`}
                    data-testid={`my-order-cancel-${order.id}`}
                  >
                    Cancel
                  </button>
                ) : null}
                <ClientLeaveReviewSection
                  targetType="order"
                  targetId={order.id}
                  canReview={order.can_review}
                  hasReview={order.has_review}
                  queryKeysToInvalidate={[["my-orders"]]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={pendingCancel !== null}
        title="Cancel request?"
        description="This request will be cancelled."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        variant="danger"
        isLoading={cancelMutation.isPending}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          void confirmCancel();
        }}
      />
    </section>
  );
}
