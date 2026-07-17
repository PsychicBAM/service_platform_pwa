import { Link } from "react-router-dom";

export type TopServiceRow = {
  id: string;
  name: string;
  bookings: number;
  revenueLabel: string;
  trend: string;
  trendUp: boolean;
};

type AdminAnalyticsTopServicesProps = {
  rows: TopServiceRow[];
};

export function AdminAnalyticsTopServices({ rows }: AdminAnalyticsTopServicesProps) {
  return (
    <section
      className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="admin-analytics-top-services"
    >
      <h3 className="text-base font-semibold text-gray-900">Top Services</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[16rem] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium">Bookings</th>
              <th className="pb-2 font-medium">Revenue (Paid)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-sm text-gray-500">
                  No service activity in this period yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-2 font-medium text-gray-900">{row.name}</td>
                  <td className="py-3 pr-2 text-gray-600">{row.bookings}</td>
                  <td className="py-3">
                    <span className="text-gray-900">{row.revenueLabel}</span>
                    <span
                      className={`ml-2 text-xs font-semibold ${
                        row.trendUp ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {row.trendUp ? "↑" : "↓"} {row.trend}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Link
        to="/admin/services"
        className="mt-auto pt-4 text-sm font-medium text-blue-600 hover:underline"
        data-testid="admin-analytics-view-services"
      >
        View all services
      </Link>
    </section>
  );
}
