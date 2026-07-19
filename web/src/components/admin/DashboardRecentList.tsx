import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";

export type DashboardRecentItem = {
  id: string;
  reference: string;
  status: string;
  statusKind: "booking" | "order";
  serviceName: string;
  clientName: string;
  dateLabel: string;
  /** ISO datetime for compact month/day display when available. */
  dateIso?: string;
};

type DashboardRecentListProps = {
  title: string;
  emptyMessage: string;
  viewAllTo: string;
  items: DashboardRecentItem[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
};

function compactDateParts(iso?: string, fallbackLabel?: string): { month: string; day: string } {
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return {
        month: date.toLocaleDateString(undefined, { month: "short" }),
        day: String(date.getDate()),
      };
    }
  }
  const parts = (fallbackLabel ?? "").split(/[,\s]+/).filter(Boolean);
  return {
    month: parts[0]?.slice(0, 3) || "—",
    day: parts.find((part) => /^\d+$/.test(part)) || "—",
  };
}

function compactTimeLabel(iso?: string, fallbackLabel?: string): string {
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }
  return fallbackLabel ?? "";
}

export function DashboardRecentList({
  title,
  emptyMessage,
  viewAllTo,
  items,
  isLoading,
  isError,
  errorMessage,
}: DashboardRecentListProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Link
          to={viewAllTo}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          View all
        </Link>
      </div>

      {isLoading ? <p className="mt-3 text-sm text-gray-500">Loading…</p> : null}

      {isError ? (
        <p className="mt-3 text-sm text-red-600">{errorMessage ?? "Could not load items."}</p>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{emptyMessage}</p>
      ) : null}

      {!isLoading && !isError && items.length > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((item) => {
            const { month, day } = compactDateParts(item.dateIso, item.dateLabel);
            const timeLabel = compactTimeLabel(item.dateIso, item.dateLabel);
            return (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 text-center ring-1 ring-gray-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {month}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {item.serviceName}
                      </p>
                      <p className="truncate text-sm text-gray-500">{item.clientName}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {timeLabel}
                        {item.reference ? ` · ${item.reference}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={item.status} kind={item.statusKind} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
