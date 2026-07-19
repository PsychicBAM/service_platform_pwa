import type { CheckoutPlanId } from "@/types/api";

/** Public catalog plan ids used in the Payments UI (matches pricing page). */
export type PublicPlanId = "free" | "starter" | "business" | "pro";

export type PublicPlanDefinition = {
  id: PublicPlanId;
  name: string;
  subtitle: string;
  priceMonthly: number;
  priceLabel: string;
  features: string[];
  staffLimit: number;
  servicesLimit: number | null; // null = unlimited
  /** Backend checkout plan when upgrading TO this public plan. */
  checkoutPlan: CheckoutPlanId | null;
  recommended?: boolean;
};

/**
 * Public plans aligned with /pricing names.
 * Backend keys: free | starter | business | pro.
 * Display/checkout mapping (1:1, no backend migration):
 * - free → Free (no checkout)
 * - starter → Starter (checkout starter)
 * - business → Business (checkout business)
 * - pro → Pro (checkout pro)
 * Legacy aliases: basic → Starter, enterprise → Pro
 */
export const PUBLIC_PLANS: PublicPlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    subtitle: "Testing and very small businesses",
    priceMonthly: 0,
    priceLabel: "$0",
    staffLimit: 1,
    servicesLimit: 2,
    checkoutPlan: null,
    features: ["1 staff member", "2 services", "Basic management", "Standard support"],
  },
  {
    id: "starter",
    name: "Starter",
    subtitle: "Solo professionals",
    priceMonthly: 9.9,
    priceLabel: "$9.90",
    staffLimit: 2,
    servicesLimit: 5,
    checkoutPlan: "starter",
    features: [
      "2 staff members",
      "5 services",
      "Booking",
      "Orders",
      "Analytics",
      "Customer management",
      "Mini-site",
      "QR code",
    ],
  },
  {
    id: "business",
    name: "Business",
    subtitle: "Growing businesses",
    priceMonthly: 29.9,
    priceLabel: "$29.90",
    staffLimit: 7,
    servicesLimit: null,
    checkoutPlan: "business",
    recommended: true,
    features: [
      "7 staff members",
      "Unlimited services",
      "Booking",
      "Orders",
      "Custom domain",
      "Analytics",
      "Customer management",
      "Mini-site",
      "QR code",
      "Reviews",
      "Waitlist",
      "Promo codes",
      "Email notifications",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Serious operations",
    priceMonthly: 50,
    priceLabel: "$50.00",
    staffLimit: 15,
    servicesLimit: null,
    checkoutPlan: "pro",
    features: [
      "15 staff members",
      "Unlimited services",
      "Booking",
      "Orders",
      "Custom domain",
      "Analytics",
      "Customer management",
      "Mini-site",
      "QR code",
      "Reviews",
      "Waitlist",
      "Promo codes",
      "Email notifications",
      "API access",
    ],
  },
];

const PUBLIC_RANK: Record<PublicPlanId, number> = {
  free: 0,
  starter: 1,
  business: 2,
  pro: 3,
};

/** Map backend / legacy plan keys to public catalog ids. */
export function toPublicPlanId(backendPlan?: string | null): PublicPlanId {
  const key = backendPlan?.trim().toLowerCase() || "free";
  if (key === "pro" || key === "enterprise") return "pro";
  if (key === "business") return "business";
  if (key === "starter" || key === "basic") return "starter";
  if (key === "free") return "free";
  return "free";
}

export function getPublicPlan(id: PublicPlanId): PublicPlanDefinition {
  return PUBLIC_PLANS.find((plan) => plan.id === id) ?? PUBLIC_PLANS[0];
}

export function getPublicPlanRank(id: PublicPlanId): number {
  return PUBLIC_RANK[id];
}

export function formatPublicPlanName(backendPlan?: string | null): string {
  return getPublicPlan(toPublicPlanId(backendPlan)).name;
}

export function getNextUpgradeTarget(backendPlan?: string | null): PublicPlanDefinition | null {
  const current = toPublicPlanId(backendPlan);
  const nextRank = getPublicPlanRank(current) + 1;
  return PUBLIC_PLANS.find((plan) => getPublicPlanRank(plan.id) === nextRank) ?? null;
}

export function getHeroUpgradeCopy(backendPlan?: string | null): {
  title: string;
  subtitle: string;
  cta: string;
  target: PublicPlanDefinition | null;
  isHighest: boolean;
} {
  const target = getNextUpgradeTarget(backendPlan);
  if (!target) {
    return {
      title: "You're on our highest plan",
      subtitle: "Manage your subscription and billing details below.",
      cta: "Manage subscription",
      target: null,
      isHighest: true,
    };
  }
  return {
    title: "Upgrade your plan",
    subtitle: "Unlock more features and grow your business.",
    cta: `Upgrade to ${target.name}`,
    target,
    isHighest: false,
  };
}

export function formatLimit(limit: number | null): string {
  if (limit == null) return "Unlimited";
  return String(limit);
}
