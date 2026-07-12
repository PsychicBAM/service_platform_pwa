import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import {
  hasServiceImage,
  ServiceCardImageArea,
} from "@/components/ServiceImageDisplay";
import { TypeBadge } from "@/components/TypeBadge";
import { getThemedServiceCardPresentation } from "@/lib/miniSiteTemplatePresentation";
import type { PublicService } from "@/types/api";
import type { MiniSiteBackgroundStyle, MiniSiteButtonStyle, MiniSiteTemplate } from "@/types/miniSite";
import {
  formatDuration,
  serviceActionLabel,
  serviceTypeIcon,
} from "@/utils/format";

export type MiniSiteServiceCardTheme = {
  template: MiniSiteTemplate;
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

type ServiceCardProps = {
  slug: string;
  service: PublicService;
  miniSiteTheme?: MiniSiteServiceCardTheme;
};

function stripPaddingClasses(className: string): string {
  return className.replace(/\bp-\S+/g, "").replace(/\s+/g, " ").trim();
}

export function ServiceCard({ slug, service, miniSiteTheme }: ServiceCardProps) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > 120
      ? `${service.description.slice(0, 120).trim()}…`
      : service.description
    : null;

  const themed = miniSiteTheme
    ? getThemedServiceCardPresentation(
        miniSiteTheme.template,
        miniSiteTheme.backgroundStyle,
        miniSiteTheme.buttonStyle,
      )
    : null;

  const shellClass = themed
    ? stripPaddingClasses(themed.cardClass)
    : "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const contentClass = themed ? "p-4" : "p-4";
  const titleClass = themed?.titleClass ?? "text-base font-semibold text-slate-900 break-words";
  const descriptionClass = themed?.descriptionClass ?? "mt-1 text-sm text-slate-600";
  const metaClass = themed?.metaClass ?? "text-sm text-slate-500";
  const buttonClass =
    themed?.buttonClass ??
    "block rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700";
  const iconWrapClass = themed?.iconWrapClass ?? "";

  const cardStyle = miniSiteTheme
    ? {
        borderColor:
          miniSiteTheme.template === "service"
            ? miniSiteTheme.primaryColor
            : miniSiteTheme.template === "clinic"
              ? `${miniSiteTheme.accentColor}55`
              : miniSiteTheme.template === "clean"
                ? `${miniSiteTheme.accentColor}30`
                : undefined,
        backgroundColor:
          miniSiteTheme.template === "service" ? `${miniSiteTheme.primaryColor}08` : undefined,
      }
    : undefined;

  const buttonStyle = miniSiteTheme
    ? themed?.buttonVariant === "outline"
      ? {
          borderColor: miniSiteTheme.primaryColor,
          color: miniSiteTheme.primaryColor,
          backgroundColor: "transparent",
        }
      : { backgroundColor: miniSiteTheme.primaryColor, borderColor: miniSiteTheme.primaryColor }
    : undefined;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden ${shellClass}`}
      style={cardStyle}
      data-testid="service-card"
    >
      <ServiceCardImageArea image={service.image} alt={service.name} />

      <div className={`flex flex-1 flex-col ${contentClass}`}>
        <div className="flex items-start gap-3">
          {!hasServiceImage(service.image) ? (
            <span className={`text-2xl ${iconWrapClass}`} aria-hidden>
              {serviceTypeIcon(service.type)}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={titleClass}>{service.name}</h2>
              <TypeBadge type={service.type} />
            </div>
            {descriptionPreview ? <p className={descriptionClass}>{descriptionPreview}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PriceLabel service={service} />
              {duration ? <span className={metaClass}>{duration}</span> : null}
            </div>
          </div>
        </div>

        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-auto pt-4 ${buttonClass}`}
          style={buttonStyle}
          data-testid="service-card-cta"
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}
