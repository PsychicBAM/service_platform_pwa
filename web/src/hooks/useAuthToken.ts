import { isAuthenticated as hasAuthTokens } from "@/utils/authStorage";

export function useHasToken(): boolean {
  return hasAuthTokens();
}

export function isAuthenticated(): boolean {
  return hasAuthTokens();
}
