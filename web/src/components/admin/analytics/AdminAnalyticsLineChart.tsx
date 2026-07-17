export type AnalyticsSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
  fill?: boolean;
};

type AdminAnalyticsLineChartProps = {
  labels: string[];
  series: AnalyticsSeries[];
  height?: number;
};

function buildPath(values: number[], width: number, height: number, max: number): string {
  if (values.length === 0) {
    return "";
  }
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (max > 0 ? (value / max) * (height - 8) : 0) - 4;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[], width: number, height: number, max: number): string {
  const line = buildPath(values, width, height, max);
  if (!line) {
    return "";
  }
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

export function AdminAnalyticsLineChart({
  labels,
  series,
  height = 180,
}: AdminAnalyticsLineChartProps) {
  const width = 400;
  const max = Math.max(1, ...series.flatMap((item) => item.values));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label="Analytics line chart"
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}
        {series.map((item) =>
          item.fill ? (
            <path
              key={`${item.id}-fill`}
              d={buildAreaPath(item.values, width, height, max)}
              fill={item.color}
              opacity={0.12}
            />
          ) : null,
        )}
        {series.map((item) => (
          <g key={item.id}>
            <path
              d={buildPath(item.values, width, height, max)}
              fill="none"
              stroke={item.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {item.values.map((value, index) => {
              const step = item.values.length > 1 ? width / (item.values.length - 1) : width;
              const x = index * step;
              const y = height - (max > 0 ? (value / max) * (height - 8) : 0) - 4;
              return (
                <circle key={`${item.id}-${index}`} cx={x} cy={y} r={3} fill={item.color} />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-0.5 text-[10px] text-gray-400">
        <span>{labels[0] ?? ""}</span>
        <span>{labels[Math.floor(labels.length / 2)] ?? ""}</span>
        <span>{labels[labels.length - 1] ?? ""}</span>
      </div>
    </div>
  );
}
