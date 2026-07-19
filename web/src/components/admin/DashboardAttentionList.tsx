import { Link } from "react-router-dom";

export type DashboardAttentionItem = {
  id: string;
  label: string;
  to: string;
};

type DashboardAttentionListProps = {
  items: DashboardAttentionItem[];
};

export function DashboardAttentionList({ items }: DashboardAttentionListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Inbox / activities</h3>
        <p className="mt-2 text-sm text-gray-500">Nothing urgent right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Inbox / activities</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-3"
          >
            <p className="min-w-0 flex-1 text-sm font-medium text-amber-950">{item.label}</p>
            <Link
              to={item.to}
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-900 outline-none hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            >
              View
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
