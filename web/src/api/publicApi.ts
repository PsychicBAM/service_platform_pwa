import { apiClient } from "@/api/client";
import type {
  AvailabilityResponse,
  PublicBookingCreate,
  PublicBusiness,
  PublicOrderCreate,
  PublicOrderCreateResponse,
  PublicService,
  ServiceType,
} from "@/types/api";

function encodeSlug(slug: string): string {
  return encodeURIComponent(slug.trim().toLowerCase());
}

export function getPublicBusiness(slug: string) {
  return apiClient.get<PublicBusiness>(`/public/b/${encodeSlug(slug)}`, { auth: false });
}

export function listPublicServices(slug: string, type?: ServiceType) {
  const encoded = encodeSlug(slug);
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiClient.get<PublicService[]>(`/public/b/${encoded}/services${query}`, {
    auth: false,
  });
}

export function getPublicService(slug: string, serviceId: string) {
  return apiClient.get<PublicService>(
    `/public/b/${encodeSlug(slug)}/services/${encodeURIComponent(serviceId)}`,
    { auth: false },
  );
}

export function getAvailability(slug: string, serviceId: string, date: string) {
  const params = new URLSearchParams({
    service_id: serviceId,
    date,
  });
  return apiClient.get<AvailabilityResponse>(
    `/public/b/${encodeSlug(slug)}/availability?${params.toString()}`,
    { auth: false },
  );
}

export function createPublicBooking(slug: string, payload: PublicBookingCreate) {
  return apiClient.post<unknown>(`/public/b/${encodeSlug(slug)}/bookings`, payload, {
    auth: false,
  });
}

export function createPublicOrder(slug: string, payload: PublicOrderCreate) {
  return apiClient.post<PublicOrderCreateResponse>(
    `/public/b/${encodeSlug(slug)}/orders`,
    payload,
    { auth: false },
  );
}
