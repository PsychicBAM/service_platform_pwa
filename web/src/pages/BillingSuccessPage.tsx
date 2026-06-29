import { Link, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "@/components/AuthPageShell";

function formatSessionReference(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= 24) {
    return trimmed;
  }
  return `${trimmed.slice(0, 20)}…`;
}

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() ?? "";
  const sessionReference = sessionId ? formatSessionReference(sessionId) : "";

  return (
    <AuthPageShell className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-900">Checkout completed</h1>
        <p className="mt-3 text-sm text-emerald-900">
          Your payment was received by Stripe. Your plan will be activated after Stripe confirms
          the payment through webhook processing.
        </p>
        {sessionReference ? (
          <p className="mt-3 text-xs text-emerald-800">
            Checkout session: <span className="font-mono">{sessionReference}</span>
          </p>
        ) : null}
      </div>

      <p className="text-sm text-slate-600">
        If your plan does not update immediately, refresh after a moment or contact support.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          to="/admin/settings"
          className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
        >
          Go to Admin Settings
        </Link>
        <Link
          to="/admin"
          className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go to Dashboard
        </Link>
      </div>
    </AuthPageShell>
  );
}
