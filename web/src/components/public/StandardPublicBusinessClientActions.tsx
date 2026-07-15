import { Link } from "react-router-dom";
import type { OperatingMode } from "@/types/api";

type StandardPublicBusinessClientActionsProps = {
  operatingMode: OperatingMode;
};

const CLIENT_ACTION_BUTTON_CLASS =
  "inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:min-w-[8.5rem] sm:flex-none sm:px-4";

export function StandardPublicBusinessClientActions({
  operatingMode,
}: StandardPublicBusinessClientActionsProps) {
  const showBookings = operatingMode !== "orders_only";
  const showRequests = operatingMode !== "booking_only";

  if (!showBookings && !showRequests) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm md:p-4"
      data-testid="standard-public-business-client-actions"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-medium text-slate-600 sm:text-sm sm:text-slate-700">
          Already booked with this business?
        </p>
        <div className="flex flex-row gap-2 sm:justify-end">
          {showBookings ? (
            <Link
              to="/me/bookings"
              className={CLIENT_ACTION_BUTTON_CLASS}
              data-testid="standard-public-business-my-bookings"
            >
              My bookings
            </Link>
          ) : null}
          {showRequests ? (
            <Link
              to="/me/orders"
              className={CLIENT_ACTION_BUTTON_CLASS}
              data-testid="standard-public-business-my-requests"
            >
              My requests
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
