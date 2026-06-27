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

export function getOrderSubmitErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "SERVICE_NOT_ORDERABLE") {
      return "This service cannot be requested.";
    }
    if (error.code === "ORDERS_DISABLED") {
      return "Requests are currently disabled for this business.";
    }
    if (error.status === 422) {
      return "Please check the form and try again.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function formatOrderStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
