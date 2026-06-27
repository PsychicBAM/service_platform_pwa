import { getAccessToken } from "@/api/client";

export function useHasToken(): boolean {
  return Boolean(getAccessToken());
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
