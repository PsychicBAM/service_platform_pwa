import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listPublicServices } from "@/api/publicApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ServiceCard } from "@/components/ServiceCard";
import type { ServiceType } from "@/types/api";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

type FilterValue = "all" | ServiceType;

export function ServicesPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-services", slug],
    queryFn: () => listPublicServices(slug),
    enabled: Boolean(slug),
  });

  const hasBooking = useMemo(
    () => (data ?? []).some((service) => service.type === "booking"),
    [data],
  );
  const hasOrder = useMemo(
    () => (data ?? []).some((service) => service.type === "order"),
    [data],
  );

  const filteredServices = useMemo(() => {
    if (!data) {
      return [];
    }
    if (filter === "all") {
      return data;
    }
    return data.filter((service) => service.type === filter);
  }, [data, filter]);

  const showBookingFilter = hasBooking;
  const showOrderFilter = hasOrder;
  const showFilters = showBookingFilter || showOrderFilter;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold md:text-2xl">Services</h1>
        <Link to={`/b/${slug}`} className="shrink-0 text-sm text-brand-700 hover:underline">
          Back
        </Link>
      </div>

      {isLoading ? <LoadingState message="Loading services…" /> : null}

      {isError ? (
        <ErrorState
          title={isNotFoundError(error) ? "Business not found" : "Could not load services"}
          message={getApiErrorMessage(error, "Unable to load services")}
        />
      ) : null}

      {!isLoading && !isError && data && data.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="This business has not published any services."
        />
      ) : null}

      {!isLoading && !isError && data && data.length > 0 ? (
        <>
          {showFilters ? (
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="All"
              />
              {showBookingFilter ? (
                <FilterButton
                  active={filter === "booking"}
                  onClick={() => setFilter("booking")}
                  label="Bookings"
                />
              ) : null}
              {showOrderFilter ? (
                <FilterButton
                  active={filter === "order"}
                  onClick={() => setFilter("order")}
                  label="Requests"
                />
              ) : null}
            </div>
          ) : null}

          {filteredServices.length === 0 ? (
            <EmptyState
              title="No matching services"
              description="Try another filter to see more services."
            />
          ) : (
            <div className="grid items-stretch gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} slug={slug} service={service} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
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
