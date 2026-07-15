import { useQuery } from "@tanstack/react-query";
import { listPublicReviews, listPublicServices } from "@/api/publicApi";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StandardPublicBusinessClientActions } from "@/components/public/StandardPublicBusinessClientActions";
import { StandardPublicBusinessHero } from "@/components/public/StandardPublicBusinessHero";
import { StandardPublicBusinessLocationSection } from "@/components/public/StandardPublicBusinessLocationSection";
import { StandardPublicBusinessQuickInfo } from "@/components/public/StandardPublicBusinessQuickInfo";
import { StandardPublicBusinessReviewsSection } from "@/components/public/StandardPublicBusinessReviewsSection";
import { StandardPublicMobileStickyCta } from "@/components/public/StandardPublicMobileStickyCta";
import { StandardPublicServiceCard } from "@/components/public/StandardPublicServiceCard";
import { partitionPublicServices } from "@/lib/standardPublicHero";
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
  const reviewSummary = reviewsQuery.data?.summary ?? null;
  const reviews = reviewsQuery.data?.reviews ?? [];
  const hasBookingServices = bookingServices.length > 0;
  const hasRequestServices = requestServices.length > 0;
  const showMobileStickyCta =
    !servicesQuery.isLoading &&
    (hasBookingServices || hasRequestServices || services.length > 0);

  return (
    <section
      className={`space-y-4 md:space-y-6 ${
        showMobileStickyCta ? "pb-28 md:pb-0" : ""
      }`}
      data-testid="standard-public-business-home"
      data-mobile-sticky-padding={showMobileStickyCta ? "true" : "false"}
    >
      <StandardPublicBusinessClientActions operatingMode={business.operating_mode} />

      {servicesQuery.isLoading ? <LoadingState message="Loading services…" /> : null}

      {!servicesQuery.isLoading ? (
        <StandardPublicBusinessHero
          business={business}
          services={services}
          reviewSummary={reviewSummary}
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
        <section id="services" className="space-y-6 md:space-y-8" data-testid="standard-public-business-services">
          <div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Services</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse services and choose the option that fits your needs.
            </p>
          </div>

          {bookingServices.length > 0 ? (
            <div id="services-booking" className="space-y-3 md:space-y-4" data-testid="standard-public-booking-services">
              <div>
                <h3 className="text-base font-semibold text-slate-900 md:text-lg">Book online</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Choose a time and book instantly.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 2xl:grid-cols-3">
                {bookingServices.map((service) => (
                  <StandardPublicServiceCard key={service.id} slug={slug} service={service} />
                ))}
              </div>
            </div>
          ) : null}

          {requestServices.length > 0 ? (
            <div id="services-requests" className="space-y-3 md:space-y-4" data-testid="standard-public-request-services">
              <div>
                <h3 className="text-base font-semibold text-slate-900 md:text-lg">Request service</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Send details and get a response from the business.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 2xl:grid-cols-3">
                {requestServices.map((service) => (
                  <StandardPublicServiceCard key={service.id} slug={slug} service={service} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!servicesQuery.isLoading ? (
        <section
          className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
          data-testid="standard-public-trust-section"
        >
          <StandardPublicBusinessReviewsSection
            summary={reviewSummary}
            reviews={reviews}
            isLoading={reviewsQuery.isLoading}
          />
          <div className="space-y-4 md:space-y-6">
            <StandardPublicBusinessQuickInfo
              business={business}
              hasBookingServices={bookingServices.length > 0}
              hasRequestServices={requestServices.length > 0}
              reviewSummary={reviewSummary}
            />
            <StandardPublicBusinessLocationSection business={business} />
          </div>
        </section>
      ) : null}

      <StandardPublicMobileStickyCta
        hasBookingServices={hasBookingServices}
        hasRequestServices={hasRequestServices}
        hasServices={services.length > 0}
        isLoading={servicesQuery.isLoading}
      />
    </section>
  );
}
