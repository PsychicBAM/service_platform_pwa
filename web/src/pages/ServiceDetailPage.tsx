import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicService } from "@/api/publicApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import { formatDuration, serviceTypeIcon } from "@/utils/format";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

export function ServiceDetailPage() {
  const { slug = "", serviceId = "" } = useParams<{
    slug: string;
    serviceId: string;
  }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-service", slug, serviceId],
    queryFn: () => getPublicService(slug, serviceId),
    enabled: Boolean(slug && serviceId),
  });

  const isBooking = data?.type === "booking";
  const duration = isBooking ? formatDuration(data?.duration_minutes) : null;

  return (
    <section className="space-y-4">
      <Link
        to={`/b/${slug}/services`}
        className="inline-block text-sm text-brand-700 hover:underline"
      >
        ← Back to services
      </Link>

      {isLoading ? <LoadingState message="Loading service…" /> : null}

      {isError ? (
        <ErrorState
          title={isNotFoundError(error) ? "Service not found" : "Could not load service"}
          message={getApiErrorMessage(error, "Unable to load service")}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>
                {serviceTypeIcon(data.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
                  <TypeBadge type={data.type} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {isBooking ? "Appointment service" : "Service request"}
                </p>
              </div>
            </div>

            {data.description ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{data.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
                <PriceLabel service={data} className="mt-1 text-base" />
              </div>
              {duration ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Duration</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{duration}</p>
                </div>
              ) : null}
            </div>
          </div>

          {isBooking ? (
            <Link
              to={`/b/${slug}/services/${serviceId}/book`}
              className="block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-700"
            >
              📅 Book appointment
            </Link>
          ) : (
            <Link
              to={`/b/${slug}/services/${serviceId}/request`}
              className="block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-700"
            >
              📝 Submit request
            </Link>
          )}
        </>
      ) : null}
    </section>
  );
}
