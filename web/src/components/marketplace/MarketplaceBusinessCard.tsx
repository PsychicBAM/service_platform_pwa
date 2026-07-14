import { Link } from "react-router-dom";
import type { PublicBusinessDirectoryItem } from "@/types/api";
import {
  gradientForBusinessSlug,
  truncatePublicText,
} from "@/lib/businessCardMedia";
import { StarRating } from "@/components/marketplace/StarRating";

type MarketplaceBusinessCardProps = {
  business: PublicBusinessDirectoryItem;
};

function formatStartsAtPrice(business: PublicBusinessDirectoryItem): string {
  if (business.starts_at_price_cents == null) {
    const hasQuote = business.services_preview.some((service) => service.price_type === "quote");
    return hasQuote ? "Price on quote" : "Contact for pricing";
  }
  if (business.starts_at_price_cents === 0) {
    return "Starts at Free";
  }
  const currency = business.starts_at_currency || "USD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(business.starts_at_price_cents / 100);
  return `Starts at ${formatted}`;
}

function truncateText(value: string | null | undefined, maxLength: number): string | null {
  return truncatePublicText(value, maxLength);
}

export function MarketplaceBusinessCard({ business }: MarketplaceBusinessCardProps) {
  const businessHref = `/b/${business.slug}`;
  const coverGradient = gradientForBusinessSlug(business.slug);
  const description = truncateText(business.description, 110);
  const location = truncateText(business.address, 48);
  const ctaLabel = business.has_booking_service ? "Book now" : "Open business";
  const serviceChips = business.services_preview.slice(0, 3);

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-testid="marketplace-business-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${coverGradient}`} aria-hidden="true" />
        )}
        {business.logo_url ? (
          <div className="absolute -bottom-5 left-4 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
            <img src={business.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="absolute -bottom-5 left-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-sm font-bold text-white shadow-md">
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-7">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">{business.name}</h3>
          <StarRating rating={business.average_rating} reviewCount={business.review_count} />
          {location ? (
            <p className="flex items-start gap-1 text-xs text-slate-500">
              <span aria-hidden="true">📍</span>
              <span>{location}</span>
            </p>
          ) : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>

        {serviceChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {serviceChips.map((service) => (
              <span
                key={service.name}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {service.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-sm font-medium text-slate-700">{formatStartsAtPrice(business)}</p>
          <Link
            to={businessHref}
            className="shrink-0 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            data-testid="marketplace-business-cta"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
