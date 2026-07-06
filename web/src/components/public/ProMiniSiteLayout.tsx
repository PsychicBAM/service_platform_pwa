import { Link } from "react-router-dom";
import { ServiceCard } from "@/components/ServiceCard";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";

export type ProMiniSiteLayoutProps = {
  business: PublicBusiness;
  publicSlug: string;
  services?: PublicService[];
  bookingHref?: string;
  orderHref?: string;
};

export function getProMiniSiteCtas(
  business: PublicBusiness,
  publicSlug: string,
  services?: PublicService[],
): {
  bookingHref: string;
  orderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
} {
  const servicesHref = `/b/${publicSlug}/services`;
  const firstOrderService = services?.find((service) => service.type === "order");
  const orderHref = firstOrderService
    ? `/b/${publicSlug}/services/${firstOrderService.id}/request`
    : servicesHref;

  return {
    bookingHref: servicesHref,
    orderHref,
    showBookingCta: business.operating_mode !== "orders_only",
    showRequestCta: business.operating_mode !== "booking_only",
  };
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book appointments and manage your visits.";
    case "orders_only":
      return "Browse services and submit requests online.";
    default:
      return "Book appointments or submit service requests in one place.";
  }
}

export function ProMiniSiteLayout({
  business,
  publicSlug,
  services,
  bookingHref,
  orderHref,
}: ProMiniSiteLayoutProps) {
  const ctas = getProMiniSiteCtas(business, publicSlug, services);
  const primaryBookingHref = bookingHref ?? ctas.bookingHref;
  const secondaryOrderHref = orderHref ?? ctas.orderHref;

  return (
    <section className="space-y-6" data-testid="pro-mini-site-layout">
      <header
        className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-brand-50 p-5 shadow-sm md:p-8"
        data-testid="pro-mini-site-hero"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover md:h-20 md:w-20"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl font-bold text-violet-800 md:h-20 md:w-20 md:text-3xl"
              aria-hidden
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Pro profile</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-4xl">{business.name}</h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">{heroIntro(business.operating_mode)}</p>
            {business.description ? (
              <p className="mt-2 text-sm text-slate-600 md:text-base" data-testid="pro-mini-site-about">
                {business.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {ctas.showBookingCta ? (
            <Link
              to={primaryBookingHref}
              className="rounded-xl bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
              data-testid="pro-mini-site-book-cta"
            >
              Browse services to book
            </Link>
          ) : null}
          {ctas.showRequestCta ? (
            <Link
              to={secondaryOrderHref}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
              data-testid="pro-mini-site-request-cta"
            >
              Submit a request
            </Link>
          ) : null}
        </div>
      </header>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="pro-mini-site-services-heading"
        data-testid="pro-mini-site-services"
      >
        <h2 id="pro-mini-site-services-heading" className="text-lg font-semibold text-slate-900">
          Services
        </h2>
        {services && services.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <ServiceCard key={service.id} slug={publicSlug} service={service} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Services will appear here.{" "}
            <Link
              to={`/b/${publicSlug}/services`}
              className="font-medium text-brand-700 hover:underline"
            >
              View services
            </Link>
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="pro-mini-site-contact-heading"
        data-testid="pro-mini-site-contact"
      >
        <h2 id="pro-mini-site-contact-heading" className="text-lg font-semibold text-slate-900">
          Contact & details
        </h2>
        <dl className="mt-3 space-y-2 text-sm text-slate-600">
          {business.address ? (
            <div>
              <dt className="font-medium text-slate-700">Address</dt>
              <dd>{business.address}</dd>
            </div>
          ) : null}
          {business.contact_phone ? (
            <div>
              <dt className="font-medium text-slate-700">Phone</dt>
              <dd>
                <a href={`tel:${business.contact_phone}`} className="text-brand-700 hover:underline">
                  {business.contact_phone}
                </a>
              </dd>
            </div>
          ) : null}
          {!business.address && !business.contact_phone ? (
            <p className="text-slate-500">Contact details are not available yet.</p>
          ) : null}
        </dl>
      </section>

      <section
        className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
        aria-labelledby="pro-mini-site-gallery-heading"
        data-testid="pro-mini-site-gallery-placeholder"
      >
        <h2 id="pro-mini-site-gallery-heading" className="text-lg font-semibold text-slate-900">
          Gallery
        </h2>
        <p className="mt-2 text-sm text-slate-600">Media gallery coming soon</p>
      </section>
    </section>
  );
}
