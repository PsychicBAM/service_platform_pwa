import { Link } from "react-router-dom";
import { PlanBadge, getPlanBadgeClassName, isProPlan } from "@/components/admin/PlanBadge";
import type { PlanTier } from "@/components/admin/PlanBadge";
import {
  PRO_FEATURES_COMING_SOON_HINT,
  PRO_TOOLS_ON_PRO_MESSAGE,
} from "@/components/admin/ProToolsComingSoonCard";
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

export { getPlanBadgeClassName } from "@/components/admin/PlanBadge";

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
  settingsHref = "/admin/settings?tab=payments",
}: CurrentPlanCardProps) {
  const hasPlanInfo = Boolean(plan?.trim() || status?.trim());
  const planTier = normalizePlanKey(plan);
  const statusLabel = formatSubscriptionStatus(status);
  const helperText = getPlanHelperText(plan);

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      data-testid="current-plan-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Current plan</h3>
          {hasPlanInfo ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {planTier ? (
                  <PlanBadge variant={planTier as PlanTier} size="md" testId="current-plan-badge" />
                ) : plan?.trim() ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-medium ${getPlanBadgeClassName(plan)}`}
                    data-testid="current-plan-badge"
                  >
                    {getPlanDisplayName(plan)}
                  </span>
                ) : null}
                {statusLabel ? (
                  <span className="text-sm text-gray-600" data-testid="current-plan-status">
                    Status: {statusLabel}
                  </span>
                ) : null}
              </div>
              {helperText ? (
                <p className="text-sm text-gray-600" data-testid="current-plan-helper">
                  {helperText}
                </p>
              ) : null}
              {isProPlan(plan) ? (
                <p className="text-xs text-violet-700" data-testid="current-plan-pro-hint">
                  {PRO_TOOLS_ON_PRO_MESSAGE}
                </p>
              ) : (
                <p className="text-xs text-gray-500" data-testid="current-plan-pro-hint">
                  {PRO_FEATURES_COMING_SOON_HINT}{" "}
                  <Link to={settingsHref} className="font-medium text-emerald-700 hover:underline">
                    Learn more
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-700" role="status">
              Plan information is not available.
            </p>
          )}
        </div>
        <Link
          to={settingsHref}
          className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          View plan details
        </Link>
      </div>
    </div>
  );
}
