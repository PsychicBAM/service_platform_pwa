import { hasStandardPublicLocation } from "@/lib/publicLocation";
import { resolveStandardPublicRating } from "@/lib/standardPublicHero";
import type { PublicBusiness } from "@/types/api";

type StandardPublicBusinessQuickInfoProps = {
  business: PublicBusiness;
  hasBookingServices: boolean;
  hasRequestServices: boolean;
  reviewSummary?: { average_rating: number | null; review_count: number } | null;
};

type QuickInfoItem = {
  key: string;
  label: string;
  value: string;
};

export function StandardPublicBusinessQuickInfo({
  business,
  hasBookingServices,
  hasRequestServices,
  reviewSummary,
}: StandardPublicBusinessQuickInfoProps) {
  const { averageRating, reviewCount } = resolveStandardPublicRating(business, reviewSummary);
  const hasLocation = hasStandardPublicLocation(business);

  const items: QuickInfoItem[] = [];

  if (hasBookingServices) {
    items.push({ key: "bookable", label: "Bookable online", value: "Yes" });
  }
  if (hasRequestServices) {
    items.push({ key: "requests", label: "Accepts requests", value: "Yes" });
  }
  if (averageRating != null && reviewCount > 0) {
    items.push({
      key: "rating",
      label: "Rating",
      value: `${averageRating.toFixed(1)} ★ (${reviewCount})`,
    });
  }
  if (hasLocation) {
    items.push({ key: "location", label: "Location", value: "Available" });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
      data-testid="standard-public-quick-info"
    >
      <h2 className="text-base font-semibold text-slate-900 md:text-xl">Quick info</h2>
      <dl className="mt-3 space-y-2 md:mt-4 md:space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
            data-testid={`standard-public-quick-info-${item.key}`}
          >
            <dt className="text-sm text-slate-600">{item.label}</dt>
            <dd className="text-sm font-semibold text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
