import { hasAccessToken } from "@/utils/authStorage";

export function useHasToken(): boolean {
  return hasAccessToken();
}

export function isAuthenticated(): boolean {
  return hasAccessToken();
}
