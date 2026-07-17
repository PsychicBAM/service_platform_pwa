import { apiClient } from "@/api/client";
import type {
  AdminBookingCancelPayload,
  AdminBookingListResponse,
  AdminBookingRead,
  AdminBookingUpdatePayload,
  AdminOrderAcceptPayload,
  AdminOrderCancelPayload,
  AdminOrderDeclinePayload,
  AdminOrderListResponse,
  AdminOrderRead,
  AdminOrderUpdatePayload,
  AdminServiceListResponse,
  AdminServiceRead,
  BusinessAdminRead,
  BusinessUpdatePayload,
  ClientListResponse,
  ClientDetail,
  ClientUpdatePayload,
  LegalConsentRecordListResponse,
  OrderMessageCreatePayload,
  OrderMessageListResponse,
  OrderMessageRead,
  ScheduleRead,
  ServiceCreatePayload,
  ServiceSlotCapacityOverrideCreatePayload,
  ServiceSlotCapacityOverrideListResponse,
  ServiceSlotCapacityOverrideRead,
  ServiceUpdatePayload,
  UnavailableTimeCreatePayload,
  UnavailableTimeRead,
  UnavailableTimeUpdatePayload,
  WorkingBreakCreatePayload,
  WorkingBreakRead,
  WorkingBreakUpdatePayload,
  WorkingHourRead,
  WorkingHoursReplaceRequest,
} from "@/types/api";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getBusiness(businessId: string) {
  return apiClient.get<BusinessAdminRead>(`/businesses/${encodeURIComponent(businessId)}`);
}

export function updateBusiness(businessId: string, payload: BusinessUpdatePayload) {
  return apiClient.patch<BusinessAdminRead>(
    `/businesses/${encodeURIComponent(businessId)}`,
    payload,
  );
}

export function listAdminServices(
  businessId: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  return apiClient.get<AdminServiceListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/services${buildQuery(params)}`,
  );
}

export function getAdminService(businessId: string, serviceId: string) {
  return apiClient.get<AdminServiceRead>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`,
  );
}

export function createAdminService(businessId: string, payload: ServiceCreatePayload) {
  return apiClient.post<AdminServiceRead>(
    `/businesses/${encodeURIComponent(businessId)}/services`,
    payload,
  );
}

export function updateAdminService(
  businessId: string,
  serviceId: string,
  payload: ServiceUpdatePayload,
) {
  return apiClient.patch<AdminServiceRead>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`,
    payload,
  );
}

export function deleteAdminService(businessId: string, serviceId: string) {
  return apiClient.delete<AdminServiceRead>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`,
  );
}

export function listAdminBookings(
  businessId: string,
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<AdminBookingListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/bookings${buildQuery(params)}`,
  );
}

export function getAdminBooking(businessId: string, bookingId: string) {
  return apiClient.get<AdminBookingRead>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}`,
  );
}

export function updateAdminBooking(
  businessId: string,
  bookingId: string,
  payload: AdminBookingUpdatePayload,
) {
  return apiClient.patch<AdminBookingRead>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}`,
    payload,
  );
}

export function cancelAdminBooking(
  businessId: string,
  bookingId: string,
  payload: AdminBookingCancelPayload = {},
) {
  return apiClient.post<AdminBookingRead>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}/cancel`,
    payload,
  );
}

export function listAdminOrders(
  businessId: string,
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<AdminOrderListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/orders${buildQuery(params)}`,
  );
}

export function getAdminOrder(businessId: string, orderId: string) {
  return apiClient.get<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}`,
  );
}

export function updateAdminOrder(
  businessId: string,
  orderId: string,
  payload: AdminOrderUpdatePayload,
) {
  return apiClient.patch<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}`,
    payload,
  );
}

export function acceptAdminOrder(
  businessId: string,
  orderId: string,
  payload: AdminOrderAcceptPayload = {},
) {
  return apiClient.post<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/accept`,
    payload,
  );
}

export function declineAdminOrder(
  businessId: string,
  orderId: string,
  payload: AdminOrderDeclinePayload,
) {
  return apiClient.post<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/decline`,
    payload,
  );
}

export function markAdminOrderInProgress(businessId: string, orderId: string) {
  return apiClient.post<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/in-progress`,
    {},
  );
}

export function completeAdminOrder(businessId: string, orderId: string) {
  return apiClient.post<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/complete`,
    {},
  );
}

export function cancelAdminOrder(
  businessId: string,
  orderId: string,
  payload: AdminOrderCancelPayload = {},
) {
  return apiClient.post<AdminOrderRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/cancel`,
    payload,
  );
}

export function listAdminOrderMessages(businessId: string, orderId: string) {
  return apiClient.get<OrderMessageListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/messages`,
  );
}

export function sendAdminOrderMessage(
  businessId: string,
  orderId: string,
  payload: OrderMessageCreatePayload,
) {
  return apiClient.post<OrderMessageRead>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}/messages`,
    payload,
  );
}

export function listAdminClients(
  businessId: string,
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<ClientListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/clients${buildQuery(params)}`,
  );
}

export function getAdminClient(businessId: string, clientId: string) {
  return apiClient.get<ClientDetail>(
    `/businesses/${encodeURIComponent(businessId)}/clients/${encodeURIComponent(clientId)}`,
  );
}

export function updateAdminClient(
  businessId: string,
  clientId: string,
  payload: ClientUpdatePayload,
) {
  return apiClient.patch<ClientDetail>(
    `/businesses/${encodeURIComponent(businessId)}/clients/${encodeURIComponent(clientId)}`,
    payload,
  );
}

export function getSchedule(businessId: string) {
  return apiClient.get<ScheduleRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule`,
  );
}

export function replaceWorkingHours(businessId: string, payload: WorkingHoursReplaceRequest) {
  return apiClient.put<WorkingHourRead[]>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/working-hours`,
    payload,
  );
}

export function createWorkingBreak(businessId: string, payload: WorkingBreakCreatePayload) {
  return apiClient.post<WorkingBreakRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/breaks`,
    payload,
  );
}

export function updateWorkingBreak(
  businessId: string,
  breakId: string,
  payload: WorkingBreakUpdatePayload,
) {
  return apiClient.patch<WorkingBreakRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/breaks/${encodeURIComponent(breakId)}`,
    payload,
  );
}

export function deleteWorkingBreak(businessId: string, breakId: string) {
  return apiClient.delete<void>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/breaks/${encodeURIComponent(breakId)}`,
  );
}

export function createUnavailableTime(
  businessId: string,
  payload: UnavailableTimeCreatePayload,
) {
  return apiClient.post<UnavailableTimeRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/unavailable-times`,
    payload,
  );
}

export function updateUnavailableTime(
  businessId: string,
  blockId: string,
  payload: UnavailableTimeUpdatePayload,
) {
  return apiClient.patch<UnavailableTimeRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/unavailable-times/${encodeURIComponent(blockId)}`,
    payload,
  );
}

export function deleteUnavailableTime(businessId: string, blockId: string) {
  return apiClient.delete<void>(
    `/businesses/${encodeURIComponent(businessId)}/schedule/unavailable-times/${encodeURIComponent(blockId)}`,
  );
}

export function getBusinessLegalConsents(
  businessId: string,
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<LegalConsentRecordListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/legal-consents${buildQuery(params)}`,
  );
}

export function listServiceSlotCapacityOverrides(businessId: string, serviceId: string) {
  return apiClient.get<ServiceSlotCapacityOverrideListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}/slot-capacity-overrides`,
  );
}

export function createServiceSlotCapacityOverride(
  businessId: string,
  serviceId: string,
  payload: ServiceSlotCapacityOverrideCreatePayload,
) {
  return apiClient.post<ServiceSlotCapacityOverrideRead>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}/slot-capacity-overrides`,
    payload,
  );
}

export function deleteServiceSlotCapacityOverride(
  businessId: string,
  serviceId: string,
  overrideId: string,
) {
  return apiClient.delete<void>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}/slot-capacity-overrides/${encodeURIComponent(overrideId)}`,
  );
}

export function listWaitlistEntries(
  businessId: string,
  params?: { service_id?: string; status?: string },
) {
  const search = new URLSearchParams();
  if (params?.service_id) {
    search.set("service_id", params.service_id);
  }
  if (params?.status) {
    search.set("status", params.status);
  }
  const query = search.toString();
  return apiClient.get<import("@/types/api").WaitlistListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/waitlist${query ? `?${query}` : ""}`,
  );
}

export function updateWaitlistEntryStatus(
  businessId: string,
  entryId: string,
  status: import("@/types/api").WaitlistStatus,
) {
  return apiClient.patch<import("@/types/api").WaitlistEntryRead>(
    `/businesses/${encodeURIComponent(businessId)}/waitlist/${encodeURIComponent(entryId)}`,
    { status },
  );
}

export function promoteWaitlistEntry(businessId: string, entryId: string) {
  return apiClient.post<import("@/types/api").WaitlistPromoteResponse>(
    `/businesses/${encodeURIComponent(businessId)}/waitlist/${encodeURIComponent(entryId)}/promote`,
    {},
  );
}

export function listAdminReviews(
  businessId: string,
  params?: { status?: import("@/types/api").ReviewStatus },
) {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }
  const query = search.toString();
  return apiClient.get<import("@/types/api").ReviewRead[]>(
    `/businesses/${encodeURIComponent(businessId)}/reviews${query ? `?${query}` : ""}`,
  );
}

export function updateAdminReviewStatus(
  businessId: string,
  reviewId: string,
  status: import("@/types/api").ReviewStatus,
) {
  return apiClient.patch<import("@/types/api").ReviewRead>(
    `/businesses/${encodeURIComponent(businessId)}/reviews/${encodeURIComponent(reviewId)}`,
    { status },
  );
}

export function createReviewRequestLink(
  businessId: string,
  payload: { booking_id?: string; order_id?: string },
) {
  return apiClient.post<import("@/types/api").ReviewRequestLinkResponse>(
    `/businesses/${encodeURIComponent(businessId)}/reviews/request-link`,
    payload,
  );
}

export function sendReviewRequestEmail(
  businessId: string,
  payload: { booking_id?: string; order_id?: string },
) {
  return apiClient.post<import("@/types/api").ReviewRequestEmailResponse>(
    `/businesses/${encodeURIComponent(businessId)}/reviews/request-email`,
    payload,
  );
}
