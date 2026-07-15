import { hasStandardPublicLocation } from "@/lib/publicLocation";
import type {
  AdminServiceRead,
  BusinessAdminRead,
  ScheduleRead,
} from "@/types/api";

export type AdminOnboardingItemId =
  | "services"
  | "location"
  | "cover"
  | "hours"
  | "preview"
  | "share";

export type AdminOnboardingItem = {
  id: AdminOnboardingItemId;
  label: string;
  description: string;
  complete: boolean;
  href?: string;
  action?: "copy-public-link";
};

export function hasAdminWorkingHoursConfigured(
  schedule: ScheduleRead | null | undefined,
): boolean {
  if (!schedule) {
    return false;
  }
  return schedule.working_hours.some(
    (hour) => hour.is_open && hour.opens_at != null && hour.closes_at != null,
  );
}

export function hasAdminMarketplaceCover(
  business: Pick<BusinessAdminRead, "marketplace_cover_image">,
): boolean {
  return Boolean(business.marketplace_cover_image?.url?.trim());
}

export function hasAdminPublicLocation(
  business: Pick<BusinessAdminRead, "public_location" | "address">,
): boolean {
  return hasStandardPublicLocation({
    location: business.public_location,
    address: business.address,
  });
}

export function hasAdminActiveService(services: AdminServiceRead[]): boolean {
  return services.some((service) => service.is_active);
}

export function buildAdminOnboardingItems(input: {
  business: BusinessAdminRead;
  services: AdminServiceRead[];
  schedule: ScheduleRead | null | undefined;
}): AdminOnboardingItem[] {
  const { business, services, schedule } = input;
  const hasServices = hasAdminActiveService(services);
  const hasLocation = hasAdminPublicLocation(business);
  const hasCover = hasAdminMarketplaceCover(business);
  const hasHours = hasAdminWorkingHoursConfigured(schedule);
  const publicPath = business.slug?.trim() ? `/b/${business.slug.trim()}` : undefined;
  const previewReady = hasServices && (hasLocation || hasCover || hasHours);

  return [
    {
      id: "services",
      label: "Add services",
      description: "Publish at least one active service customers can book or request.",
      complete: hasServices,
      href: "/admin/services",
    },
    {
      id: "location",
      label: "Add business location",
      description: "Help customers find you in the marketplace.",
      complete: hasLocation,
      href: "/admin/settings",
    },
    {
      id: "cover",
      label: "Upload marketplace cover",
      description: "Add a cover photo that stands out on Marketplace.",
      complete: hasCover,
      href: "/admin/settings",
    },
    {
      id: "hours",
      label: "Set working hours",
      description: "Configure when clients can book appointments.",
      complete: hasHours,
      href: "/admin/schedule",
    },
    {
      id: "preview",
      label: "Preview public page",
      description: "Check how your business looks to customers.",
      complete: previewReady,
      href: publicPath,
    },
    {
      id: "share",
      label: "Share business page",
      description: "Copy your public link to share with clients.",
      complete: Boolean(publicPath) && hasServices,
      href: publicPath,
      action: publicPath ? "copy-public-link" : undefined,
    },
  ];
}
