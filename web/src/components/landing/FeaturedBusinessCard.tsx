import { Link } from "react-router-dom";
import type { PublicBusinessDirectoryItem } from "@/types/api";
import { StarRating } from "@/components/marketplace/StarRating";
import {
  gradientForBusinessSlug,
  operatingModeLabel,
  truncatePublicText,
} from "@/lib/businessCardMedia";

type FeaturedBusinessCardProps = {
  business: PublicBusinessDirectoryItem;
  badge?: "Top rated" | "Popular" | null;
};

export function FeaturedBusinessCard({ business, badge = null }: FeaturedBusinessCardProps) {
  const businessHref = `/b/${business.slug}`;
  const coverGradient = gradientForBusinessSlug(business.slug);
  const description = truncatePublicText(business.description, 90);
  const location = truncatePublicText(business.address, 36);
  const serviceChips = business.services_preview.slice(0, +2);
  const resolvedBadge =
    badge ??
    (business.average_rating != null && business.average_rating >= 4.5
      ? "Top rated"
      : business.review_count >= 10
        ? "Popular"
        : null);

  return (
    <article
      className="flex h-full min-w-[260px] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
      data-testid="featured-business-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
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
        {resolvedBadge ? (
          <span className="absolute left-3 top-3 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            {resolvedBadge}
          </span>
        ) : null}
        <span
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-slate-500 shadow-sm"
          aria-hidden="true"
        >
          ♡
        </span>
        {business.logo_url ? (
          <div className="absolute -bottom-5 left-4 h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
            <img src={business.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="absolute -bottom-5 left-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-sm font-bold text-white shadow-md">
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-7">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">{business.name}</h3>
          <StarRating rating={business.average_rating} reviewCount={business.review_count} />
          <p className="text-xs text-slate-500">
            {operatingModeLabel(business.operating_mode)}
            {location ? ` · ${location}` : ""}
          </p>
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

        <Link
          to={businessHref}
          className="mt-4 block w-full rounded-xl border-2 border-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
          data-testid="featured-business-cta"
        >
          Open business
        </Link>
      </div>
    </article>
  );
}
