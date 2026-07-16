import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type GuestTrackActivityCardProps = {
  kind: "booking" | "order";
  reference?: string;
};

export function GuestTrackActivityCard({ kind, reference }: GuestTrackActivityCardProps) {
  const { isAuthenticated } = useAuth();
  const isBooking = kind === "booking";
  const claimPath = isBooking ? "/me/claim?type=booking" : "/me/claim?type=order";
  const listPath = isBooking ? "/me/bookings" : "/me/orders";
  const listLabel = isBooking ? "View my bookings" : "View my requests";
  const claimLabel = isBooking ? "Claim booking" : "Claim request";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="guest-track-activity-card"
    >
      <h2 className="text-base font-semibold text-slate-900">
        {isBooking ? "Want to track this booking?" : "Want to track replies and status updates?"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {isBooking
          ? "A guest booking is not an account by itself. To manage it in My bookings, log in and claim it with your booking reference and the same email or phone you used."
          : "A guest request is not an account by itself. To see messages and status in My requests, log in and claim it with your request reference and the same email or phone you used."}
      </p>
      {reference ? (
        <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-800">
          Reference: {reference}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isAuthenticated ? (
          <>
            <Link
              to={listPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              data-testid="guest-track-view-list"
            >
              {listLabel}
            </Link>
            <Link
              to={claimPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              data-testid="guest-track-claim"
            >
              {claimLabel}
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              data-testid="guest-track-login"
            >
              Log in
            </Link>
            <Link
              to={claimPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              data-testid="guest-track-claim"
            >
              {claimLabel}
            </Link>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Save your reference. Public registration creates a business account — customers track
        bookings and requests by logging in and claiming them.
      </p>
    </div>
  );
}
