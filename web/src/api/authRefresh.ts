import type { RefreshResponse } from "@/types/api";
import { clearTokens, getRefreshToken, setTokens } from "@/utils/authStorage";

const DEV_BASE_URL = "http://localhost:8000/api/v1";
const PROD_BASE_URL = "/api/v1";

const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/register-client", "/auth/refresh"];

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    return PROD_BASE_URL;
  }
  return DEV_BASE_URL;
}

export function isAuthRefreshEligible(path: string): boolean {
  return !NO_REFRESH_PATHS.some((segment) => path.includes(segment));
}

export async function refreshAccessToken(refresh_token: string): Promise<RefreshResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Token refresh failed");
  }

  const data = (await response.json()) as RefreshResponse;
  setTokens({
    access_token: data.access_token,
    refresh_token,
    token_type: data.token_type,
  });
  return data;
}

export async function tryRefreshStoredAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    await refreshAccessToken(refreshToken);
    return true;
  } catch {
    return false;
  }
}
