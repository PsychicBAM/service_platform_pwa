import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type DashboardStatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  to: string;
  icon?: ReactNode;
  iconTone?: string;
};

export function DashboardStatCard({
  title,
  value,
  subtitle,
  to,
  icon,
  iconTone = "bg-sky-100 text-sky-700",
}: DashboardStatCardProps) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm outline-none transition hover:border-emerald-300 hover:bg-emerald-50/20 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
    </Link>
  );
}
