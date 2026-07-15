import type { MarketplaceSidebarFilterKey, MarketplaceSidebarFilters } from "@/lib/marketplaceFilters";
import type { MarketplaceCategoryId } from "@/data/marketplaceCategories";
import { MARKETPLACE_CATEGORIES } from "@/data/marketplaceCategories";

const SIDEBAR_FILTER_OPTIONS: Array<{
  key: MarketplaceSidebarFilterKey;
  label: string;
}> = [
  { key: "bookable", label: "Bookable online" },
  { key: "requests", label: "Accepts requests" },
  { key: "reviews", label: "Has reviews" },
  { key: "cover", label: "Has cover photo" },
];

type MarketplaceSidebarProps = {
  activeCategory: MarketplaceCategoryId;
  onCategoryChange: (category: MarketplaceCategoryId) => void;
  filters: MarketplaceSidebarFilters;
  onFilterChange: (key: MarketplaceSidebarFilterKey, enabled: boolean) => void;
  onClearFilters: () => void;
  totalCount?: number;
};

export function MarketplaceSidebar({
  activeCategory,
  onCategoryChange,
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
}: MarketplaceSidebarProps) {
  const hasActiveFilters =
    filters.bookable || filters.requests || filters.reviews || filters.cover;

  return (
    <aside className="space-y-6" data-testid="marketplace-sidebar">
      <section>
        <h2 className="text-sm font-semibold text-slate-900">Categories</h2>
        <ul className="mt-3 space-y-1">
          {MARKETPLACE_CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            const countLabel =
              category.id === "all" && totalCount != null ? String(totalCount) : null;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-brand-50 font-medium text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-xs text-slate-400">
                      {category.icon}
                    </span>
                    {category.label}
                  </span>
                  {countLabel ? (
                    <span className="text-xs text-slate-400">{countLabel}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="marketplace-sidebar-filters"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
              data-testid="marketplace-sidebar-clear-filters"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="mt-3 space-y-2">
          {SIDEBAR_FILTER_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={filters[option.key]}
                onChange={(event) => onFilterChange(option.key, event.target.checked)}
                className="rounded border-slate-300 text-brand-700 focus:ring-brand-700"
                data-testid={`marketplace-filter-${option.key}`}
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>
    </aside>
  );
}
