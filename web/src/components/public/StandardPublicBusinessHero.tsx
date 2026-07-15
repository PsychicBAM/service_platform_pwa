import {
  formatStandardPublicLocation,
  partitionPublicServices,
  resolveStandardPublicCoverUrl,
  resolveStandardPublicRating,
  standardPublicCoverGradient,
} from "@/lib/standardPublicHero";
import type { PublicBusiness, PublicService } from "@/types/api";

type StandardPublicBusinessHeroProps = {
  business: PublicBusiness;
  services: PublicService[];
  reviewSummary?: { average_rating: number | null; review_count: number } | null;
};

function HeroCta({
  href,
  label,
  variant,
  testId,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
  testId: string;
}) {
  const className =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 md:w-auto md:py-2.5"
      : "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 md:w-auto md:py-2.5";

  return (
    <a href={href} className={className} data-testid={testId}>
      {label}
    </a>
  );
}

export function StandardPublicBusinessHero({
  business,
  services,
  reviewSummary,
}: StandardPublicBusinessHeroProps) {
  const coverUrl = resolveStandardPublicCoverUrl(business, services);
  const coverGradient = standardPublicCoverGradient(business.slug);
  const locationText = formatStandardPublicLocation(business);
  const { averageRating, reviewCount } = resolveStandardPublicRating(business, reviewSummary);
  const { bookingServices, requestServices } = partitionPublicServices(services);
  const hasBooking = bookingServices.length > 0;
  const hasRequests = requestServices.length > 0;
  const hasServices = services.length > 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid="standard-public-business-hero"
    >
      <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="relative h-40 overflow-hidden md:h-auto md:min-h-[240px]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              data-testid="standard-public-business-hero-cover"
            />
          ) : (
            <div
              className={`flex h-full min-h-[10rem] w-full items-end bg-gradient-to-br ${coverGradient} p-4 md:min-h-[240px] md:p-5`}
              data-testid="standard-public-business-hero-cover-fallback"
              aria-hidden="true"
            >
              <span className="truncate rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                {business.name}
              </span>
            </div>
          )}
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className="absolute bottom-3 left-3 h-12 w-12 rounded-xl border-2 border-white object-cover shadow-md md:bottom-5 md:left-5 md:h-16 md:w-16"
            />
          ) : null}
        </div>

        <div className="flex flex-col justify-center p-4 md:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Business profile</p>
          <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {business.name}
          </h1>

          {business.description ? (
            <p
              className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 md:mt-3 md:line-clamp-none md:text-base"
              data-testid="standard-public-business-description"
            >
              {business.description}
            </p>
          ) : null}

          {locationText ? (
            <p
              className="mt-2 truncate text-sm text-slate-500 md:mt-3 md:whitespace-normal md:overflow-visible"
              data-testid="standard-public-business-location"
            >
              {locationText}
            </p>
          ) : null}

          <div
            className="mt-3 flex flex-wrap gap-2 md:mt-4"
            data-testid="standard-public-business-trust-row"
          >
            {averageRating != null && reviewCount > 0 ? (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                data-testid="public-rating-summary"
              >
                {averageRating.toFixed(1)} ★ · {reviewCount} reviews
              </span>
            ) : null}
            {hasBooking ? (
              <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
                Bookable online
              </span>
            ) : null}
            {hasRequests ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Accepts requests
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 md:mt-5 md:flex-row md:flex-wrap md:gap-3">
            {hasBooking ? (
              <HeroCta
                href="#services-booking"
                label="Book online"
                variant="primary"
                testId="standard-public-business-book-cta"
              />
            ) : null}
            {hasRequests ? (
              <HeroCta
                href="#services-requests"
                label="Request service"
                variant={hasBooking ? "secondary" : "primary"}
                testId="standard-public-business-request-cta"
              />
            ) : null}
            {!hasBooking && !hasRequests && hasServices ? (
              <HeroCta
                href="#services"
                label="View services"
                variant="primary"
                testId="standard-public-business-view-services-cta"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
