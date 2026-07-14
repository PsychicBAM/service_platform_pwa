import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listPublicBusinesses } from "@/api/publicApi";
import { LoadingState } from "@/components/LoadingState";
import { FeaturedBusinessCard } from "@/components/landing/FeaturedBusinessCard";
import { HeroMediaCollage } from "@/components/landing/HeroMediaCollage";

const HOW_IT_WORKS = [
  {
    title: "Find the right service",
    description: "Search by service or location and discover trusted local businesses.",
    icon: "🔍",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Book in minutes",
    description: "Check availability and book online with just a few clicks.",
    icon: "📅",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Enjoy and review",
    description: "Get the job done, leave a review, and help others choose with confidence.",
    icon: "⭐",
    tone: "bg-amber-50 text-amber-700",
  },
] as const;

export function PlatformLandingPage() {
  const navigate = useNavigate();
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  const featuredQuery = useQuery({
    queryKey: ["homepage-featured-businesses"],
    queryFn: () => listPublicBusinesses({ sort: "popular", limit: 12, page: 1 }),
  });

  const featuredBusinesses = featuredQuery.data?.data ?? [];
  const featuredCards = featuredBusinesses.slice(0, 5);
  const totalBusinesses = featuredQuery.data?.meta.total ?? 0;
  const featuredReviewCount = useMemo(
    () => featuredBusinesses.reduce((sum, business) => sum + business.review_count, 0),
    [featuredBusinesses],
  );
  const bookingReadyCount = useMemo(
    () => featuredBusinesses.filter((business) => business.has_booking_service).length,
    [featuredBusinesses],
  );

  const stats = [
    {
      label: "Active businesses",
      value: totalBusinesses > 0 ? String(totalBusinesses) : "—",
      icon: "🛡",
    },
    {
      label: "Booking-ready services",
      value: bookingReadyCount > 0 ? String(bookingReadyCount) : "Online",
      icon: "✓",
    },
    {
      label: "Published reviews",
      value: featuredReviewCount > 0 ? String(featuredReviewCount) : "Growing",
      icon: "★",
    },
    {
      label: "Secure customer flows",
      value: "Protected",
      icon: "🔒",
    },
  ];

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (serviceQuery.trim()) {
      params.set("q", serviceQuery.trim());
    }
    if (locationQuery.trim()) {
      params.set("location", locationQuery.trim());
    }
    const query = params.toString();
    navigate(query ? `/businesses?${query}` : "/businesses");
  }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="space-y-6">
            <h1
              className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl"
              data-testid="homepage-hero-heading"
            >
              Discover and book trusted{" "}
              <span className="text-brand-700">local services</span>
            </h1>
            <p className="max-w-xl text-base text-slate-600 md:text-lg">
              Find top-rated professionals near you. Book with confidence in just a few clicks.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60"
              data-testid="homepage-search-form"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span aria-hidden="true" className="text-slate-400">
                    🔍
                  </span>
                  <input
                    type="search"
                    value={serviceQuery}
                    onChange={(event) => setServiceQuery(event.target.value)}
                    placeholder="What service do you need?"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    data-testid="homepage-service-search"
                  />
                </label>
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span aria-hidden="true" className="text-slate-400">
                    📍
                  </span>
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Your location"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    data-testid="homepage-location-search"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
                  data-testid="homepage-search-button"
                >
                  Search
                </button>
              </div>
            </form>

            <div
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              data-testid="homepage-hero-ctas"
            >
              <Link
                to="/pricing"
                className="rounded-xl bg-brand-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-800"
                data-testid="homepage-get-started"
              >
                Get started
              </Link>
              <Link
                to="/businesses"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                data-testid="homepage-browse-businesses"
              >
                Browse businesses
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                How it works
              </a>
            </div>
          </div>

          <HeroMediaCollage businesses={featuredBusinesses} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-6"
          data-testid="homepage-trust-stats"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-start gap-3 rounded-xl px-2 py-1">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg"
                aria-hidden="true"
              >
                {stat.icon}
              </span>
              <div>
                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured businesses</h2>
            <p className="mt-1 text-sm text-slate-600">
              Popular public pages ready for bookings and requests.
            </p>
          </div>
          <Link
            to="/businesses"
            className="text-sm font-semibold text-brand-700 hover:underline"
            data-testid="homepage-view-all-businesses"
          >
            View all businesses →
          </Link>
        </div>

        {featuredQuery.isLoading ? <LoadingState message="Loading featured businesses…" /> : null}

        {!featuredQuery.isLoading && featuredCards.length > 0 ? (
          <div
            className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:items-stretch lg:overflow-visible"
            data-testid="homepage-featured-grid"
          >
            {featuredCards.map((business) => (
              <FeaturedBusinessCard key={business.slug} business={business} />
            ))}
          </div>
        ) : null}

        {!featuredQuery.isLoading && featuredCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-600">
              Featured businesses will appear here as public pages go live.
            </p>
            <Link
              to="/businesses"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              Browse marketplace
            </Link>
          </div>
        ) : null}
      </section>

      <section id="how-it-works" className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
          <div
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch"
            data-testid="homepage-how-it-works"
          >
            {HOW_IT_WORKS.map((step) => (
              <article
                key={step.title}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-lg ${step.tone}`}
                  aria-hidden="true"
                >
                  {step.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </article>
            ))}
            <aside
              data-testid="homepage-how-it-works-review"
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
            >
              <div className="flex flex-1 flex-col justify-center rounded-xl bg-gradient-to-br from-brand-700/20 to-slate-200/80 p-6 text-center">
                <p className="text-3xl text-amber-400" aria-hidden="true">
                  ★★★★★
                </p>
                <p className="mt-3 text-sm font-medium text-slate-800">
                  Amazing service! Highly recommend.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900">Ready to find your next service?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse trusted businesses, compare services, and book with confidence.
            </p>
            <Link
              to="/businesses"
              className="mt-5 inline-block rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Browse businesses
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-sm md:p-8">
            <h2 className="text-xl font-bold">Run your business in one place</h2>
            <p className="mt-2 text-sm text-brand-100">
              Bookings, waitlists, reviews, and your public page — all in one platform.
            </p>
            <Link
              to="/pricing"
              className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50"
              data-testid="homepage-business-cta"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
