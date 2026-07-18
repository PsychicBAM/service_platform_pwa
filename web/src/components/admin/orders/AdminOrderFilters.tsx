import {
  DATE_RANGE_OPTIONS,
  ORDER_STATUS_SELECT_OPTIONS,
  formatDateRangeLabel,
  type DateRange,
  type DateRangeOption,
  type OrderStatusFilter,
} from "@/components/admin/orders/orderHelpers";

type ServiceOption = { id: string; name: string };

type AdminOrderFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: OrderStatusFilter;
  onStatusChange: (value: OrderStatusFilter) => void;
  serviceFilter: string;
  onServiceChange: (value: string) => void;
  services: ServiceOption[];
  dateRangeOption: DateRangeOption;
  onDateRangeChange: (value: DateRangeOption) => void;
  dateRange: DateRange | null;
  onClear: () => void;
};

const controlSelect =
  "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm font-medium text-gray-700 shadow-sm";

export function AdminOrderFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  serviceFilter,
  onServiceChange,
  services,
  dateRangeOption,
  onDateRangeChange,
  dateRange,
  onClear,
}: AdminOrderFiltersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search requests</span>
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
            placeholder="Search by customer, service, or reference..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white py-0 pl-9 pr-3 text-sm text-gray-800 shadow-sm placeholder:text-gray-400"
            data-testid="admin-orders-search"
          />
        </label>

        <label className="relative inline-flex w-full shrink-0 lg:w-[160px]">
          <span className="sr-only">Status filter</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as OrderStatusFilter)}
            className={controlSelect}
            data-testid="admin-orders-status-filter"
          >
            {ORDER_STATUS_SELECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
            aria-hidden="true"
          >
            ▾
          </span>
        </label>

        <label className="relative inline-flex w-full shrink-0 lg:w-[170px]">
          <span className="sr-only">Service filter</span>
          <select
            value={serviceFilter}
            onChange={(event) => onServiceChange(event.target.value)}
            className={controlSelect}
            data-testid="admin-orders-service-filter"
          >
            <option value="all">All Services</option>
            {services.map((service) => (
              <option key={service.id} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
            aria-hidden="true"
          >
            ▾
          </span>
        </label>

        <label className="relative inline-flex w-full shrink-0 lg:w-[200px]">
          <span className="sr-only">Date range filter</span>
          <span
            className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2"
            aria-hidden="true"
          >
            📅
          </span>
          <select
            value={dateRangeOption}
            onChange={(event) => onDateRangeChange(event.target.value as DateRangeOption)}
            className={`${controlSelect} pl-9`}
            data-testid="admin-orders-date-range"
            title={dateRange ? formatDateRangeLabel(dateRange) : "All time"}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
            aria-hidden="true"
          >
            ▾
          </span>
        </label>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 shrink-0 items-center justify-center px-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700 lg:px-2"
          data-testid="admin-orders-clear-filters"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
