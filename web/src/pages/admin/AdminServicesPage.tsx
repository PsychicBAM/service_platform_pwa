import { useQuery } from "@tanstack/react-query";
import { listAdminServices } from "@/api/adminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";

export function AdminServicesPage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-services", businessId],
    queryFn: () => listAdminServices(businessId!),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Services</h2>

      {isLoading ? <LoadingState message="Loading services…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load services"
          message={getMeErrorMessage(error, "Unable to load services")}
        />
      ) : null}
      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No services yet" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{service.name}</h3>
                <TypeBadge type={service.type} />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    service.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {service.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-2">
                <PriceLabel service={service} />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
