import {
  CLIENT_SOURCE_OPTIONS,
  CLIENT_STATUS_SELECT_OPTIONS,
  type ClientSourceFilter,
  type ClientStatusFilter,
} from "@/components/admin/clients/clientHelpers";

type AdminClientFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sourceFilter: ClientSourceFilter;
  onSourceChange: (value: ClientSourceFilter) => void;
  statusFilter: ClientStatusFilter;
  onStatusChange: (value: ClientStatusFilter) => void;
  onClear: () => void;
};

const controlSelect =
  "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm font-medium text-gray-700 shadow-sm";

export function AdminClientFilters({
  search,
  onSearchChange,
  sourceFilter,
  onSourceChange,
  statusFilter,
  onStatusChange,
  onClear,
}: AdminClientFiltersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1" data-testid="admin-clients-search">
          <label htmlFor="clientSearch" className="sr-only">
            Search clients
          </label>
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M10 2a8 8 0 1 1-5.3 14l-3.4 3.4-1.4-1.4 3.4-3.4A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
            </svg>
          </span>
          <input
            id="clientSearch"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email or phone..."
            aria-label="Search clients"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white py-0 pl-9 pr-3 text-sm text-gray-800 shadow-sm placeholder:text-gray-400"
          />
        </div>

        <label className="relative inline-flex w-full shrink-0 xl:w-[150px]">
          <span className="sr-only">Source filter</span>
          <select
            value={sourceFilter}
            onChange={(event) => onSourceChange(event.target.value as ClientSourceFilter)}
            className={controlSelect}
            data-testid="admin-clients-source-filter"
          >
            {CLIENT_SOURCE_OPTIONS.map((option) => (
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
            onChange={(event) => onStatusChange(event.target.value as ClientStatusFilter)}
            className={controlSelect}
            data-testid="admin-clients-status-filter"
          >
            {CLIENT_STATUS_SELECT_OPTIONS.map((option) => (
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
          data-testid="admin-clients-clear-filters"
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
