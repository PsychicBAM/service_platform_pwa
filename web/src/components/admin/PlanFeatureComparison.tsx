import { PlanBadge } from "@/components/admin/PlanBadge";
import type { PlanTier } from "@/components/admin/PlanBadge";

type PlanFeatureDefinition = {
  id: PlanTier;
  features: string[];
};

export const PLAN_FEATURE_LIMITS_NOTE =
  "Feature limits are being prepared and may change before public launch.";

export const PLAN_FEATURE_DEFINITIONS: PlanFeatureDefinition[] = [
  {
    id: "free",
    features: [
      "Basic public page included",
      "Limited services included",
      "Manual booking management included",
    ],
  },
  {
    id: "starter",
    features: [
      "More services included",
      "Booking and request tools included",
      "Basic client management included",
    ],
  },
  {
    id: "business",
    features: [
      "Booking and request management included",
      "Client and order management included",
      "Business dashboard tools included",
    ],
  },
  {
    id: "pro",
    features: [
      "Advanced business profile planned",
      "Premium public page tools planned",
      "Media and growth features coming soon",
    ],
  },
];

function normalizePlanKey(plan?: string): PlanTier | null {
  if (!plan?.trim()) {
    return null;
  }
  const key = plan.toLowerCase() as PlanTier;
  return PLAN_FEATURE_DEFINITIONS.some((definition) => definition.id === key) ? key : null;
}

export function getPlanFeatureCardClassName(planId: string, currentPlan?: string): string {
  const isCurrent = normalizePlanKey(currentPlan) === planId;
  const base = "rounded-xl border p-3";
  if (isCurrent) {
    return `${base} border-brand-500 bg-brand-50/40 ring-2 ring-brand-500`;
  }
  return `${base} border-slate-200 bg-white`;
}

type PlanFeatureComparisonProps = {
  currentPlan?: string;
};

export function PlanFeatureComparison({ currentPlan }: PlanFeatureComparisonProps) {
  const currentPlanKey = normalizePlanKey(currentPlan);

  return (
    <div className="space-y-3" data-testid="plan-feature-comparison">
      <div>
        <h4 className="text-sm font-medium text-slate-700">Plan features</h4>
        <p className="mt-1 text-xs text-slate-500">{PLAN_FEATURE_LIMITS_NOTE}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_FEATURE_DEFINITIONS.map((plan) => {
          const isCurrent = currentPlanKey === plan.id;
          const showProHints = plan.id === "pro";
          const showUpgradeHint = showProHints && currentPlanKey === "business";

          return (
            <article
              key={plan.id}
              className={getPlanFeatureCardClassName(plan.id, currentPlan)}
              data-testid={`plan-feature-card-${plan.id}`}
              data-current={isCurrent ? "true" : "false"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PlanBadge variant={plan.id} testId={`plan-feature-badge-${plan.id}`} />
                {isCurrent ? (
                  <span
                    className="text-xs font-medium text-brand-700"
                    data-testid={`plan-feature-current-${plan.id}`}
                  >
                    Current plan
                  </span>
                ) : null}
                {showProHints ? (
                  <PlanBadge variant="coming-soon" testId="plan-feature-pro-coming-soon" />
                ) : null}
                {showUpgradeHint ? (
                  <PlanBadge variant="upgrade" testId="plan-feature-pro-upgrade" />
                ) : null}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} data-testid={`plan-feature-item-${plan.id}`}>
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
