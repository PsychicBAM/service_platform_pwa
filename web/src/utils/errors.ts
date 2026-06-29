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

export function getAdminBookingErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.status === 404) {
      return "Booking not found.";
    }
    if (error.code === "INVALID_BOOKING_STATUS_TRANSITION") {
      return "This booking cannot move to that status.";
    }
    if (error.status === 422) {
      return "Please check the fields and try again.";
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

export function getAdminOrderErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.status === 404) {
      return "Order not found.";
    }
    if (error.code === "INVALID_ORDER_STATUS_TRANSITION") {
      return "This request cannot move to that status.";
    }
    if (error.code === "DECLINE_REASON_REQUIRED") {
      return "Please enter a decline reason.";
    }
    if (error.code === "ORDER_MESSAGES_CLOSED") {
      return "Messages are closed for this request.";
    }
    if (error.status === 422) {
      return "Please check the fields and try again.";
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

export function getAdminScheduleErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.status === 404) {
      return "Schedule item not found.";
    }
    if (error.status === 422) {
      return "Please check schedule fields.";
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

export function getAdminSettingsErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.status === 404) {
      return "Business not found.";
    }
    if (error.code === "INVALID_TIMEZONE") {
      return "Please enter a valid timezone.";
    }
    if (error.status === 422) {
      return "Please check settings values.";
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

export function getAdminClientErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access.";
    }
    if (error.status === 404) {
      return "Client not found.";
    }
    if (error.code === "CLIENT_EMAIL_EXISTS") {
      return "This email is already used by another client.";
    }
    if (error.status === 422) {
      return "Please check the fields and try again.";
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

export function getBillingCheckoutErrorMessage(
  error: unknown,
  fallback = "Could not start checkout.",
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "STRIPE_DISABLED") {
      return "Stripe checkout is not enabled yet. Plan changes are manual for now.";
    }
    if (error.code === "INVALID_CHECKOUT_PLAN") {
      return "This plan cannot be purchased through checkout.";
    }
    if (error.code === "STRIPE_PRICE_NOT_CONFIGURED") {
      return "This plan is not configured for checkout yet.";
    }
    if (error.code === "STRIPE_CHECKOUT_CREATE_FAILED") {
      return "Could not start checkout. Please try again later.";
    }
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have access to billing for this business.";
    }
    if (error.status === 422) {
      return "Invalid checkout request. Please try again.";
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

export function getSuperadminErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 403) {
      return "Superadmin access required.";
    }
    if (error.status === 404) {
      return "Business not found.";
    }
    if (error.status === 422) {
      return "Please check the fields and try again.";
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

export function getClaimErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Please log in first.";
    }
    if (error.code === "CLAIM_NOT_FOUND_OR_MISMATCH") {
      return "We could not find a matching guest item. Check the reference and contact.";
    }
    if (error.status === 422) {
      return "Check the reference and contact fields.";
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

export function getLoginErrorMessage(
  error: unknown,
  fallback = "Login failed. Please try again.",
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "EMAIL_VERIFICATION_REQUIRED") {
      return "Please verify your email before logging in.";
    }
    if (error.code === "INVALID_CREDENTIALS") {
      return "Invalid email or password.";
    }
    if (error.status === 403) {
      return error.message;
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Network error. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function isEmailVerificationRequiredError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === "EMAIL_VERIFICATION_REQUIRED";
}

export function getPasswordResetErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "PASSWORD_RESET_TOKEN_INVALID") {
      return "Password reset link is invalid or expired.";
    }
    if (error.status === 422) {
      return "Check the password reset fields.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Network error. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getRegisterErrorMessage(
  error: unknown,
  fallback = "Registration failed. Please try again.",
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "EMAIL_ALREADY_EXISTS") {
      return "This email is already registered.";
    }
    if (error.code === "SLUG_ALREADY_EXISTS") {
      return "This business slug is already taken. Choose another slug.";
    }
    if (error.status === 422) {
      return "Please check the form fields and try again.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Network error. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getEmailVerificationErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiClientError) {
    if (error.code === "EMAIL_VERIFICATION_TOKEN_INVALID") {
      return "Verification link is invalid or expired.";
    }
    if (error.status === 401) {
      return "Please log in again.";
    }
    if (error.status === 422) {
      return "Invalid verification request.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Network error. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
