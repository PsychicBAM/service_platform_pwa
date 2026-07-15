import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { listPublicBusinesses } from "@/api/publicApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MarketplaceBusinessCard } from "@/components/marketplace/MarketplaceBusinessCard";
import { MarketplaceSidebar } from "@/components/marketplace/MarketplaceSidebar";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_RATING_OPTIONS,
  MARKETPLACE_SORT_OPTIONS,
  type MarketplaceCategoryId,
  type MarketplaceSort,
} from "@/data/marketplaceCategories";
import {
  clearMarketplaceSidebarFilterParams,
  parseMarketplaceSidebarFilters,
  setMarketplaceSidebarFilterParam,
  type MarketplaceSidebarFilterKey,
} from "@/lib/marketplaceFilters";
import { parseMarketplaceSort, setMarketplaceSortParam } from "@/lib/marketplaceSort";
import { getApiErrorMessage } from "@/utils/errors";

const PAGE_SIZE = 12;

export function BusinessDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [locationInput, setLocationInput] = useState(searchParams.get("location") ?? "");
  const query = searchParams.get("q") ?? "";
  const locationQuery = searchParams.get("location") ?? "";
  const sidebarFilters = parseMarketplaceSidebarFilters(searchParams);
  const sort = parseMarketplaceSort(searchParams.get("sort"));
  const [category, setCategory] = useState<MarketplaceCategoryId>("all");
  const [ratingMin, setRatingMin] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
    setLocationInput(searchParams.get("location") ?? "");
  }, [searchParams]);

  const directoryQuery = useQuery({
    queryKey: [
      "public-business-directory",
      query,
      locationQuery,
      category,
      ratingMin,
      sort,
      page,
      sidebarFilters.bookable,
      sidebarFilters.requests,
      sidebarFilters.reviews,
      sidebarFilters.cover,
    ],
    queryFn: () =>
      listPublicBusinesses({
        q: query || undefined,
        location: locationQuery || undefined,
        category: category === "all" ? undefined : category,
        rating_min: ratingMin ? Number(ratingMin) : undefined,
        bookable: sidebarFilters.bookable || undefined,
        requests: sidebarFilters.requests || undefined,
        reviews: sidebarFilters.reviews || undefined,
        cover: sidebarFilters.cover || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const total = directoryQuery.data?.meta.total ?? 0;
  const businesses = directoryQuery.data?.data ?? [];

  const resultLabel = useMemo(() => {
    if (total === 0) {
      return "Showing 0 of 0";
    }
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}–${end} of ${total}`;
  }, [page, total]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function updateSearchParams(next: { q?: string; location?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) {
      const trimmed = next.q.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
    }
    if (next.location !== undefined) {
      const trimmed = next.location.trim();
      if (trimmed) {
        params.set("location", trimmed);
      } else {
        params.delete("location");
      }
    }
    setSearchParams(params, { replace: true });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateSearchParams({ q: searchInput, location: locationInput });
    setPage(1);
  }

  function handleLocationClear() {
    setLocationInput("");
    updateSearchParams({ location: "" });
    setPage(1);
  }

  function handleCategoryChange(nextCategory: MarketplaceCategoryId) {
    setCategory(nextCategory);
    setPage(1);
  }

  function handleRatingChange(value: string) {
    setRatingMin(value);
    setPage(1);
  }

  function handleSortChange(value: MarketplaceSort) {
    const params = new URLSearchParams(searchParams);
    setMarketplaceSortParam(params, value);
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  function handleSidebarFilterChange(key: MarketplaceSidebarFilterKey, enabled: boolean) {
    const params = new URLSearchParams(searchParams);
    setMarketplaceSidebarFilterParam(params, key, enabled);
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  function handleClearSidebarFilters() {
    const params = new URLSearchParams(searchParams);
    clearMarketplaceSidebarFilterParams(params);
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <section className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Find trusted services near you
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Explore top-rated businesses and book with confidence.
        </p>

        <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3 lg:flex-row">
          <label className="sr-only" htmlFor="marketplace-search">
            Search services
          </label>
          <input
            id="marketplace-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="What service are you looking for?"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-brand-700/20 placeholder:text-slate-400 focus:border-brand-700 focus:ring-2"
            data-testid="marketplace-search-input"
          />
          <label className="sr-only" htmlFor="marketplace-location">
            Location
          </label>
          <input
            id="marketplace-location"
            type="search"
            value={locationInput}
            onChange={(event) => setLocationInput(event.target.value)}
            placeholder="City, district, or area"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-brand-700/20 placeholder:text-slate-400 focus:border-brand-700 focus:ring-2"
            data-testid="marketplace-location-input"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
            data-testid="marketplace-search-button"
          >
            Search
          </button>
        </form>

        <div
          className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
          data-testid="marketplace-filter-row"
        >
          <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-slate-600">
            Category
            <select
              value={category}
              onChange={(event) => handleCategoryChange(event.target.value as MarketplaceCategoryId)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              data-testid="marketplace-category-filter"
            >
              {MARKETPLACE_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {locationQuery ? (
            <div className="flex items-end gap-2">
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                Location: <span data-testid="marketplace-active-location">{locationQuery}</span>
              </p>
              <button
                type="button"
                onClick={handleLocationClear}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                data-testid="marketplace-location-clear"
              >
                Clear
              </button>
            </div>
          ) : null}

          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
            Rating
            <select
              value={ratingMin}
              onChange={(event) => handleRatingChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              data-testid="marketplace-rating-filter"
            >
              {MARKETPLACE_RATING_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
            Sort by
            <select
              value={sort}
              onChange={(event) => handleSortChange(event.target.value as MarketplaceSort)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              data-testid="marketplace-sort-filter"
            >
              {MARKETPLACE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <MarketplaceSidebar
            activeCategory={category}
            onCategoryChange={handleCategoryChange}
            filters={sidebarFilters}
            onFilterChange={handleSidebarFilterChange}
            onClearFilters={handleClearSidebarFilters}
            totalCount={total}
          />
        </div>

        <div>
          {directoryQuery.isLoading ? <LoadingState message="Loading businesses…" /> : null}
          {directoryQuery.isError ? (
            <ErrorState
              title="Could not load marketplace"
              message={getApiErrorMessage(directoryQuery.error, "Please try again.")}
            />
          ) : null}

          {!directoryQuery.isLoading && !directoryQuery.isError && businesses.length === 0 ? (
            <div data-testid="marketplace-empty-state">
              <EmptyState
                title="No businesses found"
                description="Try adjusting your search or filters to discover more services."
              />
            </div>
          ) : null}

          {!directoryQuery.isLoading && !directoryQuery.isError && businesses.length > 0 ? (
            <>
              <div
                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                data-testid="marketplace-business-grid"
              >
                {businesses.map((business) => (
                  <MarketplaceBusinessCard key={business.slug} business={business} />
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <p className="text-sm text-slate-500" data-testid="marketplace-result-count">
                  {resultLabel}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
