import { apiClient } from "@/api/client";
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  CheckoutPlanId,
} from "@/types/api";

export function createBillingCheckoutSession(businessId: string, plan: CheckoutPlanId) {
  const payload: BillingCheckoutRequest = { plan };
  return apiClient.post<BillingCheckoutResponse>(
    `/businesses/${encodeURIComponent(businessId)}/billing/checkout-session`,
    payload,
  );
}
