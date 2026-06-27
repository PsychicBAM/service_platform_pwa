import { apiClient } from "@/api/client";
import type {
  AdminBookingListResponse,
  AdminOrderListResponse,
  AdminServiceListResponse,
  BusinessAdminRead,
  ClientListResponse,
  ScheduleRead,
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

export function updateBusiness(businessId: string, payload: Record<string, unknown>) {
  return apiClient.patch<BusinessAdminRead>(
    `/businesses/${encodeURIComponent(businessId)}`,
    payload,
  );
}

export function listAdminServices(businessId: string) {
  return apiClient.get<AdminServiceListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/services`,
  );
}

export function getAdminService(businessId: string, serviceId: string) {
  return apiClient.get<AdminServiceListResponse["data"][number]>(
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
  return apiClient.get<unknown>(
    `/businesses/${encodeURIComponent(businessId)}/bookings/${encodeURIComponent(bookingId)}`,
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
  return apiClient.get<unknown>(
    `/businesses/${encodeURIComponent(businessId)}/orders/${encodeURIComponent(orderId)}`,
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
  return apiClient.get<unknown>(
    `/businesses/${encodeURIComponent(businessId)}/clients/${encodeURIComponent(clientId)}`,
  );
}

export function getSchedule(businessId: string) {
  return apiClient.get<ScheduleRead>(
    `/businesses/${encodeURIComponent(businessId)}/schedule`,
  );
}
