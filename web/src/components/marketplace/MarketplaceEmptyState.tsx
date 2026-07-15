import { Link } from "react-router-dom";

export type MarketplaceActiveFilterChip = {
  key: string;
  label: string;
};

type MarketplaceEmptyStateProps = {
  variant: "no-results" | "initial";
  activeFilters?: MarketplaceActiveFilterChip[];
  onClearFilters?: () => void;
};

export function MarketplaceEmptyState({
  variant,
  activeFilters = [],
  onClearFilters,
}: MarketplaceEmptyStateProps) {
  if (variant === "initial") {
    return (
      <div
        className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
        data-testid="marketplace-empty-state"
      >
        <h2 className="text-lg font-semibold text-slate-900">No businesses listed yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Public businesses will appear here once they are published.
        </p>
        <Link
          to="/pricing"
          className="mt-6 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          data-testid="marketplace-start-business-link"
        >
          Start your business
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
      data-testid="marketplace-empty-state"
    >
      <h2 className="text-lg font-semibold text-slate-900">No businesses found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Try changing your search, location, category, rating, or filters.
      </p>

      {activeFilters.length > 0 ? (
        <div
          className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2"
          data-testid="marketplace-active-filter-chips"
        >
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
            >
              {filter.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          data-testid="marketplace-clear-filters"
        >
          Clear filters
        </button>
        <Link
          to="/businesses"
          onClick={(event) => {
            event.preventDefault();
            onClearFilters?.();
          }}
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          data-testid="marketplace-browse-all-link"
        >
          Browse all businesses
        </Link>
      </div>
    </div>
  );
}
