import { useQuery } from "@tanstack/react-query";
import { listPublicReviews, listPublicServices } from "@/api/publicApi";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StandardPublicBusinessClientActions } from "@/components/public/StandardPublicBusinessClientActions";
import { StandardPublicBusinessHero } from "@/components/public/StandardPublicBusinessHero";
import { StandardPublicServiceCard } from "@/components/public/StandardPublicServiceCard";
import { partitionPublicServices } from "@/lib/standardPublicHero";
import { formatDateTimeLabel } from "@/utils/format";
import type { PublicBusiness } from "@/types/api";

type StandardPublicBusinessHomeProps = {
  business: PublicBusiness;
  slug: string;
};

export function StandardPublicBusinessHome({ business, slug }: StandardPublicBusinessHomeProps) {
  const servicesQuery = useQuery({
    queryKey: ["public-services", slug],
    queryFn: () => listPublicServices(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: ["public-reviews", slug],
    queryFn: () => listPublicReviews(slug),
  });

  const services = servicesQuery.data ?? [];
  const { bookingServices, requestServices } = partitionPublicServices(services);
  const recent = reviewsQuery.data?.reviews ?? [];

  return (
    <section className="space-y-6" data-testid="standard-public-business-home">
      <StandardPublicBusinessClientActions operatingMode={business.operating_mode} />

      {servicesQuery.isLoading ? <LoadingState message="Loading services…" /> : null}

      {!servicesQuery.isLoading ? (
        <StandardPublicBusinessHero
          business={business}
          services={services}
          reviewSummary={reviewsQuery.data?.summary ?? null}
        />
      ) : null}

      {!servicesQuery.isLoading && services.length === 0 ? (
        <div data-testid="standard-public-business-no-services">
          <EmptyState
            title="No public services yet."
            description="Check back soon for services from this business."
          />
        </div>
      ) : null}

      {!servicesQuery.isLoading && services.length > 0 ? (
        <section id="services" className="space-y-8" data-testid="standard-public-business-services">
          <div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Services</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse services and choose the option that fits your needs.
            </p>
          </div>

          {bookingServices.length > 0 ? (
            <div id="services-booking" className="space-y-4" data-testid="standard-public-booking-services">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Book online</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Choose a time and book instantly.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {bookingServices.map((service) => (
                  <StandardPublicServiceCard key={service.id} slug={slug} service={service} />
                ))}
              </div>
            </div>
          ) : null}

          {requestServices.length > 0 ? (
            <div id="services-requests" className="space-y-4" data-testid="standard-public-request-services">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Request service</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Send details and get a response from the business.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {requestServices.map((service) => (
                  <StandardPublicServiceCard key={service.id} slug={slug} service={service} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {recent.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-semibold text-slate-900">Recent reviews</h2>
          <div className="mt-4 space-y-3">
            {recent.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                data-testid="public-review"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{review.customer_name}</p>
                  <p className="text-sm font-semibold text-amber-700">{review.rating} ★</p>
                </div>
                {review.service_name ? (
                  <p className="mt-1 text-sm text-slate-600">{review.service_name}</p>
                ) : null}
                {review.comment ? (
                  <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">{formatDateTimeLabel(review.created_at)}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
