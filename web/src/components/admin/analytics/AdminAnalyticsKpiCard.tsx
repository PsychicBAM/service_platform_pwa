import type { ReactNode } from "react";

type AdminAnalyticsKpiCardProps = {
  label: string;
  value: string;
  trend?: string | null;
  compareText?: string | null;
  icon: ReactNode;
  iconTone: string;
  testId?: string;
  footer?: ReactNode;
};

export function AdminAnalyticsKpiCard({
  label,
  value,
  trend,
  compareText,
  icon,
  iconTone,
  testId,
  footer,
}: AdminAnalyticsKpiCardProps) {
  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {trend ? <p className="mt-1.5 text-sm font-semibold text-emerald-600">{trend}</p> : null}
          {compareText ? <p className="mt-0.5 text-xs text-gray-400">{compareText}</p> : null}
          {footer}
        </div>
      </div>
    </article>
  );
}
