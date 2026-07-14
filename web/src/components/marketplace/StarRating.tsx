type StarRatingProps = {
  rating: number | null | undefined;
  reviewCount?: number;
  size?: "sm" | "md";
};

function clampRating(rating: number): number {
  return Math.min(5, Math.max(0, rating));
}

export function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  const value = rating != null ? clampRating(rating) : null;
  const starClass = size === "md" ? "text-base" : "text-sm";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const filled = value != null && value >= index + 1;
          const half = value != null && !filled && value >= index + 0.5;
          return (
            <span
              key={index}
              className={`${starClass} ${filled || half ? "text-amber-400" : "text-slate-300"}`}
            >
              ★
            </span>
          );
        })}
      </div>
      {value != null ? (
        <span className={`font-semibold text-slate-800 ${size === "md" ? "text-sm" : "text-xs"}`}>
          {value.toFixed(1)}
        </span>
      ) : (
        <span className="text-xs text-slate-500">No ratings yet</span>
      )}
      {reviewCount != null && reviewCount > 0 ? (
        <span className="text-xs text-slate-500">({reviewCount})</span>
      ) : null}
    </div>
  );
}
