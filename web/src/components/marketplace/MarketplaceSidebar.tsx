import type { MarketplaceCategoryId } from "@/data/marketplaceCategories";
import { MARKETPLACE_CATEGORIES } from "@/data/marketplaceCategories";

type MarketplaceSidebarProps = {
  activeCategory: MarketplaceCategoryId;
  onCategoryChange: (category: MarketplaceCategoryId) => void;
  totalCount?: number;
};

export function MarketplaceSidebar({
  activeCategory,
  onCategoryChange,
  totalCount,
}: MarketplaceSidebarProps) {
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

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Offers</h3>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" disabled className="rounded border-slate-300" />
          Show businesses with offers
          <span className="text-xs text-slate-400">(coming soon)</span>
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Availability</h3>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" disabled className="rounded border-slate-300" />
          Book available today
          <span className="text-xs text-slate-400">(coming soon)</span>
        </label>
      </section>
    </aside>
  );
}
