import { ApiClientError } from "@/api/client";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return "Not found";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Could not reach the server. Check that the API is running.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}
