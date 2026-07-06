import { Link } from "react-router-dom";
import { formatPlanLabel } from "@/utils/planManagement";

type CurrentPlanCardProps = {
  plan?: string;
  status?: string;
  settingsHref?: string;
};

const KNOWN_PLANS = new Set(["free", "starter", "business", "pro"]);

const PLAN_HELPER_TEXT: Record<string, string> = {
  free: "Basic tools to try the platform.",
  starter: "Simple booking tools for small teams.",
  business: "Booking and request management for growing businesses.",
  pro: "Advanced business profile and premium tools.",
};

const PLAN_BADGE_CLASS: Record<string, string> = {
  free: "border-slate-200 bg-slate-100 text-slate-700",
  starter: "border-sky-200 bg-sky-50 text-sky-800",
  business: "border-brand-200 bg-brand-50 text-brand-800",
  pro: "border-violet-200 bg-violet-50 text-violet-800",
};

function normalizePlanKey(plan?: string): string | null {
  if (!plan) {
    return null;
  }
  const key = plan.toLowerCase();
  return KNOWN_PLANS.has(key) ? key : null;
}

export function getPlanDisplayName(plan?: string): string {
  const key = normalizePlanKey(plan);
  if (key) {
    return formatPlanLabel(key);
  }
  return "Unknown plan";
}

export function getPlanHelperText(plan?: string): string | null {
  const key = normalizePlanKey(plan);
  if (!key) {
    return null;
  }
  return PLAN_HELPER_TEXT[key] ?? null;
}

export function getPlanBadgeClassName(plan?: string): string {
  const key = normalizePlanKey(plan);
  if (!key) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return PLAN_BADGE_CLASS[key];
}

function formatSubscriptionStatus(status?: string): string | null {
  if (!status?.trim()) {
    return null;
  }
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CurrentPlanCard({
  plan,
  status,
  settingsHref = "/admin/settings",
}: CurrentPlanCardProps) {
  const hasPlanInfo = Boolean(plan?.trim() || status?.trim());
  const planLabel = getPlanDisplayName(plan);
  const statusLabel = formatSubscriptionStatus(status);
  const helperText = getPlanHelperText(plan);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="current-plan-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">Current plan</h3>
          {hasPlanInfo ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-medium ${getPlanBadgeClassName(plan)}`}
                  data-testid="current-plan-badge"
                >
                  {planLabel}
                </span>
                {statusLabel ? (
                  <span className="text-sm text-slate-600" data-testid="current-plan-status">
                    Status: {statusLabel}
                  </span>
                ) : null}
              </div>
              {helperText ? (
                <p className="text-sm text-slate-600" data-testid="current-plan-helper">
                  {helperText}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-amber-700" role="status">
              Plan information is not available.
            </p>
          )}
        </div>
        <Link
          to={settingsHref}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View plan details
        </Link>
      </div>
    </div>
  );
}
