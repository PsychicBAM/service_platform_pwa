import { Link } from "react-router-dom";

export type RecentReviewRow = {
  id: string;
  name: string;
  rating: number;
  dateLabel: string;
  comment: string;
};

type AdminAnalyticsRecentReviewsProps = {
  rows: RecentReviewRow[];
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(rating) ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-blue-300 text-xs font-semibold text-blue-900"
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

export function AdminAnalyticsRecentReviews({ rows }: AdminAnalyticsRecentReviewsProps) {
  return (
    <section
      className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="admin-analytics-recent-reviews"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">Recent Reviews</h3>
        <Link
          to="/admin/reviews"
          className="text-sm font-medium text-blue-600 hover:underline"
          data-testid="admin-analytics-view-reviews"
        >
          View all reviews
        </Link>
      </div>
      <ul className="mt-4 flex-1 space-y-4">
        {rows.length === 0 ? (
          <li className="py-6 text-center text-sm text-gray-500">No reviews yet.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="flex gap-3">
              <Avatar name={row.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-400">{row.dateLabel}</p>
                </div>
                <div className="mt-0.5">
                  <Stars rating={row.rating} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-600">
                  {row.comment || "No comment provided."}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
