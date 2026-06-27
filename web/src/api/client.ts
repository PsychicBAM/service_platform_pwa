import type { ApiErrorBody } from "@/types/api";
import { getApiBaseUrl, isAuthRefreshEligible, tryRefreshStoredAccessToken } from "@/api/authRefresh";
import { getAccessToken } from "@/utils/authStorage";

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  auth?: boolean;
  body?: unknown;
};

async function parseError(response: Response): Promise<ApiClientError> {
  try {
    const data = (await response.json()) as ApiErrorBody;
    if (data?.error?.message) {
      return new ApiClientError(
        response.status,
        data.error.code,
        data.error.message,
      );
    }
  } catch {
    // fall through
  }
  return new ApiClientError(
    response.status,
    "HTTP_ERROR",
    response.statusText || "Request failed",
  );
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (
    response.status === 401 &&
    !retried &&
    options.auth !== false &&
    isAuthRefreshEligible(path)
  ) {
    const refreshed = await tryRefreshStoredAccessToken();
    if (refreshed) {
      return request<T>(method, path, options, true);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("PATCH", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("PUT", path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("DELETE", path, options),
};

export { ACCESS_TOKEN_KEY } from "@/utils/authStorage";
