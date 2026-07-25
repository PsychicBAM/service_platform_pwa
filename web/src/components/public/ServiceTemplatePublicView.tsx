import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import { ServiceCardImageArea } from "@/components/ServiceImageDisplay";
import { TypeBadge } from "@/components/TypeBadge";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import { getVisibleSocialLinks } from "@/lib/miniSiteConfig";
import { getTemplateImageSlots } from "@/lib/miniSiteMedia";
import { getTemplateVideoSlots, isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";
import {
  getEnabledServiceSections,
  orderPublicServicesBySelection,
  resolveServicePresetVisuals,
  getServiceTemplateContent,
  buildServiceTypographyCss,
  buildServiceTypographyCssVars,
  resolveServiceTypography,
  tokenTextClass,
} from "@/lib/serviceTemplateConfig";
import { formatPublicLocationDisplay } from "@/lib/publicLocation";
import { formatDuration } from "@/utils/format";
import type {
  PublicBusiness,
  PublicReviewItem,
  PublicReviewSummary,
  PublicService,
} from "@/types/api";
import type { MiniSiteConfig } from "@/types/miniSite";
import type { ServiceCtaAction } from "@/types/serviceTemplate";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";

export type ServicePreviewDevice = "desktop" | "tablet" | "mobile";

export type ServiceTemplatePublicViewProps = {
  business: PublicBusiness;
  publicSlug: string;
  services?: PublicService[];
  config: MiniSiteConfig;
  reviews?: PublicReviewItem[];
  reviewSummary?: PublicReviewSummary | null;
  variant?: "full" | "preview";
  /** Admin live-preview device frame — overrides viewport breakpoints inside narrow frames. */
  previewDevice?: ServicePreviewDevice;
  testIdPrefix?: string;
};

function buttonRadius(style: MiniSiteConfig["theme"]["buttonStyle"]) {
  return style === "pill" ? "rounded-full" : style === "square" ? "rounded-none" : "rounded-2xl";
}

function whatsappHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://wa.me/${value.replace(/\D/g, "")}`;
}

/** Pick grid classes for public page vs fixed admin preview frames. */
function deviceGrid(
  previewDevice: ServicePreviewDevice | undefined,
  layouts: { mobile: string; tablet: string; desktop: string; responsive: string },
): string {
  if (previewDevice === "mobile") return layouts.mobile;
  if (previewDevice === "tablet") return layouts.tablet;
  if (previewDevice === "desktop") return layouts.desktop;
  return layouts.responsive;
}

function sectionSurfaceClass(
  base: string,
  _isDarkPage: boolean,
  _kind: "main" | "alt",
): string {
  return base;
}

function howItWorksSurface(
  style: "light" | "soft" | "dark",
  visuals: { sectionAltClass: string; sectionMainClass: string; alternateSectionBg: string },
  isDarkPage: boolean,
): string {
  if (isDarkPage || style === "dark") return visuals.sectionAltClass;
  if (style === "soft") return visuals.alternateSectionBg || visuals.sectionAltClass;
  return visuals.sectionMainClass;
}

function ServiceIntroVideoBlock({
  media,
  variant,
  testId,
  primaryColor,
  surfaceMode,
}: {
  media: MiniSiteVideoMedia;
  variant: "full" | "preview";
  testId: string;
  primaryColor: string;
  surfaceMode: "light" | "dark";
}) {
  const [playing, setPlaying] = useState(false);
  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) return null;

  if (playing) {
    return (
      <div className="mt-8 max-w-xl" data-testid={testId}>
        <MiniSiteVideoEmbed media={media} variant={variant} testId={`${testId}-embed`} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`mt-8 inline-flex items-center gap-3 rounded-full border px-5 py-3 text-left text-sm font-semibold shadow-sm transition ${
        surfaceMode === "dark"
          ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
          : "border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
      }`}
      data-testid={testId}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      >
        ▶
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Watch intro</span>
        <span className="block">{media.title || "Play introduction video"}</span>
      </span>
    </button>
  );
}

export function ServiceTemplatePublicView({
  business,
  publicSlug,
  services,
  config,
  reviews = [],
  reviewSummary = null,
  variant = "full",
  previewDevice,
  testIdPrefix = "service-site",
}: ServiceTemplatePublicViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    getServiceTemplateContent(config).faq.defaultOpenId,
  );
  const content = getServiceTemplateContent(config);
  const { theme, socialLinks } = config;
  const visuals = resolveServicePresetVisuals(content.themePreset, theme.backgroundStyle);
  const typography = resolveServiceTypography(content.typography);
  const typographyRootId = `${testIdPrefix}-root`;
  const isDarkPage = visuals.surfaceMode === "dark";
  const images = getTemplateImageSlots(config.templateMedia, "service");
  const videos = getTemplateVideoSlots(config.templateMedia, "service");
  const introVideo = videos.introVideo ?? null;
  const visibleSections = getEnabledServiceSections(content);
  const orderedServices = orderPublicServicesBySelection(
    services,
    content.servicesCatalog.selectedServiceIds,
  );
  const isPreview = variant === "preview";
  const radius = buttonRadius(theme.buttonStyle);
  const heroIsLight = visuals.heroText.includes("slate-900");
  const heroTextClass = tokenTextClass(typography.heroHeadingColor, visuals.heroText);
  const heroMutedClass = tokenTextClass(typography.heroBodyColor, visuals.heroMutedText);
  const bodyTextClass = tokenTextClass(typography.bodyColor, visuals.bodyText);
  const sectionHeadingClass = tokenTextClass(typography.headingColor, visuals.bodyText);
  const mutedTextClass = typography.mutedColor
    ? "service-typo-muted"
    : `${visuals.mutedText} service-typo-muted`;
  const cardTitleClass = typography.cardTextColor
    ? "min-w-0 break-words service-typo-card"
    : `${visuals.cardText} min-w-0 break-words service-typo-card`;
  const mutedStyle: CSSProperties | undefined = typography.mutedColor
    ? { color: typography.mutedColor }
    : undefined;
  const headingStyle: CSSProperties = {
    fontFamily: typography.headingFontFamily,
    fontWeight: typography.headingWeight,
    ...(typography.headingColor ? { color: typography.headingColor } : {}),
  };
  const cardTextStyle: CSSProperties | undefined = typography.cardTextColor
    ? { color: typography.cardTextColor }
    : undefined;
  const ghostButtonClass = visuals.secondaryButtonBg;
  const phone = business.contact_phone?.trim() || "";
  const location = formatPublicLocationDisplay(business);
  const whatsapp = getVisibleSocialLinks(socialLinks).find((entry) => entry.key === "whatsapp")?.value;
  const servicesHref = `/b/${publicSlug}/services`;
  const firstOrder =
    orderedServices.find((service) => service.type === "order") ??
    services?.find((service) => service.type === "order");

  const actionHref = (action: ServiceCtaAction) => {
    if (action === "request") {
      return firstOrder ? `/b/${publicSlug}/services/${firstOrder.id}/request` : servicesHref;
    }
    if (action === "call") return phone ? `tel:${phone}` : servicesHref;
    if (action === "whatsapp") return whatsapp ? whatsappHref(whatsapp) : servicesHref;
    return servicesHref;
  };

  const renderAction = (
    label: string,
    action: ServiceCtaAction,
    primary = true,
    testId?: string,
    secondaryClass = ghostButtonClass,
  ) => {
    if (!label.trim()) return null;
    const href = actionHref(action);
    const className = `${radius} ${ctaWidthClass} inline-flex min-h-[48px] items-center justify-center px-6 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      primary
        ? `${tokenTextClass(typography.buttonTextColor, visuals.primaryButtonText)} shadow-lg shadow-black/10 hover:brightness-110`
        : secondaryClass
    }`;
    const style: CSSProperties = {
      fontFamily: typography.buttonFontFamily,
      fontWeight: typography.buttonWeight,
      ...(primary
        ? {
            backgroundColor: theme.primaryColor,
            ...(typography.buttonTextColor ? { color: typography.buttonTextColor } : {}),
          }
        : typography.buttonTextColor
          ? { color: typography.buttonTextColor }
          : {}),
    };
    if (isPreview) {
      return (
        <button
          type="button"
          disabled
          className={className}
          style={style}
          data-testid={testId}
          data-service-button="true"
        >
          {label}
        </button>
      );
    }
    if (href.startsWith("tel:") || href.startsWith("http")) {
      return (
        <a
          href={href}
          className={className}
          style={style}
          data-testid={testId}
          data-service-button="true"
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        to={href}
        className={className}
        style={style}
        data-testid={testId}
        data-service-button="true"
      >
        {label}
      </Link>
    );
  };

  const reviewCards = [
    ...(content.reviews.source !== "custom"
      ? reviews.map((review) => ({
          id: review.id,
          name: review.customer_name,
          quote: review.comment,
          rating: review.rating,
          service: review.service_name,
        }))
      : []),
    ...(content.reviews.source !== "approved"
      ? content.reviews.customTestimonials.map((review) => ({
          id: review.id,
          name: review.name,
          quote: review.quote,
          rating: review.rating,
          service: undefined as string | undefined,
        }))
      : []),
  ]
    .filter((review) => review.quote)
    .slice(0, content.reviews.maxCount);

  const averageRating = reviewSummary?.average_rating ?? business.average_rating ?? null;
  const sectionClass = isPreview
    ? "px-4 py-9"
    : "px-5 py-16 sm:px-6 md:px-10 md:py-24 lg:py-28";
  const maxClass = isPreview ? "mx-auto max-w-5xl" : "mx-auto max-w-6xl";
  const cardSurface = `${visuals.cardClass} shadow-sm ring-1 ring-black/[0.04]`;
  const isMobileFrame = previewDevice === "mobile";
  const ctaWidthClass = isMobileFrame || !previewDevice ? "w-full sm:w-auto" : "";

  const previewLink = (label: string, href: string, className = "") =>
    isPreview ? (
      <span className={className}>{label}</span>
    ) : (
      <a href={href} className={className}>
        {label}
      </a>
    );

  const navLinks = [
    { id: "services", label: "Services" },
    { id: "how-it-works", label: "How it works" },
    { id: "pricing", label: "Pricing" },
    { id: "reviews", label: "Reviews" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact" },
  ].filter((link) => {
    const map: Record<string, string> = {
      services: "services",
      "how-it-works": "how-it-works",
      pricing: "pricing",
      reviews: "reviews",
      faq: "faq",
      contact: "contact",
    };
    return visibleSections.includes(map[link.id] as (typeof visibleSections)[number]);
  });

  const renderServices = () => (
    <section
      id="services"
      className={`${sectionClass} ${sectionSurfaceClass(visuals.sectionMainClass, isDarkPage, "main")}`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={maxClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p
              className="text-xs font-bold uppercase tracking-[0.22em]"
              style={{ color: theme.primaryColor }}
            >
              Our expertise
            </p>
            <h2
              className={`service-typo-heading mt-3 text-[clamp(1.75rem,4vw,3rem)] font-black tracking-tight ${sectionHeadingClass}`}
              style={headingStyle}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {content.servicesCatalog.title}
            </h2>
            <p
              className={`mt-4 text-base leading-relaxed md:text-lg ${mutedTextClass}`}
              style={mutedStyle}
              data-testid={`${testIdPrefix}-services-subtitle`}
            >
              {content.servicesCatalog.subtitle}
            </p>
          </div>
          {!isPreview && orderedServices.length > 0 ? (
            <Link
              to={servicesHref}
              className={`shrink-0 text-sm font-semibold transition hover:opacity-80 ${mutedTextClass}`}
              style={{ color: theme.primaryColor }}
              data-testid={`${testIdPrefix}-services-view-all`}
            >
              View all services →
            </Link>
          ) : null}
        </div>

        {images.serviceImage ? (
          <div
            className={`mt-8 overflow-hidden ${cardSurface} ${radius}`}
            data-testid={`${testIdPrefix}-template-serviceImage`}
          >
            <MiniSiteSectionAccentImage
              media={images.serviceImage}
              variant={variant}
              testId={`${testIdPrefix}-template-serviceImage-media`}
              tone="service"
              layout="banner"
              className="aspect-[21/9] w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
            />
          </div>
        ) : null}

        {orderedServices.length ? (
          <div
            className={`mt-10 grid items-stretch gap-5 sm:gap-6 ${deviceGrid(previewDevice, {
              mobile: "grid-cols-1",
              tablet: "grid-cols-2",
              desktop:
                content.servicesCatalog.desktopColumns === 2
                  ? "grid-cols-2"
                  : content.servicesCatalog.desktopColumns === 4
                    ? "grid-cols-4"
                    : "grid-cols-3",
              responsive:
                content.servicesCatalog.desktopColumns === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : content.servicesCatalog.desktopColumns === 4
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            })}`}
            data-testid={`${testIdPrefix}-services-grid`}
          >
            {orderedServices.map((service) => {
              const duration = formatDuration(service.duration_minutes);
              const serviceHref =
                service.type === "order"
                  ? `/b/${publicSlug}/services/${service.id}/request`
                  : `/b/${publicSlug}/services/${service.id}`;
              const compact =
                content.servicesCatalog.mobileStyle === "compact_list" &&
                (previewDevice === "mobile" || !previewDevice);
              return (
                <article
                  key={service.id}
                  className={`group flex h-full min-h-[280px] min-w-0 overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-md ${cardSurface} ${radius} ${
                    compact
                      ? "flex-row gap-3 p-3.5 md:flex-col md:gap-0 md:p-0"
                      : "flex-col"
                  }`}
                  data-testid={`${testIdPrefix}-service-card`}
                >
                  {content.servicesCatalog.showImage ? (
                    service.image ? (
                      <ServiceCardImageArea
                        image={service.image}
                        alt={service.name}
                        aspectClassName={
                          compact
                            ? "h-20 w-20 shrink-0 rounded-xl md:h-auto md:w-full md:rounded-none md:aspect-[16/10]"
                            : "aspect-[16/10] w-full shrink-0"
                        }
                      />
                    ) : (
                      <div
                        className={`flex shrink-0 items-center justify-center ${
                          compact
                            ? "h-20 w-20 rounded-xl md:aspect-[16/10] md:h-auto md:w-full md:rounded-none"
                            : "aspect-[16/10] w-full"
                        }`}
                        style={{
                          background: `linear-gradient(145deg, ${theme.primaryColor}28, ${theme.accentColor}40)`,
                        }}
                        data-testid={`${testIdPrefix}-service-card-fallback`}
                        aria-hidden="true"
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black shadow-sm ${visuals.primaryButtonText}`}
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {service.name.charAt(0)}
                        </span>
                      </div>
                    )
                  ) : null}
                  <div
                    className={`flex min-h-0 min-w-0 flex-1 flex-col ${
                      compact ? "md:p-6" : "p-5 sm:p-6"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-lg font-bold leading-snug ${cardTitleClass}`}
                        style={cardTextStyle}
                        data-service-card-text="true"
                      >
                        {service.name}
                      </h3>
                      {content.servicesCatalog.showCategory && (service.category || service.type) ? (
                        <TypeBadge type={service.type} />
                      ) : null}
                    </div>
                    {content.servicesCatalog.showDescription && service.description ? (
                      <p
                        className={`mt-3 line-clamp-3 flex-1 text-sm leading-relaxed ${
                          typography.mutedColor ? "service-typo-muted" : visuals.cardMutedText
                        }`}
                        style={mutedStyle}
                      >
                        {service.description}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      {content.servicesCatalog.showPrice ? (
                        <span
                          className="text-base font-semibold"
                          style={
                            typography.accentTextColor
                              ? { color: typography.accentTextColor }
                              : typography.cardTextColor
                                ? { color: typography.cardTextColor }
                                : undefined
                          }
                          data-testid={`${testIdPrefix}-service-price`}
                        >
                          <PriceLabel service={service} />
                        </span>
                      ) : null}
                      {content.servicesCatalog.showDuration && duration ? (
                        <span
                          className={`text-xs font-semibold ${
                            typography.mutedColor ? "service-typo-muted" : visuals.cardMutedText
                          }`}
                          style={mutedStyle}
                        >
                          {duration}
                        </span>
                      ) : null}
                    </div>
                    {isPreview ? (
                      <button
                        disabled
                        className={`service-typo-button ${radius} ${tokenTextClass(
                          typography.buttonTextColor,
                          visuals.primaryButtonText,
                        )} mt-auto w-full px-3 py-3 text-sm font-bold`}
                        style={{
                          backgroundColor: theme.primaryColor,
                          fontFamily: typography.buttonFontFamily,
                          fontWeight: typography.buttonWeight,
                          ...(typography.buttonTextColor
                            ? { color: typography.buttonTextColor }
                            : {}),
                        }}
                        data-service-button="true"
                      >
                        {content.servicesCatalog.buttonLabel}
                      </button>
                    ) : (
                      <Link
                        to={serviceHref}
                        className={`service-typo-button ${radius} ${tokenTextClass(
                          typography.buttonTextColor,
                          visuals.primaryButtonText,
                        )} mt-auto block w-full px-3 py-3 text-center text-sm font-bold`}
                        style={{
                          backgroundColor: theme.primaryColor,
                          fontFamily: typography.buttonFontFamily,
                          fontWeight: typography.buttonWeight,
                          ...(typography.buttonTextColor
                            ? { color: typography.buttonTextColor }
                            : {}),
                        }}
                        data-service-button="true"
                      >
                        {content.servicesCatalog.buttonLabel}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            className={`mt-10 rounded-2xl border border-dashed px-6 py-12 text-center ${
              isDarkPage ? "border-slate-600 bg-slate-900/40" : "border-slate-300 bg-slate-50/80"
            }`}
            data-testid={`${testIdPrefix}-services-empty`}
          >
            <p className={`text-base font-semibold ${bodyTextClass}`}>No services listed yet</p>
            <p className={`mx-auto mt-2 max-w-md text-sm ${mutedTextClass}`}>
              Active services from Admin → Services will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  );

  const renderSection = (id: (typeof visibleSections)[number]) => {
    switch (id) {
      case "hero":
        return (
          <header
            id="top"
            className={`relative overflow-hidden ${visuals.heroClass}`}
            data-testid={`${testIdPrefix}-hero`}
          >
            {images.heroImage ? (
              <>
                <div className="absolute inset-0 opacity-40">
                  <MiniSiteSectionAccentImage
                    media={images.heroImage}
                    variant={variant}
                    testId={`${testIdPrefix}-template-heroImage`}
                    tone="service"
                    layout="banner"
                    className="h-full border-0 bg-transparent [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-center"
                  />
                </div>
                <div
                  className={`absolute inset-0 ${
                    heroIsLight
                      ? "bg-gradient-to-r from-white via-white/90 to-white/55"
                      : "bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/25"
                  }`}
                  data-testid={`${testIdPrefix}-hero-overlay`}
                  aria-hidden="true"
                />
              </>
            ) : null}
            <div
              className={`relative ${maxClass} ${
                isPreview
                  ? "p-5"
                  : "px-5 pb-16 pt-5 sm:px-6 sm:pb-20 md:px-10 md:pb-28 md:pt-7"
              }`}
            >
              <div
                className={`flex items-center justify-between gap-4 border-b pb-4 md:pb-5 ${
                  heroIsLight ? "border-slate-900/10" : "border-white/15"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt=""
                      className="h-11 w-11 rounded-xl object-cover shadow-sm"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${visuals.primaryButtonText}`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {business.name.charAt(0)}
                    </span>
                  )}
                  <span className={`truncate text-base font-bold md:text-lg ${heroTextClass}`}>
                    {business.name}
                  </span>
                </div>
                {!isPreview ? (
                  <nav
                    className={`hidden items-center gap-6 text-sm font-semibold lg:flex ${
                      heroIsLight ? "text-slate-700" : "text-white/80"
                    }`}
                    aria-label="Main navigation"
                  >
                    {navLinks.map((link) => (
                      <a key={link.id} href={`#${link.id}`} className="transition hover:opacity-70">
                        {link.label}
                      </a>
                    ))}
                  </nav>
                ) : null}
              </div>
              <p
                className="mt-10 text-xs font-bold uppercase tracking-[0.22em] sm:mt-12 md:mt-16"
                style={{ color: theme.primaryColor }}
                data-testid={`${testIdPrefix}-hero-badge`}
              >
                {content.hero.eyebrow || config.copy.heroBadgeText}
              </p>
              <h1
                className={`service-typo-heading mt-4 max-w-4xl text-[clamp(1.65rem,4.6vw,3.75rem)] font-black leading-[1.12] tracking-tight break-words ${heroTextClass}`}
                data-testid={`${testIdPrefix}-hero-title`}
                data-service-hero-heading="true"
                style={{
                  fontFamily: typography.headingFontFamily,
                  fontWeight: typography.headingWeight,
                  ...(typography.heroHeadingColor
                    ? { color: typography.heroHeadingColor }
                    : {}),
                }}
              >
                {content.hero.headline}{" "}
                <span
                  className="service-typo-accent"
                  data-service-accent-text="true"
                  data-testid={`${testIdPrefix}-hero-accent`}
                  style={{
                    color: typography.accentTextColor ?? theme.primaryColor,
                  }}
                >
                  {content.hero.headlineHighlight}
                </span>
              </h1>
              <p
                className={`mt-5 max-w-2xl text-base leading-relaxed sm:mt-6 md:text-xl ${heroMutedClass}`}
                data-testid={`${testIdPrefix}-hero-subtitle`}
                data-service-hero-body="true"
                style={
                  typography.heroBodyColor ? { color: typography.heroBodyColor } : undefined
                }
              >
                {content.hero.subtitle}
              </p>
              <p className="sr-only" data-testid={`${testIdPrefix}-hero-body`}>
                {content.hero.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5 sm:mt-8">
                {content.hero.trustBadges.map((badge) => (
                  <span
                    key={badge.id}
                    className={`${radius} border px-3.5 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm ${
                      typography.mutedColor || typography.bodyColor
                        ? heroIsLight
                          ? "border-slate-900/10 bg-white/85"
                          : "border-white/15 bg-white/10"
                        : heroIsLight
                          ? "border-slate-900/10 bg-white/85 text-slate-700"
                          : "border-white/15 bg-white/10 text-white"
                    }`}
                    style={
                      typography.mutedColor
                        ? { color: typography.mutedColor }
                        : typography.bodyColor
                          ? { color: typography.bodyColor }
                          : undefined
                    }
                    data-testid={`${testIdPrefix}-trust-badge`}
                  >
                    ✓ {badge.label}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
                {renderAction(
                  content.hero.primaryCtaLabel,
                  content.hero.primaryCtaAction,
                  true,
                  `${testIdPrefix}-book-cta`,
                )}
                {renderAction(
                  content.hero.secondaryCtaLabel,
                  content.hero.secondaryCtaAction,
                  false,
                  `${testIdPrefix}-request-cta`,
                )}
                {content.hero.showCallButton && phone ? renderAction("Call", "call", false) : null}
                {content.hero.showWhatsappButton && whatsapp
                  ? renderAction("WhatsApp", "whatsapp", false)
                  : null}
              </div>
              <p className={`mt-6 text-sm sm:mt-7 ${heroMutedClass}`}>
                ★ {averageRating ? `${averageRating.toFixed(1)} rating` : content.hero.ratingLine}
              </p>
              <div
                className={`mt-10 grid max-w-4xl gap-px overflow-hidden border shadow-lg ${radius} ${visuals.statsClass} ${
                  heroIsLight || isDarkPage ? "border-black/5" : "border-white/10"
                } ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-2",
                  tablet: "grid-cols-4",
                  desktop: "grid-cols-4",
                  responsive: "grid-cols-2 md:grid-cols-4",
                })}`}
              >
                {content.hero.stats.map((stat) => (
                  <div
                    key={stat.id}
                    className={`p-4 sm:p-5 ${heroIsLight || isDarkPage ? "bg-black/[0.03]" : "bg-white/5"}`}
                    data-testid={`${testIdPrefix}-hero-stat`}
                  >
                    <p
                      className="text-xl font-black tracking-tight sm:text-2xl md:text-3xl"
                      data-service-stat-value="true"
                      data-testid={`${testIdPrefix}-hero-stat-value`}
                      style={{
                        color: typography.statValueColor ?? theme.primaryColor,
                        fontFamily: typography.headingFontFamily,
                      }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className={`mt-1.5 text-xs leading-snug md:text-sm ${
                        typography.statLabelColor ? "" : heroMutedClass
                      }`}
                      data-service-stat-label="true"
                      data-testid={`${testIdPrefix}-hero-stat-label`}
                      style={
                        typography.statLabelColor
                          ? { color: typography.statLabelColor }
                          : undefined
                      }
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              {introVideo ? (
                <ServiceIntroVideoBlock
                  media={introVideo}
                  variant={variant}
                  testId={`${testIdPrefix}-template-introVideo`}
                  primaryColor={theme.primaryColor}
                  surfaceMode={heroIsLight ? "light" : "dark"}
                />
              ) : null}
            </div>
          </header>
        );
      case "services":
        return renderServices();
      case "how-it-works":
        return (
          <section
            id="how-it-works"
            className={`${sectionClass} ${howItWorksSurface(content.howItWorks.backgroundStyle, visuals, isDarkPage)}`}
            data-testid={`${testIdPrefix}-how-it-works`}
            data-section-bg={content.howItWorks.backgroundStyle}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                The process
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-how-it-works-title`}
              >
                {content.howItWorks.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.howItWorks.subtitle}
              </p>
              <div
                className={`relative mt-10 grid gap-4 sm:gap-5 ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-2",
                  desktop: "grid-cols-4",
                  responsive: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
                })}`}
              >
                {content.howItWorks.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`relative min-w-0 ${cardSurface} ${radius} p-5 sm:p-6`}
                    data-testid={`${testIdPrefix}-how-step`}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black shadow-sm"
                      style={{
                        backgroundColor: `${theme.primaryColor}22`,
                        color: theme.primaryColor,
                      }}
                    >
                      {content.howItWorks.showNumbering
                        ? String(index + 1).padStart(2, "0")
                        : "✦"}
                    </span>
                    <h3
                      className={`mt-5 text-lg font-bold leading-snug ${cardTitleClass}`}
                      style={cardTextStyle}
                      data-service-card-text="true"
                    >
                      {step.title}
                    </h3>
                    <p className={`mt-2.5 text-sm leading-relaxed ${mutedTextClass}`} style={mutedStyle}>
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case "why-choose-us": {
        const image = images.whyChooseUsImage ?? null;
        return (
          <section
            id="why-choose-us"
            className={`${sectionClass} ${sectionSurfaceClass(visuals.sectionMainClass, isDarkPage, "main")}`}
            data-testid={`${testIdPrefix}-why-choose-us`}
          >
            <div
              className={`${maxClass} grid items-center gap-10 sm:gap-12 lg:gap-16 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-2",
                responsive: "grid-cols-1 md:grid-cols-2",
              })} ${
                content.whyChooseUs.layout === "image_left" ? "md:[&>:first-child]:order-2" : ""
              }`}
            >
              <div className="min-w-0">
                <p
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.primaryColor }}
                >
                  {content.whyChooseUs.subtitle}
                </p>
                <h2
                  className={`service-typo-heading mt-3 text-[clamp(1.75rem,3.5vw,3rem)] font-black leading-tight ${sectionHeadingClass}`}
                  style={headingStyle}
                  data-testid={`${testIdPrefix}-why-choose-us-title`}
                >
                  {content.whyChooseUs.title}
                </h2>
                <p
                  className={`mt-5 max-w-xl text-base leading-relaxed md:text-lg ${mutedTextClass}`}
                  style={mutedStyle}
                >
                  {content.whyChooseUs.description}
                </p>
                <ul
                  className={`mt-8 grid gap-3 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-2",
                    responsive: "grid-cols-1 sm:grid-cols-2",
                  })}`}
                >
                  {content.whyChooseUs.benefits.map((benefit) => (
                    <li
                      key={benefit.id}
                      className={`flex gap-3 rounded-2xl border p-4 text-sm font-medium leading-snug shadow-sm ${
                        isDarkPage
                          ? "border-white/10 bg-white/5 text-slate-200"
                          : "border-slate-200/80 bg-white/80 text-slate-700"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${visuals.primaryButtonText}`}
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        ✓
                      </span>
                      {benefit.text}
                    </li>
                  ))}
                </ul>
                {content.whyChooseUs.showCta ? (
                  <div className="mt-9">
                    {renderAction(content.whyChooseUs.ctaLabel, content.whyChooseUs.ctaAction, true)}
                  </div>
                ) : null}
              </div>
              <div className={`${cardSurface} ${radius} overflow-hidden p-2 shadow-md`}>
                {image ? (
                  <MiniSiteSectionAccentImage
                    media={image}
                    variant={variant}
                    testId={`${testIdPrefix}-template-whyChooseUsImage`}
                    tone="service"
                    layout="banner"
                  />
                ) : (
                  <div
                    className="relative flex aspect-[4/3] flex-col items-center justify-center gap-3 overflow-hidden p-8 text-center"
                    style={{
                      background: `linear-gradient(145deg, ${theme.primaryColor}28 0%, ${theme.accentColor}40 48%, ${theme.primaryColor}1a 100%)`,
                    }}
                    data-testid={`${testIdPrefix}-why-choose-us-fallback`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: `radial-gradient(circle at 20% 20%, ${theme.accentColor}55, transparent 45%), radial-gradient(circle at 80% 75%, ${theme.primaryColor}40, transparent 40%)`,
                      }}
                    />
                    <span
                      className={`relative z-[1] flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black shadow-lg ${visuals.primaryButtonText}`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {business.name.charAt(0)}
                    </span>
                    <p className={`relative z-[1] text-base font-bold ${bodyTextClass}`}>
                      {business.name}
                    </p>
                    <p className={`relative z-[1] max-w-xs text-sm ${mutedTextClass}`}>
                      Trusted service, delivered with care.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }
      case "pricing":
        return (
          <section
            id="pricing"
            className={`${sectionClass} ${sectionSurfaceClass(visuals.sectionAltClass, isDarkPage, "alt")}`}
            data-testid={`${testIdPrefix}-pricing`}
          >
            <div className={maxClass}>
              <div className="max-w-2xl">
                <p
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.primaryColor }}
                >
                  Clear choices
                </p>
                <h2
                  className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                  style={headingStyle}
                  data-testid={`${testIdPrefix}-pricing-title`}
                >
                  {content.pricingPackages.title}
                </h2>
                <p className={`mt-3 text-base ${mutedTextClass}`} style={mutedStyle}>
                  {content.pricingPackages.subtitle}
                </p>
              </div>
              <div
                className={`mt-10 grid items-stretch gap-5 sm:mt-12 sm:gap-6 ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-2",
                  desktop: "grid-cols-3",
                  responsive: "grid-cols-1 md:grid-cols-3",
                })}`}
              >
                {content.pricingPackages.packages.slice(0, 3).map((pkg) => (
                  <article
                    key={pkg.id}
                    className={`relative flex h-full min-h-[400px] min-w-0 flex-col ring-1 ring-black/[0.04] ${visuals.pricingCardClass} ${radius} p-6 sm:p-7 ${
                      pkg.popular ? "z-[1] border-2 shadow-xl scale-[1.01] sm:scale-[1.02]" : "shadow-sm"
                    }`}
                    style={pkg.popular ? { borderColor: theme.primaryColor } : undefined}
                    data-testid={
                      pkg.popular
                        ? `${testIdPrefix}-pricing-popular`
                        : `${testIdPrefix}-pricing-card`
                    }
                  >
                    {pkg.popular ? (
                      <span
                        className={`${radius} ${visuals.primaryButtonText} absolute -top-3 left-6 px-3.5 py-1 text-xs font-bold shadow-sm`}
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        Most popular
                      </span>
                    ) : null}
                    <h3
                      className={`service-typo-card text-xl font-black ${
                        typography.cardTextColor ? "" : visuals.pricingCardText
                      }`}
                      style={cardTextStyle}
                      data-service-card-text="true"
                    >
                      {pkg.name}
                    </h3>
                    <p className="mt-5 text-4xl font-black tracking-tight" style={{ color: theme.primaryColor }}>
                      {pkg.price}
                      <span className={`ml-1.5 text-sm font-medium ${visuals.pricingCardMutedText}`}>
                        / {pkg.billingLabel}
                      </span>
                    </p>
                    <p className={`mt-4 text-sm leading-relaxed ${visuals.pricingCardMutedText}`}>
                      {pkg.description}
                    </p>
                    <ul className={`mt-7 flex-1 space-y-3.5 text-sm ${visuals.pricingCardText}`}>
                      {pkg.includes.map((item) => (
                        <li key={item} className="flex gap-2.5 leading-snug">
                          <span className="shrink-0 font-bold" style={{ color: theme.primaryColor }}>
                            ✓
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">{renderAction(pkg.ctaLabel, pkg.ctaAction, true)}</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      case "reviews":
        return (
          <section
            id="reviews"
            className={`${sectionClass} ${sectionSurfaceClass(visuals.sectionMainClass, isDarkPage, "main")}`}
            data-testid={`${testIdPrefix}-reviews`}
          >
            <div className={maxClass}>
              <h2
                className={`service-typo-heading text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-reviews-title`}
              >
                {content.reviews.title}
              </h2>
              <p className={`mt-3 text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.reviews.subtitle}
              </p>
              {content.reviews.showRating && averageRating ? (
                <p className={`mt-5 text-lg font-bold ${bodyTextClass}`}>
                  ★ {averageRating.toFixed(1)}{" "}
                  <span className={`text-sm font-normal ${mutedTextClass}`}>
                    from {reviewSummary?.review_count ?? business.review_count ?? 0} reviews
                  </span>
                </p>
              ) : null}
              {reviewCards.length ? (
                <div
                  className={`mt-10 grid items-stretch gap-5 sm:gap-6 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-3",
                    responsive: "grid-cols-1 md:grid-cols-3",
                  })}`}
                >
                  {reviewCards.map((review) => (
                    <figure
                      key={review.id}
                      className={`flex h-full min-w-0 flex-col ${cardSurface} ${radius} p-5 sm:p-6`}
                    >
                      <div className="flex items-center gap-3">
                        {content.reviews.showAvatar ? (
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-sm ${visuals.primaryButtonText}`}
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {review.name.charAt(0)}
                          </span>
                        ) : null}
                        <figcaption className={`font-bold ${bodyTextClass}`}>{review.name}</figcaption>
                      </div>
                      {content.reviews.showRating ? (
                        <p
                          className="mt-4 text-sm tracking-wide"
                          style={{ color: theme.primaryColor }}
                          aria-label={`${review.rating} out of 5 stars`}
                        >
                          {"★".repeat(Math.max(0, Math.min(5, review.rating)))}
                          <span className={mutedTextClass}>
                            {"☆".repeat(Math.max(0, 5 - Math.min(5, review.rating)))}
                          </span>
                        </p>
                      ) : null}
                      <blockquote className={`mt-3 flex-1 text-sm leading-relaxed ${mutedTextClass}`}>
                        “{review.quote}”
                      </blockquote>
                      {review.service ? (
                        <p className={`mt-4 text-xs font-medium ${mutedTextClass}`}>{review.service}</p>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : (
                <div
                  className={`mt-8 max-w-xl rounded-2xl border border-dashed px-5 py-6 text-left sm:px-6 ${
                    isDarkPage ? "border-slate-600/80 bg-white/[0.03]" : "border-slate-300 bg-slate-50/60"
                  }`}
                  data-testid={`${testIdPrefix}-reviews-empty`}
                >
                  <p className={`text-sm leading-relaxed ${mutedTextClass}`}>
                    Reviews will appear here after customers leave feedback.
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      case "faq":
        return (
          <section
            id="faq"
            className={`${sectionClass} ${sectionSurfaceClass(visuals.sectionAltClass, isDarkPage, "alt")}`}
            data-testid={`${testIdPrefix}-faq`}
          >
            <div className={`${maxClass} max-w-3xl`}>
              <h2
                className={`service-typo-heading text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-faq-title`}
              >
                {content.faq.title}
              </h2>
              <p className={`mt-3 text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.faq.subtitle}
              </p>
              <div
                className={`mt-8 w-full divide-y shadow-sm ring-1 ring-black/[0.04] ${
                  isDarkPage ? "divide-slate-700" : "divide-slate-200"
                } ${visuals.cardClass} ${radius} px-4 sm:px-5 md:px-6`}
              >
                {content.faq.items.map((item) => (
                  <div key={item.id} className="min-w-0">
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-bold leading-snug sm:text-base ${visuals.faqText}`}
                      onClick={() => setOpenFaqId(openFaqId === item.id ? null : item.id)}
                      aria-expanded={openFaqId === item.id}
                      disabled={isPreview}
                    >
                      <span className="min-w-0 flex-1 break-words">{item.question}</span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                          isDarkPage ? "bg-white/10" : "bg-slate-100"
                        }`}
                        style={{ color: theme.primaryColor }}
                        aria-hidden
                      >
                        {openFaqId === item.id ? "−" : "+"}
                      </span>
                    </button>
                    {openFaqId === item.id ? (
                      <p
                        className={`pb-5 pr-10 text-sm leading-relaxed md:text-base ${visuals.faqMutedText}`}
                      >
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case "contact": {
        const contactBg =
          content.contactCta.backgroundStyle === "primary"
            ? undefined
            : content.contactCta.backgroundStyle === "soft"
              ? visuals.sectionAltClass
              : visuals.ctaBg;
        const contactIsSoft = content.contactCta.backgroundStyle === "soft";
        const contactText = contactIsSoft ? visuals.bodyText : visuals.ctaText;
        const contactMuted = contactIsSoft ? visuals.mutedText : visuals.ctaMutedText;
        return (
          <section
            id="contact"
            className={`${sectionClass} ${contactBg ?? visuals.ctaBg}`}
            data-testid={`${testIdPrefix}-contact`}
            style={
              content.contactCta.backgroundStyle === "primary"
                ? { backgroundColor: theme.primaryColor }
                : undefined
            }
          >
            <div
              className={`${maxClass} grid items-center gap-10 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: images.requestImage ? "grid-cols-[1fr_240px]" : "grid-cols-1",
                desktop: images.requestImage ? "grid-cols-[1fr_320px]" : "grid-cols-1",
                responsive: images.requestImage
                  ? "grid-cols-1 lg:grid-cols-[1fr_320px]"
                  : "grid-cols-1",
              })}`}
            >
              <div className="min-w-0">
                <h2
                  className={`text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-tight ${contactText}`}
                >
                  {content.contactCta.headline}
                </h2>
                <p className={`mt-4 max-w-2xl text-base leading-relaxed md:text-lg ${contactMuted}`}>
                  {content.contactCta.subtitle}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {renderAction(
                    content.contactCta.primaryCtaLabel,
                    content.contactCta.primaryCtaAction,
                    true,
                  )}
                  {renderAction(
                    content.contactCta.secondaryCtaLabel,
                    content.contactCta.secondaryCtaAction,
                    false,
                    undefined,
                    contactIsSoft
                      ? ghostButtonClass
                      : "border border-white/35 bg-white/10 text-white hover:bg-white/20",
                  )}
                </div>
                <div
                  className={`mt-10 grid gap-3 sm:gap-4 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-3",
                    desktop: "grid-cols-3",
                    responsive: "grid-cols-1 sm:grid-cols-3",
                  })}`}
                >
                  {content.contactCta.showPhone && phone ? (
                    isPreview ? (
                      <div
                        className={`${radius} border p-5 text-sm leading-relaxed shadow-sm ${
                          contactIsSoft
                            ? "border-black/5 bg-black/[0.04]"
                            : "border-white/15 bg-white/10 text-white"
                        }`}
                      >
                        <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                          Call
                        </b>
                        <span className="mt-1.5 block text-base font-semibold">{phone}</span>
                      </div>
                    ) : (
                      <a
                        href={`tel:${phone}`}
                        className={`${radius} border p-5 text-sm leading-relaxed shadow-sm transition hover:opacity-90 ${
                          contactIsSoft
                            ? "border-black/5 bg-black/[0.04]"
                            : "border-white/15 bg-white/10 text-white"
                        }`}
                      >
                        <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                          Call
                        </b>
                        <span className="mt-1.5 block text-base font-semibold">{phone}</span>
                      </a>
                    )
                  ) : null}
                  {content.contactCta.showLocation && location ? (
                    <div
                      className={`${radius} border p-5 text-sm leading-relaxed shadow-sm ${
                        contactIsSoft
                          ? "border-black/5 bg-black/[0.04]"
                          : "border-white/15 bg-white/10 text-white"
                      }`}
                    >
                      <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                        Location
                      </b>
                      <span className="mt-1.5 block text-base font-semibold">{location}</span>
                    </div>
                  ) : null}
                  {content.contactCta.showHours ? (
                    <div
                      className={`${radius} border p-5 text-sm leading-relaxed shadow-sm ${
                        contactIsSoft
                          ? "border-black/5 bg-black/[0.04]"
                          : "border-white/15 bg-white/10 text-white"
                      }`}
                    >
                      <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                        Hours
                      </b>
                      <span className="mt-1.5 block text-base font-semibold">
                        Contact us for availability
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {images.requestImage ? (
                <div
                  className={`${radius} overflow-hidden border shadow-lg ${
                    contactIsSoft ? "border-slate-200 bg-white" : "border-white/20 bg-white/10"
                  }`}
                  data-testid={`${testIdPrefix}-template-requestImage`}
                >
                  <MiniSiteSectionAccentImage
                    media={images.requestImage}
                    variant={variant}
                    testId={`${testIdPrefix}-template-requestImage-media`}
                    tone="service"
                    layout="banner"
                  />
                </div>
              ) : null}
            </div>
          </section>
        );
      }
      case "footer":
        return (
          <footer
            className={`${visuals.footerClass} px-5 py-12 sm:px-6 md:px-10 md:py-16`}
            data-testid={`${testIdPrefix}-footer`}
          >
            <div
              className={`${maxClass} grid gap-10 sm:gap-12 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-4",
                responsive: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
              })}`}
            >
              <div className="md:col-span-1">
                <p className="text-lg font-black tracking-tight">{business.name}</p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-80">
                  {content.footer.description}
                </p>
              </div>
              {content.footer.showQuickLinks ? (
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide opacity-90">Quick links</p>
                  <div className="mt-4 grid gap-3 text-sm opacity-80">
                    {navLinks.map((link) => (
                      <span key={link.id}>
                        {previewLink(link.label, `#${link.id}`, "transition hover:opacity-100")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {content.footer.showServicesLinks ? (
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide opacity-90">Services</p>
                  <div className="mt-4 grid gap-3 text-sm opacity-80">
                    {orderedServices.slice(0, 5).map((service) =>
                      isPreview ? (
                        <span key={service.id}>{service.name}</span>
                      ) : (
                        <Link
                          key={service.id}
                          to={`/b/${publicSlug}/services/${service.id}`}
                          className="hover:opacity-100"
                        >
                          {service.name}
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              <div>
                {content.footer.showSocialLinks ? (
                  <>
                    <p className="text-sm font-bold uppercase tracking-wide opacity-90">Connect</p>
                    <div className="mt-4 grid gap-3 text-sm opacity-80">
                      {getVisibleSocialLinks(socialLinks).map((entry) => (
                        <span key={entry.key}>
                          {previewLink(
                            entry.label,
                            entry.key === "whatsapp" ? whatsappHref(entry.value) : entry.value,
                            "hover:opacity-100",
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
                {content.footer.showContactInfo && phone ? (
                  <p className="mt-6 text-sm font-medium opacity-80">{phone}</p>
                ) : null}
              </div>
            </div>
            <p className="mx-auto mt-12 max-w-6xl border-t border-current/15 pt-6 text-xs leading-relaxed opacity-60">
              {content.footer.copyrightText ||
                `© ${new Date().getFullYear()} ${business.name}. All rights reserved.`}
            </p>
          </footer>
        );
    }
  };

  return (
    <main
      data-testid={`${testIdPrefix}-layout`}
      data-service-root={typographyRootId}
      data-template="service"
      data-template-presentation="service"
      data-preset={visuals.id}
      data-mood={visuals.mood}
      data-background-style={visuals.resolvedBackgroundStyle}
      data-surface-mode={visuals.surfaceMode}
      data-preview-device={previewDevice ?? "full"}
      data-heading-font={typography.presets.headingFontPreset}
      data-body-font={typography.presets.bodyFontPreset}
      data-button-font={typography.presets.buttonFontPreset}
      data-has-heading-color={typography.headingColor ? "true" : "false"}
      data-has-hero-heading-color={typography.heroHeadingColor ? "true" : "false"}
      data-has-accent-text-color={typography.accentTextColor ? "true" : "false"}
      className={`template-service overflow-hidden ${visuals.pageShellClass}`}
      style={{
        backgroundColor: visuals.pageBg || visuals.backgroundColor,
        fontFamily: typography.bodyFontFamily,
        fontWeight: typography.bodyWeight,
        ...(typography.bodyColor ? { color: typography.bodyColor } : {}),
        ...(buildServiceTypographyCssVars(typography) as CSSProperties),
      }}
    >
      <style
        data-testid={`${testIdPrefix}-typography-style`}
        dangerouslySetInnerHTML={{
          __html: buildServiceTypographyCss(typographyRootId, typography),
        }}
      />
      {visibleSections.map((section) => (
        <div key={section}>{renderSection(section)}</div>
      ))}
    </main>
  );
}
