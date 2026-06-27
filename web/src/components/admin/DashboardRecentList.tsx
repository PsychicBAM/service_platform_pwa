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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <Link to={viewAllTo} className="text-xs font-medium text-brand-700 hover:text-brand-800">
          View all
        </Link>
      </div>

      {isLoading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : null}

      {isError ? (
        <p className="mt-3 text-sm text-red-600">{errorMessage ?? "Could not load items."}</p>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      ) : null}

      {!isLoading && !isError && items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-100 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-slate-900">{item.reference}</p>
                <StatusBadge status={item.status} kind={item.statusKind} />
              </div>
              <p className="mt-1 text-slate-800">{item.serviceName}</p>
              <p className="text-slate-600">{item.clientName}</p>
              <p className="mt-1 text-xs text-slate-500">{item.dateLabel}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
