import { Link } from "react-router-dom";
import type { AdminServiceRead } from "@/types/api";
import { serviceDurationHelper } from "@/components/admin/schedule/scheduleHelpers";
import { serviceTypeIcon } from "@/utils/format";

type AdminScheduleServiceFilterProps = {
  services: AdminServiceRead[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleService: (serviceId: string, checked: boolean) => void;
};

export function AdminScheduleServiceFilter({
  services,
  search,
  onSearchChange,
  selectedIds,
  onToggleAll,
  onToggleService,
}: AdminScheduleServiceFilterProps) {
  const query = search.trim().toLowerCase();
  const visible = services.filter((service) => {
    if (!query) return true;
    return (
      service.name.toLowerCase().includes(query) ||
      (service.description ?? "").toLowerCase().includes(query)
    );
  });
  const allChecked = services.length > 0 && services.every((service) => selectedIds.has(service.id));

  return (
    <aside
      className="flex h-fit flex-col rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-schedule-services-panel"
    >
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Services</h3>
      </div>

      <div className="space-y-3 px-4 py-3">
        <label className="relative block">
          <span className="sr-only">Search services</span>
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search services"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white py-0 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            data-testid="admin-schedule-service-search"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(event) => onToggleAll(event.target.checked)}
            className="rounded border-gray-300"
            data-testid="admin-schedule-service-all"
          />
          All services
        </label>
      </div>

      <ul className="max-h-[28rem] space-y-1 overflow-y-auto px-2 pb-3">
        {visible.length === 0 ? (
          <li className="px-2 py-3 text-sm text-gray-500">No services match.</li>
        ) : (
          visible.map((service) => (
            <li key={service.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(service.id)}
                  onChange={(event) => onToggleService(service.id, event.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="admin-schedule-service-checkbox"
                  data-service-id={service.id}
                />
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm"
                  aria-hidden="true"
                >
                  {serviceTypeIcon(service.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {service.name}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {serviceDurationHelper(service)}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>

      <div className="border-t border-gray-100 p-3">
        <Link
          to="/admin/services"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <span aria-hidden="true">⚙</span>
          Manage services
        </Link>
      </div>
    </aside>
  );
}
