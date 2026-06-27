export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const TOKEN_TYPE_KEY = "token_type";

export type StoredTokens = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
};

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getTokenType(): string | null {
  return localStorage.getItem(TOKEN_TYPE_KEY);
}

export function setTokens(tokens: StoredTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  if (tokens.token_type) {
    localStorage.setItem(TOKEN_TYPE_KEY, tokens.token_type);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function hasRefreshToken(): boolean {
  return Boolean(getRefreshToken());
}

export function isAuthenticated(): boolean {
  return hasAccessToken() || hasRefreshToken();
}

/** @deprecated Use setTokens — kept for backward compatibility */
export function setAccessToken(token: string): void {
  setTokens({ access_token: token });
}

/** @deprecated Use clearTokens — kept for backward compatibility */
export function clearAccessToken(): void {
  clearTokens();
}
