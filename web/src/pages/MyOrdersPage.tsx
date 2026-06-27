import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMyOrder, listMyOrders } from "@/api/meApi";
import { AuthPrompt } from "@/components/AuthPrompt";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { MyOrderStatusFilter } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";

const FILTERS: Array<{ value: MyOrderStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

export function MyOrdersPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MyOrderStatusFilter>("active");
  const [actionError, setActionError] = useState<string | null>(null);

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
      <section className="space-y-4">
        <h1 className="text-xl font-bold">My orders</h1>
        <AuthPrompt description="Log in to view orders linked to your account." />
      </section>
    );
  }

  async function handleCancel(id: string, reference: string) {
    setActionError(null);
    const confirmed = window.confirm(`Cancel request ${reference}?`);
    if (!confirmed) {
      return;
    }
    const reason = window.prompt("Optional reason for cancellation:") ?? undefined;
    try {
      await cancelMutation.mutateAsync({ id, reason: reason || undefined });
    } catch (error) {
      setActionError(getMeErrorMessage(error, "Could not cancel request."));
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      <p className="text-sm text-slate-600">
        Submitted a request as a guest? Claim it to see it here.
      </p>
      <Link
        to="/me/claim?type=order"
        className="inline-flex text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Claim a guest request
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

      {ordersQuery.isLoading ? <LoadingState message="Loading orders…" /> : null}

      {ordersQuery.isError ? (
        <ErrorState
          title="Could not load orders"
          message={getMeErrorMessage(ordersQuery.error, "Unable to load orders")}
        />
      ) : null}

      {actionError ? (
        <ErrorState title="Action failed" message={actionError} />
      ) : null}

      {!ordersQuery.isLoading &&
      !ordersQuery.isError &&
      ordersQuery.data?.data.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && ordersQuery.data ? (
        <div className="space-y-3">
          {ordersQuery.data.data.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {order.reference}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{order.business.name}</p>
                  <p className="text-sm font-medium text-slate-800">{order.service.name}</p>
                </div>
                <StatusBadge status={order.status} kind="order" />
              </div>
              {order.last_message_preview ? (
                <p className="mt-3 text-sm text-slate-500">
                  Last message: {order.last_message_preview}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/me/orders/${order.id}`}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  View & messages
                </Link>
                {order.can_cancel ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(order.id, order.reference)}
                    disabled={cancelMutation.isPending}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancel
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
