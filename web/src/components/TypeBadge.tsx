import type { ServiceType } from "@/types/api";

type TypeBadgeProps = {
  type: ServiceType;
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const isBooking = type === "booking";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isBooking
          ? "bg-sky-100 text-sky-800"
          : "bg-violet-100 text-violet-800"
      }`}
    >
      <span aria-hidden>{isBooking ? "📅" : "📝"}</span>
      {isBooking ? "Booking" : "Request"}
    </span>
  );
}
