import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export type GuestTrackMode = "guest" | "saved" | "email_mismatch";

type GuestTrackActivityCardProps = {
  kind: "booking" | "order";
  reference?: string;
  businessSlug?: string;
  mode?: GuestTrackMode;
};

const primaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 sm:w-auto";
const secondaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto";

function ReferenceLine({ reference }: { reference: string }) {
  return (
    <p className="mt-2 break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-sm font-semibold text-slate-800">
      <span>Reference:</span> <span>{reference}</span>
    </p>
  );
}

export function GuestTrackActivityCard({
  kind,
  reference,
  businessSlug,
  mode = "guest",
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

  if (mode === "saved") {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5"
        data-testid="guest-track-activity-card"
        data-mode="saved"
      >
        <h2 className="text-base font-semibold text-emerald-950">Saved to your account</h2>
        <p className="mt-2 text-sm text-emerald-900">
          {isBooking
            ? "This booking is available in My bookings."
            : "This request is available in My requests."}
        </p>
        {reference ? <ReferenceLine reference={reference} /> : null}
        <div className="mt-4">
          <Link to={listPath} className={primaryBtn} data-testid="guest-track-view-list">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "email_mismatch") {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5"
        data-testid="guest-track-activity-card"
        data-mode="email_mismatch"
      >
        <h2 className="text-base font-semibold text-amber-950">Submitted as guest activity</h2>
        <p className="mt-2 text-sm text-amber-950">
          {isBooking
            ? "This booking was not saved to your account because the email does not match your signed-in account."
            : "This request was not saved to your account because the email does not match your signed-in account."}
        </p>
        {reference ? <ReferenceLine reference={reference} /> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link to={claimPath} className={primaryBtn} data-testid="guest-track-claim">
            {claimLabel}
          </Link>
          <Link to={listPath} className={secondaryBtn} data-testid="guest-track-view-list">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="guest-track-activity-card"
      data-mode="guest"
    >
      <h2 className="text-base font-semibold text-slate-900">
        {isBooking ? "Track this booking" : "Track this request"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {isBooking
          ? "Create a client account with the same email to save this booking automatically, or claim it later using this reference."
          : "Create a client account with the same email to save this request automatically, or claim it later using this reference."}
      </p>
      {reference ? (
        <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-800">
          <span>Reference:</span> <span>{reference}</span>
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isAuthenticated ? (
          <>
            <Link to={listPath} className={primaryBtn} data-testid="guest-track-view-list">
              {listLabel}
            </Link>
            <Link to={claimPath} className={secondaryBtn} data-testid="guest-track-claim">
              {claimLabel}
            </Link>
          </>
        ) : (
          <>
            <Link
              to={clientRegisterPath}
              className={primaryBtn}
              data-testid="guest-track-create-account"
            >
              Create client account
            </Link>
            <Link to="/login" className={secondaryBtn} data-testid="guest-track-login">
              Log in
            </Link>
            <Link to={claimPath} className={secondaryBtn} data-testid="guest-track-claim">
              {claimLabel}
            </Link>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Keep this reference handy. Creating a client account is separate from registering a
        business.
      </p>
    </div>
  );
}
