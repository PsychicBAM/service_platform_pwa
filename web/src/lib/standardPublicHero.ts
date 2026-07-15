import { gradientForBusinessSlug } from "@/lib/businessCardMedia";
import { formatPublicLocationDisplay } from "@/lib/publicLocation";
import { resolveServiceImageCardUrl } from "@/lib/serviceImage";
import { hasServiceImage } from "@/components/ServiceImageDisplay";
import type { PublicBusiness, PublicService } from "@/types/api";

export function resolveStandardPublicCoverUrl(
  business: Pick<PublicBusiness, "cover_image_url" | "slug">,
  services: PublicService[],
): string | null {
  if (business.cover_image_url) {
    return business.cover_image_url;
  }

  for (const service of services) {
    if (hasServiceImage(service.image)) {
      return resolveServiceImageCardUrl(service.image!);
    }
  }

  return null;
}

export function standardPublicCoverGradient(slug: string): string {
  return gradientForBusinessSlug(slug);
}

export function formatStandardPublicLocation(
  business: Pick<PublicBusiness, "location" | "address">,
): string | null {
  return formatPublicLocationDisplay(business);
}

export function resolveStandardPublicRating(
  business: Pick<PublicBusiness, "average_rating" | "review_count">,
  reviewSummary?: { average_rating: number | null; review_count: number } | null,
): { averageRating: number | null; reviewCount: number } {
  const averageRating =
    business.average_rating ?? reviewSummary?.average_rating ?? null;
  const reviewCount = business.review_count ?? reviewSummary?.review_count ?? 0;
  return { averageRating, reviewCount };
}

export function partitionPublicServices(services: PublicService[]) {
  const bookingServices = services.filter((service) => service.type === "booking");
  const requestServices = services.filter((service) => service.type === "order");
  return { bookingServices, requestServices };
}
