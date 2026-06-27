import {
  ACCESS_TOKEN_KEY,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/api/client";

export { ACCESS_TOKEN_KEY, clearAccessToken, getAccessToken, setAccessToken };

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}
