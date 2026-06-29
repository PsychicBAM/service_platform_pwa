export type PricingPlanId = "free" | "starter" | "business" | "pro";

export const PRICING_PLAN_IDS: PricingPlanId[] = [
  "free",
  "starter",
  "business",
  "pro",
];

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  priceLabel: string;
  description: string;
  bestFor: string;
  features: string[];
  limits: string[];
  recommended?: boolean;
};

/** Shown on pricing and register — no live payments yet. */
export const MANUAL_BILLING_NOTE =
  "Payments and automatic upgrades are not live yet. Plan changes are currently demo/manual.";

export const REGISTER_PLAN_INTENT_NOTE =
  "Selected plan is saved as your signup intent for now. Your account still starts on the Free plan until billing is implemented.";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0/mo",
    description: "Try one mode with tight limits.",
    bestFor: "Testing and very small businesses",
    features: [
      "Basic booking or request page",
      "Email notifications when SMTP is configured",
      "Community support",
    ],
    limits: [
      "Booking or orders mode (not both)",
      "Up to 3 services",
      "30 bookings / 10 orders per month",
      "1 staff account, 50 clients",
      "No online payments",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$19/mo",
    description: "Both booking and request flows for solo pros.",
    bestFor: "Solo professionals",
    features: [
      "Booking + request flows",
      "Client management",
      "Email notifications",
      "Push notifications (when enabled)",
    ],
    limits: [
      "Up to 10 services",
      "200 bookings / 50 orders per month",
      "1 staff account, 500 clients",
      "Online payments (5% platform fee — future)",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "$49/mo",
    description: "Unlimited capacity for growing teams.",
    bestFor: "Growing businesses",
    recommended: true,
    features: [
      "Team and admin workflows",
      "Operations dashboard",
      "Custom branding (logo + colors)",
      "CSV export",
      "Priority email support",
    ],
    limits: [
      "Unlimited services, bookings, and orders",
      "Up to 5 staff accounts",
      "Unlimited clients",
      "Online payments (2% platform fee — future)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$99/mo",
    description: "White-label and API for serious operations.",
    bestFor: "Serious operations",
    features: [
      "White-label custom domain (future)",
      "API access",
      "Dedicated support",
      "Bring your own payment keys (future)",
    ],
    limits: [
      "Unlimited staff and clients",
      "All Business features included",
      "0% platform payment fee (future)",
    ],
  },
];

export function parsePricingPlanId(value: string | null | undefined): PricingPlanId {
  if (value && PRICING_PLAN_IDS.includes(value as PricingPlanId)) {
    return value as PricingPlanId;
  }
  return "free";
}

export function getPricingPlan(id: PricingPlanId): PricingPlan {
  const plan = PRICING_PLANS.find((item) => item.id === id);
  return plan ?? PRICING_PLANS[0];
}
