export const BUSINESS_COVER_GRADIENTS = [
  "from-brand-700/80 via-brand-600/70 to-slate-700/80",
  "from-slate-700/80 via-brand-800/70 to-slate-900/80",
  "from-teal-700/80 via-brand-700/70 to-slate-800/80",
  "from-slate-600/80 via-brand-600/70 to-teal-800/80",
] as const;

export function gradientForBusinessSlug(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash + slug.charCodeAt(index)) % BUSINESS_COVER_GRADIENTS.length;
  }
  return BUSINESS_COVER_GRADIENTS[hash];
}

export function truncatePublicText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

export function operatingModeLabel(mode: "booking_only" | "orders_only" | "both"): string {
  if (mode === "booking_only") {
    return "Bookings";
  }
  if (mode === "orders_only") {
    return "Requests";
  }
  return "Bookings & requests";
}
