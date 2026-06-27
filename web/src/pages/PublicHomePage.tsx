import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBusiness } from "@/api/publicApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { OperatingMode } from "@/types/api";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

const DEMO_SLUG = "demo-business";

function WelcomeLanding() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-brand-700 px-5 py-8 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="mt-2 text-brand-100">
          Browse services, book appointments, or place orders from your phone.
        </p>
      </div>
      <p className="text-sm text-slate-600">
        Open a business page to get started. Try the demo business seeded by the
        backend:
      </p>
      <Link
        to={`/b/${DEMO_SLUG}`}
        className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
      >
        Open demo business
      </Link>
    </section>
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

  const copy = modeCopy(data.operating_mode);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl font-bold text-brand-700"
              aria-hidden
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.name}</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">{copy.intro}</p>
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

      <div className="grid gap-3">
        <Link
          to={`/b/${slug}/services`}
          className="rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
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
