import { apiClient } from "@/api/client";
import type {
  MyBookingDetail,
  MyBookingListResponse,
  MyBookingStatusFilter,
  MyOrderDetail,
  MyOrderListResponse,
  MyOrderStatusFilter,
  OrderMessageListResponse,
  OrderMessageRead,
} from "@/types/api";

export function listMyBookings(status?: MyBookingStatusFilter) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<MyBookingListResponse>(`/me/bookings${query}`);
}

export function getMyBooking(id: string) {
  return apiClient.get<MyBookingDetail>(`/me/bookings/${encodeURIComponent(id)}`);
}

export function cancelMyBooking(id: string, reason?: string | null) {
  return apiClient.post<MyBookingDetail>(
    `/me/bookings/${encodeURIComponent(id)}/cancel`,
    { reason: reason ?? null },
  );
}

export function rescheduleMyBooking(id: string, startsAt: string) {
  return apiClient.post<MyBookingDetail>(
    `/me/bookings/${encodeURIComponent(id)}/reschedule`,
    { starts_at: startsAt },
  );
}

export function listMyOrders(status?: MyOrderStatusFilter) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<MyOrderListResponse>(`/me/orders${query}`);
}

export function getMyOrder(id: string) {
  return apiClient.get<MyOrderDetail>(`/me/orders/${encodeURIComponent(id)}`);
}

export function cancelMyOrder(id: string, reason?: string | null) {
  return apiClient.post<MyOrderDetail>(
    `/me/orders/${encodeURIComponent(id)}/cancel`,
    { reason: reason ?? null },
  );
}

export function listOrderMessages(orderId: string) {
  return apiClient.get<OrderMessageListResponse>(
    `/me/orders/${encodeURIComponent(orderId)}/messages`,
  );
}

export function sendOrderMessage(orderId: string, body: string) {
  return apiClient.post<OrderMessageRead>(
    `/me/orders/${encodeURIComponent(orderId)}/messages`,
    { body },
  );
}
