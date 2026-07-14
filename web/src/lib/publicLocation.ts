import type { PublicBusinessDirectoryItem } from "@/types/api";

export interface PublicBusinessLocation {
  country: string | null;
  city: string | null;
  district_or_area: string | null;
  public_address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_note: string | null;
}

export type PublicLocationFormState = {
  country: string;
  city: string;
  district_or_area: string;
  public_address: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  location_note: string;
};

export const EMPTY_PUBLIC_LOCATION_FORM: PublicLocationFormState = {
  country: "",
  city: "",
  district_or_area: "",
  public_address: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  location_note: "",
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function publicLocationFormFromApi(
  location: PublicBusinessLocation | null | undefined,
): PublicLocationFormState {
  if (!location) {
    return { ...EMPTY_PUBLIC_LOCATION_FORM };
  }

  return {
    country: location.country ?? "",
    city: location.city ?? "",
    district_or_area: location.district_or_area ?? "",
    public_address: location.public_address ?? "",
    postal_code: location.postal_code ?? "",
    latitude: location.latitude != null ? String(location.latitude) : "",
    longitude: location.longitude != null ? String(location.longitude) : "",
    location_note: location.location_note ?? "",
  };
}

export function formatPublicLocationSummary(
  location: PublicBusinessLocation | null | undefined,
): string | null {
  if (!location) {
    return null;
  }

  return formatPublicLocationDisplay({ location, address: null });
}

export function publicLocationPayloadFromForm(form: PublicLocationFormState): PublicBusinessLocation {
  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();

  return {
    country: cleanText(form.country),
    city: cleanText(form.city),
    district_or_area: cleanText(form.district_or_area),
    public_address: cleanText(form.public_address),
    postal_code: cleanText(form.postal_code),
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    location_note: cleanText(form.location_note),
  };
}

export function validatePublicLocationForm(form: PublicLocationFormState): string | null {
  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();

  if (latitude) {
    const parsed = Number(latitude);
    if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) {
      return "Latitude must be between -90 and 90.";
    }
  }

  if (longitude) {
    const parsed = Number(longitude);
    if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) {
      return "Longitude must be between -180 and 180.";
    }
  }

  return null;
}

export function formatPublicLocationDisplay(
  business: Pick<PublicBusinessDirectoryItem, "location" | "address">,
): string | null {
  const location = business.location;
  const district = cleanText(location?.district_or_area ?? null);
  const city = cleanText(location?.city ?? null);
  const country = cleanText(location?.country ?? null);
  const publicAddress = cleanText(location?.public_address ?? null);

  if (district && city) {
    return country ? `${district}, ${city}, ${country}` : `${district}, ${city}`;
  }

  if (city && country) {
    return `${city}, ${country}`;
  }

  if (city) {
    return city;
  }

  if (district && country) {
    return `${district}, ${country}`;
  }

  if (publicAddress) {
    return publicAddress;
  }

  if (country) {
    return country;
  }

  return cleanText(business.address);
}
