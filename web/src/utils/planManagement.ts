import type { SubscriptionPlan } from "@/types/api";

export function formatPlanLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function planIntentDiffers(
  activePlan: SubscriptionPlan,
  selectedPlanIntent?: SubscriptionPlan | null,
): boolean {
  return Boolean(selectedPlanIntent && selectedPlanIntent !== activePlan);
}
