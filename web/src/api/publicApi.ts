import { apiClient } from "@/api/client";
import type {
  AvailabilityResponse,
  PublicBookingCreate,
  PublicBusiness,
  PublicOrderCreate,
  PublicService,
  ServiceType,
} from "@/types/api";

export function getPublicBusiness(slug: string) {
  return apiClient.get<PublicBusiness>(`/public/b/${slug}`, { auth: false });
}

export function listPublicServices(slug: string, type?: ServiceType) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiClient.get<PublicService[]>(
    `/public/b/${slug}/services${query}`,
    { auth: false },
  );
}

export function getPublicService(slug: string, serviceId: string) {
  return apiClient.get<PublicService>(
    `/public/b/${slug}/services/${serviceId}`,
    { auth: false },
  );
}

export function getAvailability(slug: string, serviceId: string, date: string) {
  const params = new URLSearchParams({
    service_id: serviceId,
    date,
  });
  return apiClient.get<AvailabilityResponse>(
    `/public/b/${slug}/availability?${params.toString()}`,
    { auth: false },
  );
}

export function createPublicBooking(slug: string, payload: PublicBookingCreate) {
  return apiClient.post<unknown>(`/public/b/${slug}/bookings`, payload, {
    auth: false,
  });
}

export function createPublicOrder(slug: string, payload: PublicOrderCreate) {
  return apiClient.post<unknown>(`/public/b/${slug}/orders`, payload, {
    auth: false,
  });
}
