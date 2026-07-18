import {
  REVIEW_RATING_OPTIONS,
  REVIEW_SOURCE_OPTIONS,
  REVIEW_STATUS_SELECT_OPTIONS,
  type ReviewRatingFilter,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
} from "@/components/admin/reviews/reviewHelpers";

type AdminReviewFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  ratingFilter: ReviewRatingFilter;
  onRatingChange: (value: ReviewRatingFilter) => void;
  serviceFilter: string;
  onServiceChange: (value: string) => void;
  services: string[];
  sourceFilter: ReviewSourceFilter;
  onSourceChange: (value: ReviewSourceFilter) => void;
  statusFilter: ReviewStatusFilter;
  onStatusChange: (value: ReviewStatusFilter) => void;
  onClear: () => void;
};

const controlSelect =
  "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm font-medium text-gray-700 shadow-sm";

export function AdminReviewFilters({
  search,
  onSearchChange,
  ratingFilter,
  onRatingChange,
  serviceFilter,
  onServiceChange,
  services,
  sourceFilter,
  onSourceChange,
  statusFilter,
  onStatusChange,
  onClear,
}: AdminReviewFiltersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search reviews</span>
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M10 2a8 8 0 1 1-5.3 14l-3.4 3.4-1.4-1.4 3.4-3.4A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by customer, service, or review content..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white py-0 pl-9 pr-3 text-sm text-gray-800 shadow-sm placeholder:text-gray-400"
            data-testid="admin-reviews-search"
          />
        </label>

        <label className="relative inline-flex w-full shrink-0 xl:w-[140px]">
          <span className="sr-only">Rating filter</span>
          <select
            value={ratingFilter}
            onChange={(event) => onRatingChange(event.target.value as ReviewRatingFilter)}
            className={controlSelect}
            data-testid="admin-reviews-rating-filter"
          >
            {REVIEW_RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Chevron />
        </label>

        <label className="relative inline-flex w-full shrink-0 xl:w-[160px]">
          <span className="sr-only">Service filter</span>
          <select
            value={serviceFilter}
            onChange={(event) => onServiceChange(event.target.value)}
            className={controlSelect}
            data-testid="admin-reviews-service-filter"
          >
            <option value="all">All Services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <Chevron />
        </label>

        <label className="relative inline-flex w-full shrink-0 xl:w-[140px]">
          <span className="sr-only">Source filter</span>
          <select
            value={sourceFilter}
            onChange={(event) => onSourceChange(event.target.value as ReviewSourceFilter)}
            className={controlSelect}
            data-testid="admin-reviews-source-filter"
          >
            {REVIEW_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Chevron />
        </label>

        <label className="relative inline-flex w-full shrink-0 xl:w-[150px]">
          <span className="sr-only">Status filter</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as ReviewStatusFilter)}
            className={controlSelect}
            data-testid="admin-reviews-status-filter"
          >
            {REVIEW_STATUS_SELECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Chevron />
        </label>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 shrink-0 items-center justify-center px-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          data-testid="admin-reviews-clear-filters"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <span
      className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
      aria-hidden="true"
    >
      ▾
    </span>
  );
}
