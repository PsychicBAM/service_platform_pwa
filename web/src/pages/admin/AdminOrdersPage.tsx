import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

export function AdminOrdersPage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", businessId],
    queryFn: () => listAdminOrders(businessId!),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Orders</h2>

      {isLoading ? <LoadingState message="Loading orders…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load orders"
          message={getMeErrorMessage(error, "Unable to load orders")}
        />
      ) : null}
      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{order.reference}</p>
                <StatusBadge status={order.status} kind="order" />
              </div>
              <p className="mt-2 text-sm text-slate-800">{order.service_name}</p>
              <p className="text-sm text-slate-600">{order.client_name}</p>
              <p className="mt-2 text-xs text-slate-500">
                Updated {formatDateTimeLabel(order.updated_at)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
