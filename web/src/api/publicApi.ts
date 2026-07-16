import { apiClient } from "@/api/client";
import { mapMiniSiteConfigFromWire, type MiniSiteConfigWire } from "@/api/miniSiteApi";
import type {
  AvailabilityResponse,
  OperatingMode,
  PublicBookingCreate,
  PublicBookingCreateResponse,
  PublicBusiness,
  PublicBusinessDirectoryQuery,
  PublicBusinessDirectoryResponse,
  PublicOrderCreate,
  PublicOrderCreateResponse,
  PublicPageVariant,
  PublicReviewsResponse,
  PublicService,
  PublicWaitlistCreate,
  PublicWaitlistCreateResponse,
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
  location?: import("@/lib/publicLocation").PublicBusinessLocation | null;
  average_rating?: number | null;
  review_count?: number;
  cover_image_url?: string | null;
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
    location: wire.location ?? null,
    average_rating: wire.average_rating ?? null,
    review_count: wire.review_count ?? 0,
    cover_image_url: wire.cover_image_url ?? null,
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
  );
}

export function createPublicWaitlistEntry(slug: string, payload: PublicWaitlistCreate) {
  return apiClient.post<PublicWaitlistCreateResponse>(
    `/public/b/${encodeSlug(slug)}/waitlist`,
    payload,
    { auth: false },
  );
}

export function createPublicOrder(slug: string, payload: PublicOrderCreate) {
  return apiClient.post<PublicOrderCreateResponse>(
    `/public/b/${encodeSlug(slug)}/orders`,
    payload,
  );
}

export function listPublicReviews(slug: string) {
  return apiClient.get<PublicReviewsResponse>(`/public/b/${encodeSlug(slug)}/reviews`, {
    auth: false,
  });
}

function buildDirectoryQuery(params: PublicBusinessDirectoryQuery = {}): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.location?.trim()) {
    search.set("location", params.location.trim());
  }
  if (params.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params.rating_min != null) {
    search.set("rating_min", String(params.rating_min));
  }
  if (params.bookable) {
    search.set("bookable", "true");
  }
  if (params.requests) {
    search.set("requests", "true");
  }
  if (params.reviews) {
    search.set("reviews", "true");
  }
  if (params.cover) {
    search.set("cover", "true");
  }
  if (params.sort) {
    search.set("sort", params.sort);
  }
  if (params.page != null) {
    search.set("page", String(params.page));
  }
  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listPublicBusinesses(params: PublicBusinessDirectoryQuery = {}) {
  return apiClient.get<PublicBusinessDirectoryResponse>(
    `/public/businesses${buildDirectoryQuery(params)}`,
    { auth: false },
  );
}

export function getReviewRequestContext(token: string) {
  return apiClient.get<import("@/types/api").ReviewRequestContext>(
    `/public/reviews/request/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function submitReviewRequest(
  token: string,
  payload: import("@/types/api").ReviewRequestSubmitPayload,
) {
  return apiClient.post<import("@/types/api").ReviewRead>(
    `/public/reviews/request/${encodeURIComponent(token)}`,
    payload,
    { auth: false },
  );
}
