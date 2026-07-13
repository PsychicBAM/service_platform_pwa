import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { OperatingMode, PublicBusiness } from "@/types/api";
import { listPublicReviews } from "@/api/publicApi";
import { formatDateTimeLabel } from "@/utils/format";

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

type StandardPublicBusinessHomeProps = {
  business: PublicBusiness;
  slug: string;
};

export function StandardPublicBusinessHome({ business, slug }: StandardPublicBusinessHomeProps) {
  const copy = modeCopy(business.operating_mode);
  const reviewsQuery = useQuery({
    queryKey: ["public-reviews", slug],
    queryFn: () => listPublicReviews(slug),
  });

  const summary = reviewsQuery.data?.summary ?? null;
  const recent = reviewsQuery.data?.reviews ?? [];

  return (
    <section className="space-y-6" data-testid="standard-public-business-home">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-4">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover md:h-16 md:w-16"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl font-bold text-brand-700 md:h-16 md:w-16 md:text-2xl"
              aria-hidden
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{business.name}</h1>
            {summary && summary.review_count > 0 && summary.average_rating ? (
              <p className="mt-2 text-sm font-medium text-slate-700" data-testid="public-rating-summary">
                {summary.average_rating.toFixed(1)} ★ · {summary.review_count} reviews
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 md:text-base">{copy.intro}</p>
        {business.description ? (
          <p className="mt-2 text-sm text-slate-600">{business.description}</p>
        ) : null}
        {business.address ? (
          <p className="mt-3 text-sm text-slate-500">{business.address}</p>
        ) : null}
        {business.contact_phone ? (
          <p className="mt-1 text-sm text-slate-500">
            <a href={`tel:${business.contact_phone}`} className="text-brand-700 hover:underline">
              {business.contact_phone}
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
