import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { PublicBusinessDirectorySort } from "@/types/api";
import { getApiErrorMessage } from "@/utils/errors";

const PAGE_SIZE = 12;

export function BusinessDirectoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId>("all");
  const [ratingMin, setRatingMin] = useState("");
  const [sort, setSort] = useState<MarketplaceSort>("popular");
  const [page, setPage] = useState(1);

  const directoryQuery = useQuery({
    queryKey: ["public-business-directory", query, category, ratingMin, sort, page],
    queryFn: () =>
      listPublicBusinesses({
        q: query || undefined,
        category: category === "all" ? undefined : category,
        rating_min: ratingMin ? Number(ratingMin) : undefined,
        sort: sort as PublicBusinessDirectorySort,
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

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setQuery(searchInput.trim());
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
    setSort(value);
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

        <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
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

          <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-slate-600">
            Location
            <select
              disabled
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              aria-label="Location filter coming soon"
            >
              <option>All locations</option>
            </select>
          </label>

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
