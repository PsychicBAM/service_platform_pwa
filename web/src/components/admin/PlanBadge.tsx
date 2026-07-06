import { formatPlanLabel } from "@/utils/planManagement";

export const PLAN_TIERS = ["free", "starter", "business", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];
export type PlanBadgeVariant = PlanTier | "coming-soon" | "upgrade";

const VARIANT_CLASS: Record<PlanBadgeVariant, string> = {
  free: "border-slate-200 bg-slate-100 text-slate-700",
  starter: "border-sky-200 bg-sky-50 text-sky-800",
  business: "border-brand-200 bg-brand-50 text-brand-800",
  pro: "border-violet-200 bg-violet-50 text-violet-800",
  "coming-soon": "border-amber-200 bg-amber-50 text-amber-800",
  upgrade: "border-violet-300 bg-white text-violet-700",
};

const VARIANT_LABEL: Record<PlanBadgeVariant, string> = {
  free: "Free",
  starter: "Starter",
  business: "Business",
  pro: "Pro",
  "coming-soon": "Coming soon",
  upgrade: "Upgrade",
};

function normalizePlanTier(plan?: string): PlanTier | null {
  if (!plan?.trim()) {
    return null;
  }
  const key = plan.toLowerCase() as PlanTier;
  return PLAN_TIERS.includes(key) ? key : null;
}

export function isProPlan(plan?: string): boolean {
  return normalizePlanTier(plan) === "pro";
}

export function getPlanBadgeClassName(plan?: string): string {
  const tier = normalizePlanTier(plan);
  if (!tier) {
    return VARIANT_CLASS.free;
  }
  return VARIANT_CLASS[tier];
}

type PlanBadgeProps = {
  variant: PlanBadgeVariant;
  size?: "sm" | "md";
  className?: string;
  testId?: string;
};

export function PlanBadge({ variant, size = "sm", className = "", testId }: PlanBadgeProps) {
  const sizeClass = size === "md" ? "px-2.5 py-0.5 text-sm" : "px-2 py-0.5 text-xs";
  const label =
    PLAN_TIERS.includes(variant as PlanTier) ? formatPlanLabel(variant) : VARIANT_LABEL[variant];

  return (
    <span
      className={`inline-flex rounded-full border font-medium ${sizeClass} ${VARIANT_CLASS[variant]} ${className}`}
      data-testid={testId}
    >
      {label}
    </span>
  );
}
