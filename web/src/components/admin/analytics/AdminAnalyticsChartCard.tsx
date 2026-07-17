import type { ReactNode } from "react";
import {
  CHART_GRANULARITY_OPTIONS,
  type ChartGranularity,
} from "@/components/admin/analytics/adminAnalyticsHelpers";

type AdminAnalyticsChartCardProps = {
  title: string;
  legend: ReactNode;
  children: ReactNode;
  testId?: string;
  periodTestId?: string;
  granularity: ChartGranularity;
  onGranularityChange: (value: ChartGranularity) => void;
};

export function AdminAnalyticsChartCard({
  title,
  legend,
  children,
  testId,
  periodTestId,
  granularity,
  onGranularityChange,
}: AdminAnalyticsChartCardProps) {
  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid={testId}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {legend}
          </div>
        </div>
        <label className="relative inline-flex shrink-0">
          <span className="sr-only">{title} period</span>
          <select
            value={granularity}
            onChange={(event) => onGranularityChange(event.target.value as ChartGranularity)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-600"
            data-testid={periodTestId}
          >
            {CHART_GRANULARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400"
            aria-hidden="true"
          >
            ▾
          </span>
        </label>
      </div>
      {children}
    </section>
  );
}
