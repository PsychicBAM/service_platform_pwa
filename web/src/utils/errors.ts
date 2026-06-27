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

export function formatOrderStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatBookingStatus(status: string): string {
  return formatOrderStatus(status);
}

export function getMeErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403 || error.status === 404) {
      return "This item was not found.";
    }
    if (error.code === "ORDER_MESSAGES_CLOSED") {
      return "Messages are closed for this request.";
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
  return fallback;
}

export function getAdminServiceErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.code === "PLAN_LIMIT_EXCEEDED") {
      return "Your current plan has reached the service limit.";
    }
    if (error.status === 422) {
      return "Please check the service fields.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
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

export function getBookingSubmitErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "SLOT_UNAVAILABLE") {
      return "This time was just taken. Please choose another time.";
    }
    if (error.code === "SERVICE_NOT_BOOKABLE") {
      const message = error.message.toLowerCase();
      if (
        message.includes("operating mode") ||
        message.includes("does not allow bookings")
      ) {
        return "Bookings are currently disabled for this business.";
      }
      return "This service cannot be booked by date and time.";
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
