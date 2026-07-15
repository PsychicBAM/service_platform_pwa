import { Link } from "react-router-dom";
import type { PublicBusinessDirectoryItem } from "@/types/api";
import { StarRating } from "@/components/marketplace/StarRating";
import {
  gradientForBusinessSlug,
  operatingModeLabel,
  truncatePublicText,
} from "@/lib/businessCardMedia";
import { formatPublicLocationDisplay } from "@/lib/publicLocation";

const MAX_SERVICE_CHIPS = 3;

type FeaturedBusinessCardProps = {
  business: PublicBusinessDirectoryItem;
  badge?: "Top rated" | "Popular" | null;
};

export function FeaturedBusinessCard({ business, badge = null }: FeaturedBusinessCardProps) {
  const businessHref = `/b/${business.slug}`;
  const coverGradient = gradientForBusinessSlug(business.slug);
  const locationLabel = truncatePublicText(formatPublicLocationDisplay(business), 36);
  const visibleServices = business.services_preview.slice(0, MAX_SERVICE_CHIPS);
  const extraServiceCount = Math.max(0, business.services_preview.length - visibleServices.length);
  const resolvedBadge =
    badge ??
    (business.average_rating != null && business.average_rating >= 4.5
      ? "Top rated"
      : business.review_count >= 10
        ? "Popular"
        : null);

  return (
    <article
      className="flex h-full w-[min(86vw,360px)] flex-none snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:w-auto lg:max-w-none lg:flex-auto"
      data-testid="featured-business-card"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-100">
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

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-7">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-w-0 space-y-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{business.name}</h3>
            <StarRating rating={business.average_rating} reviewCount={business.review_count} />
            <p className="truncate text-xs text-slate-500">
              {operatingModeLabel(business.operating_mode)}
              {locationLabel ? ` · ${locationLabel}` : ""}
            </p>
            {business.description?.trim() ? (
              <p
                className="line-clamp-3 text-sm text-slate-600"
                data-testid="featured-business-description"
              >
                {business.description.trim()}
              </p>
            ) : null}
          </div>

          {visibleServices.length > 0 || extraServiceCount > 0 ? (
            <div
              className="mt-auto flex max-w-full flex-wrap gap-1.5 pt-3"
              data-testid="featured-business-chips"
            >
              {visibleServices.map((service) => (
                <span
                  key={service.name}
                  className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  data-testid="featured-business-chip"
                >
                  {service.name}
                </span>
              ))}
              {extraServiceCount > 0 ? (
                <span
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                  data-testid="featured-business-chip-more"
                >
                  +{extraServiceCount} more
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto" aria-hidden="true" />
          )}
        </div>

        <Link
          to={businessHref}
          className="mt-4 block w-full shrink-0 rounded-xl border-2 border-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
          data-testid="featured-business-cta"
        >
          Open business
        </Link>
      </div>
    </article>
  );
}
