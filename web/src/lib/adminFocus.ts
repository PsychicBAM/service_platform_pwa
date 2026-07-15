export const ADMIN_ONBOARDING_FOCUS = {
  addService: "add-service",
  businessLocation: "business-location",
  marketplaceCover: "marketplace-cover",
  workingHours: "working-hours",
} as const;

export type AdminOnboardingFocusValue =
  (typeof ADMIN_ONBOARDING_FOCUS)[keyof typeof ADMIN_ONBOARDING_FOCUS];

/** Temporary highlight for onboarding-guided sections. */
export const ADMIN_FOCUS_HIGHLIGHT_CLASS =
  "ring-2 ring-brand-500 bg-brand-50/40 transition-[box-shadow,background-color]";

export const ADMIN_FOCUS_HIGHLIGHT_MS = 4000;
