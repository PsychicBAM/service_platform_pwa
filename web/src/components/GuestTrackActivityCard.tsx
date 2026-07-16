import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type GuestTrackActivityCardProps = {
  kind: "booking" | "order";
  reference?: string;
  businessSlug?: string;
};

export function GuestTrackActivityCard({
  kind,
  reference,
  businessSlug,
}: GuestTrackActivityCardProps) {
  const { isAuthenticated } = useAuth();
  const isBooking = kind === "booking";
  const claimType = isBooking ? "booking" : "request";
  const claimParams = new URLSearchParams({ type: claimType });
  if (reference) {
    claimParams.set("reference", reference);
  }
  if (businessSlug) {
    claimParams.set("business", businessSlug);
  }
  const claimPath = `/me/claim?${claimParams.toString()}`;

  const registerParams = new URLSearchParams({ type: claimType });
  if (reference) {
    registerParams.set("reference", reference);
  }
  if (businessSlug) {
    registerParams.set("business", businessSlug);
  }
  const clientRegisterPath = `/client/register?${registerParams.toString()}`;

  const listPath = isBooking ? "/me/bookings" : "/me/orders";
  const listLabel = isBooking ? "View my bookings" : "View my requests";
  const claimLabel = "Claim manually";

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
          ? "Create a client account to save this booking to your account automatically."
          : "Create a client account to save this request to your account automatically."}
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
              to={clientRegisterPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              data-testid="guest-track-create-account"
            >
              Create client account
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
        Keep this reference in case you need to claim manually. Customer signup is separate from
        business registration.
      </p>
    </div>
  );
}
