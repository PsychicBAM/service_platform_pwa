import { apiClient } from "@/api/client";
import { mapMiniSiteConfigFromWire, type MiniSiteConfigWire } from "@/api/miniSiteApi";
import type {
  AvailabilityResponse,
  PublicBookingCreate,
  PublicBookingCreateResponse,
  PublicBusiness,
  PublicOrderCreate,
  PublicOrderCreateResponse,
  PublicService,
  ServiceType,
} from "@/types/api";

function encodeSlug(slug: string): string {
  return encodeURIComponent(slug.trim().toLowerCase());
}

type PublicBusinessWire = Omit<PublicBusiness, "mini_site_config"> & {
  mini_site_config: MiniSiteConfigWire | null;
};

function mapPublicBusinessFromWire(wire: PublicBusinessWire): PublicBusiness {
  return {
    ...wire,
    mini_site_config: wire.mini_site_config
      ? mapMiniSiteConfigFromWire(wire.mini_site_config)
      : null,
  };
}

export function getPublicBusiness(slug: string) {
  return apiClient
    .get<PublicBusinessWire>(`/public/b/${encodeSlug(slug)}`, { auth: false })
    .then(mapPublicBusinessFromWire);
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
  return apiClient.post<PublicBookingCreateResponse>(
    `/public/b/${encodeSlug(slug)}/bookings`,
    payload,
    { auth: false },
  );
}

export function createPublicOrder(slug: string, payload: PublicOrderCreate) {
  return apiClient.post<PublicOrderCreateResponse>(
    `/public/b/${encodeSlug(slug)}/orders`,
    payload,
    { auth: false },
  );
}
