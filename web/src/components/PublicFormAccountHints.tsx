type PublicFormAccountHintsProps = {
  kind: "booking" | "request";
  typedEmail: string;
  accountEmail?: string | null;
  isAuthenticated: boolean;
};

/**
 * Pre-submit account guidance for public booking/request forms.
 * Does not block mismatched email — backend decides linking.
 */
export function PublicFormAccountHints({
  kind,
  typedEmail,
  accountEmail,
  isAuthenticated,
}: PublicFormAccountHintsProps) {
  const trimmedTyped = typedEmail.trim().toLowerCase();
  const trimmedAccount = accountEmail?.trim().toLowerCase() ?? "";
  const itemLabel = kind === "booking" ? "booking" : "request";

  if (isAuthenticated && trimmedAccount) {
    const mismatch = Boolean(trimmedTyped) && trimmedTyped !== trimmedAccount;
    return (
      <div className="space-y-2" data-testid="public-form-account-hints">
        <p
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950"
          data-testid="public-form-signed-in-hint"
        >
          Signed in as {accountEmail}. {kind === "booking" ? "Bookings" : "Requests"} with this
          email will be saved to your account.
        </p>
        {mismatch ? (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            data-testid="public-form-email-mismatch-hint"
          >
            {kind === "booking"
              ? "This email is different from your account email, so this booking may be submitted as guest activity."
              : "This email is different from your account email, so this request may need to be claimed manually."}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-600" data-testid="public-form-account-hints">
      {kind === "booking"
        ? "Use an email you can access. If you create a client account later, use the same email to see this booking."
        : "Use the same email if you want this request to appear in your client account."}{" "}
      You can create a client account after submitting to track this {itemLabel}.
    </p>
  );
}
