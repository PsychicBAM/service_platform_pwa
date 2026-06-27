export const ADMIN_BUSINESS_ID_KEY = "admin_business_id";

export function getStoredAdminBusinessId(): string | null {
  return localStorage.getItem(ADMIN_BUSINESS_ID_KEY);
}

export function setStoredAdminBusinessId(businessId: string): void {
  localStorage.setItem(ADMIN_BUSINESS_ID_KEY, businessId);
}
