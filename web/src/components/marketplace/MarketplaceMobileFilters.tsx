import { useEffect, useId, useState } from "react";
import type { MarketplaceCategoryId } from "@/data/marketplaceCategories";
import { MARKETPLACE_CATEGORIES } from "@/data/marketplaceCategories";
import {
  hasActiveMarketplaceSidebarFilters,
  type MarketplaceSidebarFilterKey,
  type MarketplaceSidebarFilters,
} from "@/lib/marketplaceFilters";

const SIDEBAR_FILTER_OPTIONS: Array<{
  key: MarketplaceSidebarFilterKey;
  label: string;
}> = [
  { key: "bookable", label: "Bookable online" },
  { key: "requests", label: "Accepts requests" },
  { key: "reviews", label: "Has reviews" },
  { key: "cover", label: "Has cover photo" },
];

type MarketplaceMobileFiltersProps = {
  activeCategory: MarketplaceCategoryId;
  onCategoryChange: (category: MarketplaceCategoryId) => void;
  filters: MarketplaceSidebarFilters;
  onFilterChange: (key: MarketplaceSidebarFilterKey, enabled: boolean) => void;
  onClearFilters: () => void;
  totalCount?: number;
};

export function countMarketplaceMobileFilterBadge(
  category: MarketplaceCategoryId,
  filters: MarketplaceSidebarFilters,
): number {
  let count = category !== "all" ? 1 : 0;
  if (filters.bookable) count += 1;
  if (filters.requests) count += 1;
  if (filters.reviews) count += 1;
  if (filters.cover) count += 1;
  return count;
}

export function MarketplaceMobileFilters({
  activeCategory,
  onCategoryChange,
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
}: MarketplaceMobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasActiveFilters = hasActiveMarketplaceSidebarFilters(filters);
  const badgeCount = countMarketplaceMobileFilterBadge(activeCategory, filters);
  const buttonLabel = badgeCount > 0 ? `Filters (${badgeCount})` : "Filters";

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden" data-testid="marketplace-mobile-filters">
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="marketplace-mobile-filters-button"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
        {buttonLabel}
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-3 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          data-testid="marketplace-mobile-filters-panel"
        >
          <section>
            <h2 className="text-sm font-semibold text-slate-900">Categories</h2>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
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
                      data-testid={`marketplace-mobile-category-${category.id}`}
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

          <section data-testid="marketplace-mobile-sidebar-filters">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                  data-testid="marketplace-mobile-clear-filters"
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
                    data-testid={`marketplace-mobile-filter-${option.key}`}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <button
            type="button"
            className="w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            data-testid="marketplace-mobile-filters-done"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
