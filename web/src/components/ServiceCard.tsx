import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import type { PublicService } from "@/types/api";
import {
  formatDuration,
  serviceActionLabel,
  serviceTypeIcon,
} from "@/utils/format";

type ServiceCardProps = {
  slug: string;
  service: PublicService;
};

export function ServiceCard({ slug, service }: ServiceCardProps) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > 120
      ? `${service.description.slice(0, 120).trim()}…`
      : service.description
    : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {serviceTypeIcon(service.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">{service.name}</h2>
            <TypeBadge type={service.type} />
          </div>
          {descriptionPreview ? (
            <p className="mt-1 text-sm text-slate-600">{descriptionPreview}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PriceLabel service={service} />
            {duration ? (
              <span className="text-sm text-slate-500">{duration}</span>
            ) : null}
          </div>
        </div>
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className="mt-4 block rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700"
      >
        {serviceActionLabel(service.type)}
      </Link>
    </article>
  );
}
