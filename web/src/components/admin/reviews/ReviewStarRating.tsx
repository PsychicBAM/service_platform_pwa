export function ReviewStarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  const textSize = size === "md" ? "text-base" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize}`}
      aria-label={`${rating} of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={index < clamped ? "text-amber-400" : "text-gray-300"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}
