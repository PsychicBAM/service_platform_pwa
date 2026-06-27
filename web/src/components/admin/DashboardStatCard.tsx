import { Link } from "react-router-dom";

type DashboardStatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  to: string;
};

export function DashboardStatCard({ title, value, subtitle, to }: DashboardStatCardProps) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300"
    >
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </Link>
  );
}
