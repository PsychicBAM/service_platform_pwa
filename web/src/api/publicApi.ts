import { apiClient } from "@/api/client";
import { mapMiniSiteConfigFromWire, type MiniSiteConfigWire } from "@/api/miniSiteApi";
import type {
  AvailabilityResponse,
  OperatingMode,
  PublicBookingCreate,
  PublicBookingCreateResponse,
  PublicBusiness,
  PublicOrderCreate,
  PublicOrderCreateResponse,
  PublicPageVariant,
  PublicService,
  ServiceType,
} from "@/types/api";

function encodeSlug(slug: string): string {
  return encodeURIComponent(slug.trim().toLowerCase());
}

export type PublicBusinessWire = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  operating_mode: OperatingMode;
  contact_phone: string | null;
  address: string | null;
  public_page_variant: PublicPageVariant;
  mini_site_config: MiniSiteConfigWire | null;
};

export function mapPublicBusinessFromWire(wire: PublicBusinessWire): PublicBusiness {
  return {
    id: wire.id,
    name: wire.name,
    slug: wire.slug,
    description: wire.description,
    logo_url: wire.logo_url,
    operating_mode: wire.operating_mode,
    contact_phone: wire.contact_phone,
    address: wire.address,
    public_page_variant: wire.public_page_variant,
    miniSiteConfig: wire.mini_site_config
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
