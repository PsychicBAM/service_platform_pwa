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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">Needs attention</h3>
        <p className="mt-2 text-sm text-slate-500">Nothing urgent right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-amber-900">Needs attention</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              className="block rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950 hover:border-amber-300"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
