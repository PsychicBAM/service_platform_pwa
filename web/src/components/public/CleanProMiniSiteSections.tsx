import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { MiniSiteImageMedia, MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteTemplateVideoCard } from "@/components/public/MiniSiteTemplateMediaPresentation";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";
import type { MiniSiteBackgroundStyle, MiniSiteCopy, MiniSiteSocialLinks } from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";

export type CleanSectionVariant = "full" | "preview";

type CleanSectionShell = {
  variant?: CleanSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type CleanTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
};

function cleanMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-500";
}

function cleanHeadingText(isDark: boolean): string {
  return isDark ? "text-slate-50" : "text-slate-950";
}

function cleanBorder(isDark: boolean): string {
  return isDark ? "border-slate-700/55" : "border-slate-200/70";
}

function cleanCardShell(isDark: boolean, isPreview: boolean): string {
  const radius = isPreview ? "rounded-2xl" : "rounded-[1.75rem] md:rounded-[2rem]";
  if (isDark) {
    return `${radius} border border-slate-700/55 bg-slate-900/55 shadow-[0_20px_60px_rgba(0,0,0,0.35)]`;
  }
  return `${radius} border border-slate-200/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)]`;
}

function cleanSectionBg(isDark: boolean, tone: "hero" | "about" | "services" | "trust" | "cta" | "plain"): string {
  if (isDark) {
    switch (tone) {
      case "hero":
        return "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950";
      case "about":
        return "bg-slate-900/40";
      case "services":
        return "bg-gradient-to-b from-slate-900/60 to-slate-950";
      case "trust":
        return "bg-slate-900/30";
      case "cta":
        return "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900";
      default:
        return "";
    }
  }
  switch (tone) {
    case "hero":
      return "bg-gradient-to-br from-white via-sky-50/70 to-blue-50/50";
    case "about":
      return "bg-gradient-to-br from-sky-50/80 via-white to-white";
    case "services":
      return "bg-gradient-to-b from-sky-100/40 via-sky-50/30 to-white";
    case "trust":
      return "bg-white";
    case "cta":
      return "bg-gradient-to-br from-sky-100/50 via-white to-blue-50/40";
    default:
      return "";
  }
}

function variantSpacing(variant: CleanSectionVariant): string {
  return variant === "preview" ? "py-4" : "py-14 md:py-20";
}

function sectionContainer(variant: CleanSectionVariant): string {
  return variant === "preview" ? "px-1" : "mx-auto max-w-6xl px-4";
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book appointments and manage your visits.";
    case "orders_only":
      return "Browse services and submit requests online.";
    default:
      return "Book appointments or submit service requests in one place.";
  }
}

function CleanSectionEyebrow({
  children,
  color,
  variant,
  className = "",
  testId,
}: {
  children: ReactNode;
  color: string;
  variant: CleanSectionVariant;
  className?: string;
  testId?: string;
}) {
  return (
    <p
      className={`font-semibold uppercase tracking-[0.25em] ${
        variant === "preview" ? "text-[9px]" : "text-[10px] md:text-xs"
      } ${className}`}
      style={{ color }}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

function CleanCheckIcon({
  color,
  size,
}: {
  color: string;
  size: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-4 w-4 text-[9px]" : "h-8 w-8 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${dim}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      ✓
    </span>
  );
}

function CleanHeroImageShell({
  media,
  variant,
  testId,
  isDark,
}: {
  media: MiniSiteImageMedia;
  variant: CleanSectionVariant;
  testId: string;
  isDark: boolean;
}) {
  const isPreview = variant === "preview";
  return (
    <div
      className={`overflow-hidden ${cleanCardShell(isDark, isPreview)} ${
        isDark ? "ring-2 ring-slate-700/60" : "ring-4 ring-white/90"
      }`}
    >
      <MiniSiteSlotImage
        media={media}
        testId={testId}
        className={`w-full object-cover ${
          isPreview ? "aspect-[4/5] max-h-36" : "aspect-[4/5] max-h-[320px] md:max-h-[420px]"
        }`}
      />
    </div>
  );
}

function cleanServiceButtonClass(variant: CleanSectionVariant): string {
  return `inline-flex w-full items-center justify-center font-semibold text-white shadow-sm transition hover:brightness-[1.02] ${
    variant === "preview" ? "rounded-full px-3 py-2 text-[11px]" : "rounded-full px-5 py-2.5 text-sm"
  }`;
}

function CleanServiceCard({
  slug,
  service,
  index,
  primaryColor,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  index: number;
  primaryColor: string;
  isDark: boolean;
  variant: CleanSectionVariant;
}) {
  const isPreview = variant === "preview";
  const muted = cleanMutedText(isDark);
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (isPreview ? 70 : 110)
      ? `${service.description.slice(0, isPreview ? 70 : 110).trim()}…`
      : service.description
    : null;

  return (
    <article
      className={`flex h-full flex-col ${cleanCardShell(isDark, isPreview)} ${
        isPreview ? "gap-2 p-3" : "gap-4 p-5 md:p-6"
      } transition hover:-translate-y-0.5 hover:shadow-[0_28px_90px_rgba(15,23,42,0.12)]`}
      data-testid="service-card"
    >
      <span
        className={`font-semibold tabular-nums ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3
        className={`whitespace-normal font-bold tracking-tight ${
          isPreview ? "text-xs" : "text-lg md:text-xl"
        } ${cleanHeadingText(isDark)}`}
      >
        {service.name}
      </h3>
      {descriptionPreview ? (
        <p className={`flex-1 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
          {descriptionPreview}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className={`flex flex-wrap items-center gap-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
        <PriceLabel service={service} />
        {duration ? (
          <span
            className={`rounded-full px-2 py-0.5 ${isDark ? "bg-slate-800/70" : "bg-slate-100"}`}
          >
            {duration}
          </span>
        ) : null}
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className={`${cleanServiceButtonClass(variant)} mt-1`}
        style={{ backgroundColor: primaryColor }}
      >
        {serviceActionLabel(service.type)}
      </Link>
    </article>
  );
}

export type CleanHeroSectionProps = CleanSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: CleanTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  showHeroTrustStrip: boolean;
  operatingMode: OperatingMode;
  templateImages?: MiniSiteTemplateImages;
};

export function CleanHeroSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  business,
  heroTitle,
  heroSubtitle,
  heroBody,
  heroBadgeText,
  copy,
  theme,
  presentation,
  primaryCtaLabel,
  secondaryCtaLabel,
  primaryBookingHref,
  secondaryOrderHref,
  showBookingCta,
  showRequestCta,
  showHeroTrustStrip,
  operatingMode,
  templateImages,
}: CleanHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const heroImage = templateImages?.heroImage ?? null;
  const heroStat = copy.trustCards[0] ?? null;
  const heroChips = copy.benefitsItems.filter(Boolean).slice(0, 3);

  return (
    <header
      className={`relative isolate overflow-hidden border-b ${cleanBorder(isDark)} ${cleanSectionBg(isDark, "hero")} ${
        isPreview ? "pb-4 pt-3" : "pb-14 pt-10 md:pb-20 md:pt-14"
      }`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div
        className={`${sectionContainer(variant)} grid items-center gap-6 ${
          isPreview ? "gap-3" : "md:grid-cols-2 md:gap-10 lg:gap-14"
        }`}
      >
        <div
          className={`flex min-w-0 flex-col ${isPreview ? "gap-2" : "gap-4 md:gap-5"}`}
          data-testid={`${testIdPrefix}-hero-content`}
        >
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className={`shrink-0 object-cover ${
                  isPreview ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl shadow-sm ring-2 ring-white/90"
                }`}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center font-bold ${
                  isPreview ? "h-8 w-8 rounded-lg text-xs" : "h-11 w-11 rounded-xl text-base shadow-sm ring-2 ring-white/80"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}18`, color: theme.primaryColor }}
                aria-hidden
                data-testid={`${testIdPrefix}-logo-placeholder`}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p
              className={`${presentation.heroBadgeClass} whitespace-normal`}
              style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}14` }}
              data-testid={`${testIdPrefix}-hero-badge`}
            >
              {heroBadgeText}
            </p>
          </div>

          <h1
            className={`${presentation.heroTitleClass} whitespace-normal ${cleanHeadingText(isDark)}`}
            data-testid={`${testIdPrefix}-hero-title`}
          >
            {heroTitle}
          </h1>

          {heroSubtitle ? (
            <p
              className={`max-w-xl whitespace-normal font-medium leading-snug ${
                isPreview ? "text-xs" : "text-base md:text-lg"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-subtitle`}
            >
              {heroSubtitle}
            </p>
          ) : (
            <p className={`max-w-xl whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>
              {heroIntro(operatingMode)}
            </p>
          )}

          {heroBody ? (
            <p
              className={`max-w-xl whitespace-normal leading-relaxed ${
                isPreview ? "text-[11px]" : "text-sm md:text-base"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-body`}
            >
              {heroBody}
            </p>
          ) : null}

          <div
            className={`flex w-full flex-col sm:flex-row ${isPreview ? "gap-1.5" : "gap-3"}`}
            data-testid={`${testIdPrefix}-hero-cta-group`}
          >
            {showBookingCta && hasMeaningfulText(primaryCtaLabel) ? (
              previewButtons ? (
                <button
                  type="button"
                  disabled
                  className={presentation.primaryButtonClass}
                  data-testid={`${testIdPrefix}-primary-button`}
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {primaryCtaLabel}
                </button>
              ) : (
                <Link
                  to={primaryBookingHref}
                  className={presentation.primaryButtonClass}
                  data-testid={`${testIdPrefix}-book-cta`}
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {primaryCtaLabel}
                </Link>
              )
            ) : null}
            {showRequestCta && hasMeaningfulText(secondaryCtaLabel) ? (
              previewButtons ? (
                <button
                  type="button"
                  disabled
                  className={presentation.secondaryButtonClass}
                  data-testid={`${testIdPrefix}-secondary-button`}
                  style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                >
                  {secondaryCtaLabel}
                </button>
              ) : (
                <Link
                  to={secondaryOrderHref}
                  className={presentation.secondaryButtonClass}
                  data-testid={`${testIdPrefix}-request-cta`}
                  style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                >
                  {secondaryCtaLabel}
                </Link>
              )
            ) : null}
          </div>

          {showHeroTrustStrip && heroChips.length > 0 ? (
            <div
              className={`flex flex-wrap ${isPreview ? "gap-1.5" : "gap-2"}`}
              data-testid={`${testIdPrefix}-hero-trust-strip`}
            >
              {heroChips.map((chip) => (
                <span
                  key={chip}
                  className={`inline-flex items-center gap-1.5 whitespace-normal ${cleanCardShell(
                    isDark,
                    isPreview,
                  )} ${isPreview ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <CleanCheckIcon color={theme.primaryColor} size="sm" />
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className={`relative min-w-0 ${isPreview ? "" : "md:min-h-[340px]"}`}>
          {heroImage ? (
            <CleanHeroImageShell
              media={heroImage}
              variant={variant}
              testId={`${testIdPrefix}-template-heroImage`}
              isDark={isDark}
            />
          ) : (
            <div
              className={`flex h-full min-h-[180px] flex-col justify-between ${cleanCardShell(
                isDark,
                isPreview,
              )} ${isPreview ? "gap-2 p-3" : "gap-4 p-6 md:min-h-[320px] md:p-8"}`}
            >
              <div>
                <CleanSectionEyebrow color={theme.accentColor} variant={variant} className="mb-2">
                  {business.name}
                </CleanSectionEyebrow>
                <p
                  className={`whitespace-normal font-bold leading-tight ${
                    isPreview ? "text-sm" : "text-xl md:text-2xl"
                  } ${cleanHeadingText(isDark)}`}
                >
                  {heroTitle}
                </p>
              </div>
              <p className={`whitespace-normal ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
                {heroSubtitle || heroIntro(operatingMode)}
              </p>
            </div>
          )}

          <div
            className={`absolute ${isPreview ? "bottom-2 left-2 max-w-[70%]" : "bottom-4 left-4 max-w-[75%] md:bottom-6 md:left-6"} ${
              cleanCardShell(isDark, isPreview)
            } ${isPreview ? "px-2.5 py-2" : "px-4 py-3 md:px-5 md:py-4"}`}
          >
            <p
              className={`font-bold ${isPreview ? "text-[10px]" : "text-sm"} ${cleanHeadingText(isDark)}`}
            >
              {business.name}
            </p>
            <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>
              {heroIntro(operatingMode)}
            </p>
          </div>

          {heroStat ? (
            <div
              className={`absolute ${isPreview ? "right-2 top-2" : "right-4 top-4 md:right-6 md:top-6"} ${
                cleanCardShell(isDark, isPreview)
              } text-center ${isPreview ? "px-2 py-1.5" : "px-3 py-2 md:px-4 md:py-3"}`}
            >
              <p
                className={`font-bold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {heroStat.title}
              </p>
              <p className={`whitespace-normal ${isPreview ? "text-[9px]" : "text-[10px]"} ${muted}`}>
                {heroStat.subtitle}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export type CleanAboutSectionProps = CleanSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: CleanTheme;
  isDark: boolean;
  introVideo?: MiniSiteVideoMedia | null;
  copy?: MiniSiteCopy;
};

export function CleanAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
  introVideo = null,
  copy,
}: CleanAboutSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const content = body || fallbackBody;
  const proofPoint = copy?.benefitsItems.find(Boolean) ?? copy?.trustCards[0]?.subtitle ?? null;

  if (!content && !introVideo) {
    return null;
  }

  return (
    <section
      className={`border-b ${cleanBorder(isDark)} ${cleanSectionBg(isDark, "about")} ${variantSpacing(variant)}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div
        className={`${sectionContainer(variant)} grid gap-3 ${
          isPreview ? "" : "md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-5 lg:gap-6"
        }`}
      >
        {content ? (
          <div
            className={`${cleanCardShell(isDark, isPreview)} ${
              isPreview ? "p-4" : "p-6 md:p-8 lg:p-10"
            }`}
          >
            <CleanSectionEyebrow
              color={theme.accentColor}
              variant={variant}
              className={isPreview ? "mb-2" : "mb-4"}
              testId={`${testIdPrefix}-about-title`}
            >
              {title}
            </CleanSectionEyebrow>
            <p
              className={`whitespace-normal leading-relaxed ${
                isPreview ? "text-xs" : "text-base md:text-lg md:leading-relaxed lg:text-xl"
              } ${muted}`}
              data-testid={`${testIdPrefix}-about-body`}
            >
              {content}
            </p>
          </div>
        ) : null}

        <div className={`flex flex-col ${isPreview ? "gap-2" : "gap-4"}`}>
          {introVideo ? (
            <div className={`${cleanCardShell(isDark, isPreview)} ${isPreview ? "p-3" : "p-4 md:p-5"}`}>
              <MiniSiteTemplateVideoCard
                media={introVideo}
                variant={variant}
                tone="clean"
                label="Watch intro"
                testId={`${testIdPrefix}-template-introVideo`}
                maxWidthClass="w-full"
                className="max-w-none"
              />
            </div>
          ) : null}

          {proofPoint ? (
            <div
              className={`flex items-start gap-3 ${cleanCardShell(isDark, isPreview)} ${
                isPreview ? "p-3" : "p-4 md:p-5"
              }`}
            >
              <CleanCheckIcon color={theme.primaryColor} size={isPreview ? "sm" : "md"} />
              <div className="min-w-0">
                <p
                  className={`font-semibold ${isPreview ? "text-xs" : "text-sm"} ${cleanHeadingText(isDark)}`}
                >
                  Why clients choose us
                </p>
                <p className={`mt-1 whitespace-normal ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
                  {proofPoint}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type CleanServicesSectionProps = CleanSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: CleanTheme;
  isDark: boolean;
  templateImages?: MiniSiteTemplateImages;
};

export function CleanServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
  templateImages,
}: CleanServicesSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const servicesImage = templateImages?.servicesImage ?? null;

  return (
    <section
      className={`${cleanSectionBg(isDark, "services")} ${variantSpacing(variant)}`}
      aria-labelledby="pro-mini-site-services-heading"
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={sectionContainer(variant)}>
        <div
          className={`mb-5 text-center ${isPreview ? "mb-3" : "mb-8 md:mb-10"}`}
        >
          <CleanSectionEyebrow
            color={theme.primaryColor}
            variant={variant}
            className={isPreview ? "mb-1" : "mb-3"}
          >
            Our services
          </CleanSectionEyebrow>
          <h2
            id="pro-mini-site-services-heading"
            className={`whitespace-normal font-bold tracking-tight ${
              isPreview ? "text-sm" : "text-2xl md:text-3xl lg:text-4xl"
            } ${cleanHeadingText(isDark)}`}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {title}
          </h2>
          {badgeText ? (
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 font-medium ${
                isPreview ? "text-[10px]" : "text-xs"
              }`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}12` }}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        <div
          className={`grid gap-4 ${
            servicesImage && !isPreview ? "lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-6" : ""
          }`}
        >
          <div>
            {services && services.length > 0 ? (
              <div
                className={`grid ${
                  isPreview ? "grid-cols-1 gap-2" : "gap-4 sm:grid-cols-2 xl:grid-cols-3"
                }`}
              >
                {services.map((service, index) => (
                  <CleanServiceCard
                    key={service.id}
                    slug={publicSlug}
                    service={service}
                    index={index}
                    primaryColor={theme.primaryColor}
                    isDark={isDark}
                    variant={variant}
                  />
                ))}
              </div>
            ) : variant === "preview" ? (
              <div className={`${cleanCardShell(isDark, isPreview)} p-3`}>
                <p className={`text-xs font-semibold ${cleanHeadingText(isDark)}`}>Sample service</p>
                <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>
                  Your services will appear here on the live page.
                </p>
              </div>
            ) : (
              <p className={`text-sm ${muted}`}>
                Services will appear here.{" "}
                <Link
                  to={`/b/${publicSlug}/services`}
                  className="font-medium hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  View services
                </Link>
              </p>
            )}
          </div>

          {servicesImage ? (
            <aside className={`${isPreview ? "mt-2" : "lg:mt-0"}`}>
              <MiniSiteSectionAccentImage
                media={servicesImage}
                variant={variant}
                tone="clean"
                layout="compact"
                className="h-full"
                testId={`${testIdPrefix}-template-servicesImage`}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type CleanTrustSectionProps = CleanSectionShell & {
  copy: MiniSiteCopy;
  theme: CleanTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function CleanTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: CleanTrustSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const benefitCards = copy.benefitsItems.filter(Boolean).slice(0, 3);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && benefitCards.length > 0;

  if (!showTrustStats && !hasBenefits) {
    return null;
  }

  return (
    <section
      className={`border-y ${cleanBorder(isDark)} ${cleanSectionBg(isDark, "trust")} ${
        isPreview ? "py-3" : "py-14 md:py-20"
      }`}
      data-testid={`${testIdPrefix}-trust`}
    >
      <div className={sectionContainer(variant)}>
        {showTrustStats ? (
          <div
            className={`grid ${isPreview ? "grid-cols-3 gap-2" : "gap-4 md:grid-cols-3 md:gap-6"}`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            {copy.trustCards.map((stat) => (
              <div
                key={stat.subtitle}
                className={`min-w-0 text-center ${cleanCardShell(isDark, isPreview)} ${
                  isPreview ? "px-2 py-3" : "px-4 py-6 md:px-6 md:py-8"
                }`}
              >
                <p
                  className={`whitespace-normal font-bold ${
                    isPreview ? "text-xs" : "text-2xl md:text-4xl"
                  }`}
                  style={{ color: theme.primaryColor }}
                >
                  {stat.title}
                </p>
                <p className={`mt-1 whitespace-normal ${isPreview ? "text-[9px]" : "text-sm"} ${muted}`}>
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {hasBenefits ? (
          <div className={showTrustStats ? (isPreview ? "mt-3" : "mt-10 md:mt-14") : ""}>
            <div className={`text-center ${isPreview ? "mb-2" : "mb-8"}`}>
              <CleanSectionEyebrow
                color={theme.accentColor}
                variant={variant}
                testId={`${testIdPrefix}-benefits-strip`}
              >
                {copy.benefitsSectionTitle}
              </CleanSectionEyebrow>
              <h3
                className={`mt-2 whitespace-normal font-bold ${
                  isPreview ? "text-sm" : "text-xl md:text-2xl"
                } ${cleanHeadingText(isDark)}`}
              >
                Why choose us
              </h3>
            </div>
            <ul
              className={`grid ${isPreview ? "gap-2" : "gap-4 sm:grid-cols-3 sm:gap-5"}`}
            >
              {benefitCards.map((benefit) => (
                <li
                  key={benefit}
                  className={`flex flex-col items-start gap-3 whitespace-normal ${cleanCardShell(
                    isDark,
                    isPreview,
                  )} ${isPreview ? "p-3 text-xs" : "p-5 text-sm md:p-6"} ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <CleanCheckIcon color={theme.primaryColor} size={isPreview ? "sm" : "md"} />
                  <span className={`font-semibold ${cleanHeadingText(isDark)}`}>{benefit}</span>
                  <span className={`${muted}`}>Trusted local service you can count on.</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type CleanFaqSectionProps = CleanSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  isDark: boolean;
};

export function CleanFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  isDark,
}: CleanFaqSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const items = faqItems ?? [];

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`${sectionContainer(variant)} max-w-3xl`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-bold tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl"
          } ${cleanHeadingText(isDark)}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`${isPreview ? "mt-2 space-y-2" : "mt-6 space-y-3 md:mt-8"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`${cleanCardShell(isDark, isPreview)} ${
                  isPreview ? "px-3 py-2.5" : "px-5 py-4 md:px-6 md:py-5"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${
                    isPreview ? "text-xs" : "text-sm md:text-base"
                  } ${cleanHeadingText(isDark)}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-1.5 whitespace-normal leading-relaxed ${
                    isPreview ? "text-[11px]" : "text-sm"
                  } ${muted}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-answer`}
                >
                  {item.answer}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

export type CleanContactSectionProps = CleanSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: CleanTheme;
  isDark: boolean;
};

export function CleanContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: CleanContactSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className={`${sectionContainer(variant)} max-w-4xl`}>
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`whitespace-normal font-bold tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl"
          } ${cleanHeadingText(isDark)}`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>

        <div
          className={`mt-4 grid gap-2 ${isPreview ? "text-xs" : "mt-6 gap-3 text-sm sm:grid-cols-2 md:gap-4"}`}
        >
          {hasAddress ? (
            <div className={`${cleanCardShell(isDark, isPreview)} ${isPreview ? "p-3" : "p-4 md:p-5"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${muted}`}>Address</p>
              <p className={`mt-1.5 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {contactAddress}
              </p>
            </div>
          ) : null}
          {hasPhone ? (
            <div className={`${cleanCardShell(isDark, isPreview)} ${isPreview ? "p-3" : "p-4 md:p-5"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${muted}`}>Phone</p>
              <p className="mt-1.5">
                <a
                  href={`tel:${contactPhone}`}
                  className="font-semibold hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
              </p>
            </div>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div
            className={`flex flex-wrap gap-2 ${isPreview ? "mt-2" : "mt-4"}`}
            data-testid={`${testIdPrefix}-social-links`}
          >
            {entries.map((entry) => (
              <div
                key={entry.key}
                className={`min-w-0 ${cleanCardShell(isDark, isPreview)} ${
                  isPreview ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                }`}
                data-testid={`${testIdPrefix}-${entry.key}`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
                  {entry.label}
                </span>
                <span className={`mt-0.5 block whitespace-normal ${muted}`}>{entry.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type CleanBookingCtaSectionProps = CleanSectionShell & {
  label: string;
  href: string;
  theme: CleanTheme;
  presentation: MiniSiteTemplatePresentation;
  templateImages?: MiniSiteTemplateImages;
  headline?: string;
  subtext?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CleanBookingCtaSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  label,
  href,
  theme,
  presentation,
  templateImages,
  headline = "Ready to get started?",
  subtext = "Book your service today and experience professional care tailored to you.",
  secondaryLabel,
  secondaryHref,
  previewButtons = false,
}: CleanBookingCtaSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const isPreview = variant === "preview";
  const muted = cleanMutedText(isDark);
  const ctaImage = templateImages?.ctaImage ?? null;
  const showSecondary = hasMeaningfulText(secondaryLabel) && !!secondaryHref;

  return (
    <section
      className={`relative isolate overflow-hidden border-t ${cleanBorder(isDark)} ${cleanSectionBg(
        isDark,
        "cta",
      )} ${isPreview ? "py-4" : "py-14 md:py-20"}`}
      data-testid="pro-mini-site-booking-cta-section"
    >
      <div className={sectionContainer(variant)}>
        <div
          className={`grid items-center ${cleanCardShell(isDark, isPreview)} ${
            isPreview
              ? "gap-3 p-4"
              : "gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 md:p-8 lg:p-10"
          }`}
          data-testid="pro-mini-site-booking-cta-panel"
        >
          <div className={`min-w-0 ${ctaImage && !isPreview ? "md:col-span-1" : ""}`}>
            <h2
              className={`whitespace-normal font-bold tracking-tight ${
                isPreview ? "text-sm" : "text-xl md:text-2xl lg:text-3xl"
              } ${cleanHeadingText(isDark)}`}
              data-testid="pro-mini-site-booking-cta-heading"
            >
              {headline}
            </h2>
            <p
              className={`mt-2 whitespace-normal leading-relaxed ${
                isPreview ? "text-[11px]" : "text-sm md:text-base"
              } ${muted}`}
            >
              {subtext}
            </p>
            <div className={`mt-4 flex flex-col sm:flex-row ${isPreview ? "gap-1.5" : "gap-3"}`}>
              {previewButtons ? (
                <button
                  type="button"
                  disabled
                  className={presentation.primaryButtonClass}
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {label}
                </button>
              ) : (
                <Link
                  to={href}
                  className={presentation.primaryButtonClass}
                  data-testid="pro-mini-site-booking-cta-link"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {label}
                </Link>
              )}
              {showSecondary ? (
                previewButtons ? (
                  <button
                    type="button"
                    disabled
                    className={presentation.secondaryButtonClass}
                    style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                  >
                    {secondaryLabel}
                  </button>
                ) : (
                  <Link
                    to={secondaryHref}
                    className={presentation.secondaryButtonClass}
                    style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                  >
                    {secondaryLabel}
                  </Link>
                )
              ) : null}
            </div>
          </div>

          {ctaImage ? (
            <div className={`shrink-0 ${isPreview ? "w-full" : "w-full max-w-[200px] justify-self-end"}`}>
              <MiniSiteSectionAccentImage
                media={ctaImage}
                variant={variant}
                tone="clean"
                layout="cta"
                className="mb-0"
                testId={`${testIdPrefix}-template-ctaImage`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type CleanGallerySectionProps = CleanSectionShell & {
  theme: CleanTheme;
  isDark: boolean;
};

export function CleanGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: CleanGallerySectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} text-center ${isPreview ? "py-4" : "py-14 md:py-20"}`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div className={`${sectionContainer(variant)} max-w-md`}>
        <div className={`${cleanCardShell(isDark, isPreview)} ${isPreview ? "px-4 py-5" : "px-8 py-10"}`}>
          <div
            className={`mx-auto mb-3 flex items-center justify-center rounded-full font-semibold ${
              isPreview ? "h-8 w-8 text-sm" : "h-12 w-12 text-lg"
            }`}
            style={{ backgroundColor: `${theme.accentColor}14`, color: theme.accentColor }}
            aria-hidden
          >
            +
          </div>
          <h2
            id="pro-mini-site-gallery-heading"
            className={`font-bold ${isPreview ? "text-sm" : "text-xl"} ${cleanHeadingText(isDark)}`}
          >
            Gallery
          </h2>
          <p className={`mx-auto mt-2 whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
            Photo gallery coming soon. Showcase your work here.
          </p>
        </div>
      </div>
    </section>
  );
}
