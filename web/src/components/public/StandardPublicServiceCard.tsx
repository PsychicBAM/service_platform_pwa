import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import {
  hasServiceImage,
  ServiceCardImageArea,
  ServiceCardNoImageArea,
} from "@/components/ServiceImageDisplay";
import type { PublicService } from "@/types/api";
import { formatDuration, serviceTypeIcon } from "@/utils/format";

const STANDARD_SERVICE_IMAGE_ASPECT = "aspect-[16/9] md:aspect-[5/3]";

type StandardPublicServiceCardProps = {
  slug: string;
  service: PublicService;
};

function standardServiceCtaLabel(type: PublicService["type"]): string {
  return type === "booking" ? "Book now" : "Request now";
}

export function StandardPublicServiceCard({ slug, service }: StandardPublicServiceCardProps) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const description = service.description?.trim() || null;
  const hasImage = hasServiceImage(service.image);

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
      data-testid="standard-public-service-card"
      data-service-type={service.type}
    >
      {hasImage ? (
        <ServiceCardImageArea
          image={service.image}
          alt={service.name}
          aspectClassName={STANDARD_SERVICE_IMAGE_ASPECT}
          testId="standard-public-service-card-image"
        />
      ) : (
        <ServiceCardNoImageArea
          aspectClassName={STANDARD_SERVICE_IMAGE_ASPECT}
          testId="standard-public-service-card-placeholder"
          className="bg-gradient-to-br from-brand-50 via-white to-slate-100"
        >
          <span className="text-xl opacity-60 md:text-2xl" aria-hidden>
            {serviceTypeIcon(service.type)}
          </span>
        </ServiceCardNoImageArea>
      )}

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-slate-900 md:text-lg">
            {service.name}
          </h3>
          <TypeBadge type={service.type} />
        </div>

        {description ? (
          <p
            className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600"
            data-testid="standard-public-service-card-description"
          >
            {description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-4">
          <PriceLabel service={service} className="text-base" />
          {duration ? (
            <span
              className="text-sm font-medium text-slate-500"
              data-testid="standard-public-service-card-duration"
            >
              {duration}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-4 md:pt-5">
          <Link
            to={`/b/${slug}/services/${service.id}`}
            className="block w-full rounded-xl bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-800"
            data-testid="standard-public-service-card-cta"
          >
            {standardServiceCtaLabel(service.type)}
          </Link>
        </div>
      </div>
    </article>
  );
}
