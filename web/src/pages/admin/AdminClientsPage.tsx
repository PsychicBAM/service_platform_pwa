import { useQuery } from "@tanstack/react-query";
import { listAdminClients } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";

export function AdminClientsPage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-clients", businessId],
    queryFn: () => listAdminClients(businessId!),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Clients</h2>

      {isLoading ? <LoadingState message="Loading clients…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load clients"
          message={getMeErrorMessage(error, "Unable to load clients")}
        />
      ) : null}
      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No clients yet" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((client) => (
            <article
              key={client.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{client.full_name}</h3>
              {client.email ? (
                <p className="mt-1 text-sm text-slate-600">{client.email}</p>
              ) : null}
              {client.phone ? (
                <p className="text-sm text-slate-600">{client.phone}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                {client.bookings_count} booking{client.bookings_count === 1 ? "" : "s"} ·{" "}
                {client.orders_count} order{client.orders_count === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
