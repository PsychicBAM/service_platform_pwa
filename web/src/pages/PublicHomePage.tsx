import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBusiness } from "@/api/publicApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PricingSection } from "@/components/PricingSection";
import type { OperatingMode } from "@/types/api";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

const DEMO_SLUG = "demo-business";

const PLATFORM_FEATURES = [
  {
    title: "Book appointments",
    description: "Clients pick a service, date, and time from your public page.",
  },
  {
    title: "Submit requests",
    description: "Collect project details and manage quote-based orders online.",
  },
  {
    title: "Admin dashboard",
    description: "Confirm bookings, accept orders, and message clients in one place.",
  },
  {
    title: "Client self-service",
    description: "Logged-in clients view bookings, orders, and message threads.",
  },
] as const;

function WelcomeLanding() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-10 text-white shadow-sm md:px-10 md:py-12">
        <div className="mx-auto max-w-3xl text-center md:text-left">
          <p className="text-sm font-medium text-brand-100">Multi-tenant service platform</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Bookings and requests for your business
          </h1>
          <p className="mt-4 text-base text-brand-100 md:text-lg">
            Run a mobile-friendly public page, manage appointments and orders, and keep clients
            informed — without building custom software.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              to={`/b/${DEMO_SLUG}`}
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              Try demo business
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-brand-300 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="platform-features-heading" className="space-y-4">
        <div className="text-center md:text-left">
          <h2 id="platform-features-heading" className="text-lg font-semibold text-slate-900">
            Everything you need to get started
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            One platform for appointment booking and service requests.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <PricingSection />

      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ready to explore?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Open the seeded demo business to see a live booking and request flow, or sign in as the
          demo owner to try the admin area.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to={`/b/${DEMO_SLUG}/services`}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Browse demo services
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Owner login
          </Link>
        </div>
      </section>
    </div>
  );
}

function modeCopy(mode: OperatingMode) {
  switch (mode) {
    case "booking_only":
      return {
        intro: "Book appointments and manage your visits.",
        bookingsLabel: "📅 My bookings",
        ordersLabel: null,
      };
    case "orders_only":
      return {
        intro: "Browse services and submit requests online.",
        bookingsLabel: null,
        ordersLabel: "📝 My requests",
      };
    default:
      return {
        intro: "Book appointments or submit service requests in one place.",
        bookingsLabel: "📅 My bookings",
        ordersLabel: "📝 My requests",
      };
  }
}

export function PublicHomePage() {
  const { slug } = useParams<{ slug?: string }>();

  if (!slug) {
    return <WelcomeLanding />;
  }

  return <BusinessHomeContent slug={slug} />;
}

function BusinessHomeContent({ slug }: { slug: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-business", slug],
    queryFn: () => getPublicBusiness(slug),
  });

  if (isLoading) {
    return <LoadingState message="Loading business…" />;
  }

  if (isError) {
    return (
      <ErrorState
        title={isNotFoundError(error) ? "Business not found" : "Could not load business"}
        message={getApiErrorMessage(error, "Unable to load business")}
      />
    );
  }

  if (!data) {
    return <ErrorState title="Could not load business" message="No data returned." />;
  }

  // TODO(Phase 10 Slice 3F): Wire ProMiniSiteLayout when PublicBusiness includes a public-safe
  // subscription plan (planned in Slice 3D). Example:
  // data.plan === "pro" ? (
  //   <ProMiniSiteLayout business={data} publicSlug={slug} services={services} />
  // ) : (
  //   <Standard layout below />
  // )
  // PublicBusinessRead does not expose plan today, so all businesses keep the standard layout.

  const copy = modeCopy(data.operating_mode);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-4">
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover md:h-16 md:w-16"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl font-bold text-brand-700 md:h-16 md:w-16 md:text-2xl"
              aria-hidden
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{data.name}</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 md:text-base">{copy.intro}</p>
        {data.description ? (
          <p className="mt-2 text-sm text-slate-600">{data.description}</p>
        ) : null}
        {data.address ? (
          <p className="mt-3 text-sm text-slate-500">{data.address}</p>
        ) : null}
        {data.contact_phone ? (
          <p className="mt-1 text-sm text-slate-500">
            <a href={`tel:${data.contact_phone}`} className="text-brand-700 hover:underline">
              {data.contact_phone}
            </a>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to={`/b/${slug}/services`}
          className="rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700 sm:col-span-2 lg:col-span-1"
        >
          📋 Choose service
        </Link>
        {copy.bookingsLabel ? (
          <Link
            to="/me/bookings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 hover:bg-slate-50"
          >
            {copy.bookingsLabel}
          </Link>
        ) : null}
        {copy.ordersLabel ? (
          <Link
            to="/me/orders"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 hover:bg-slate-50"
          >
            {copy.ordersLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
