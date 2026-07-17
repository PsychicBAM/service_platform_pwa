export type StatusSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type AdminAnalyticsStatusDonutProps = {
  slices: StatusSlice[];
  totalLabel: string;
};

export function AdminAnalyticsStatusDonut({ slices, totalLabel }: AdminAnalyticsStatusDonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="16" />
          {total > 0
            ? slices.map((slice) => {
                const length = (slice.value / total) * circumference;
                const circle = (
                  <circle
                    key={slice.id}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="16"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += length;
                return circle;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">{totalLabel}</p>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5">
        {slices.map((slice) => {
          const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
          return (
            <li key={slice.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2 text-gray-700">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="shrink-0 font-medium text-gray-900">
                {slice.value}{" "}
                <span className="font-normal text-gray-400">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
