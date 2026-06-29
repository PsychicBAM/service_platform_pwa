import { Link } from "react-router-dom";
import { AuthPageShell } from "@/components/AuthPageShell";

export function BillingCancelPage() {
  return (
    <AuthPageShell className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Checkout cancelled</h1>
        <p className="mt-3 text-sm text-slate-600">
          No payment was completed and your active plan was not changed.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          to="/admin/settings"
          className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to Admin Settings
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View pricing
        </Link>
      </div>
    </AuthPageShell>
  );
}
