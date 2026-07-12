import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import { normalizeServiceImageMedia } from "@/lib/serviceImage";
import { ServiceCardImageArea } from "@/components/ServiceImageDisplay";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";
import { isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";
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

function cleanBlueBand(isDark: boolean): string {
  return isDark ? "bg-sky-900/80" : "bg-sky-300";
}

function cleanBlueBandText(isDark: boolean): string {
  return isDark ? "text-white" : "text-slate-950";
}

function cleanHeroBg(isDark: boolean): string {
  return isDark
    ? "bg-gradient-to-b from-slate-950 to-slate-900"
    : "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#f1f5f9_100%)]";
}

function cleanWhiteCard(isDark: boolean, isPreview: boolean): string {
  const radius = isPreview ? "rounded-2xl" : "rounded-[1.5rem] md:rounded-[2rem]";
  if (isDark) {
    return `${radius} border border-slate-700/55 bg-slate-900/70 shadow-lg`;
  }
  return `${radius} border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]`;
}

function variantSpacing(variant: CleanSectionVariant): string {
  return variant === "preview" ? "py-4" : "py-12 md:py-16";
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
  light = false,
}: {
  children: ReactNode;
  color?: string;
  variant: CleanSectionVariant;
  className?: string;
  testId?: string;
  light?: boolean;
}) {
  return (
    <p
      className={`font-semibold uppercase tracking-[0.22em] ${
        variant === "preview" ? "text-[9px]" : "text-[10px] md:text-xs"
      } ${light ? "text-white/90" : ""} ${className}`}
      style={light ? undefined : color ? { color } : undefined}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

function CleanIntroVideoCard({
  media,
  variant,
  testId,
  isDark,
  primaryColor,
}: {
  media: MiniSiteVideoMedia;
  variant: CleanSectionVariant;
  testId: string;
  isDark: boolean;
  primaryColor: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPreview = variant === "preview";

  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) {
    return null;
  }

  return (
    <div className={isPreview ? "mt-2" : "mt-4"}>
      {isPlaying ? (
        <div className="max-w-[200px]">
          <p
            className={`mb-1.5 font-semibold uppercase tracking-[0.16em] ${
              isPreview ? "text-[9px]" : "text-[10px]"
            } ${cleanMutedText(isDark)}`}
          >
            Watch intro
          </p>
          <MiniSiteVideoEmbed
            media={media}
            variant={variant}
            testId={testId}
            className={`overflow-hidden rounded-xl border ${cleanBorder(isDark)}`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className={`inline-flex max-w-[220px] items-center gap-2.5 rounded-full border px-3 py-2 text-left transition ${
            isDark
              ? "border-slate-700/60 bg-slate-900/50 hover:bg-slate-900/70"
              : "border-slate-200/80 bg-white hover:bg-slate-50"
          } ${isPreview ? "text-[10px]" : "text-xs"}`}
          data-testid={testId}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-full text-white ${
              isPreview ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs"
            }`}
            style={{ backgroundColor: primaryColor }}
            aria-hidden
          >
            ▶
          </span>
          <span className={`font-semibold ${cleanHeadingText(isDark)}`}>Watch intro</span>
        </button>
      )}
    </div>
  );
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
    ? service.description.length > (isPreview ? 80 : 130)
      ? `${service.description.slice(0, isPreview ? 80 : 130).trim()}…`
      : service.description
    : null;
  const hasServiceImage = Boolean(normalizeServiceImageMedia(service.image));

  return (
    <article
      className={`flex h-full flex-col overflow-hidden ${cleanWhiteCard(isDark, isPreview)}`}
      data-testid="service-card"
    >
      {hasServiceImage ? (
        <ServiceCardImageArea
          image={service.image}
          alt={service.name}
          testId="service-card-image"
        />
      ) : null}
      <div className={isPreview ? "flex flex-1 flex-col gap-2 p-3" : "flex flex-1 flex-col gap-4 p-6 md:p-7"}>
        <span
          className={`font-bold tabular-nums ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3
          className={`whitespace-normal font-black tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl"
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
          {duration ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{duration}</span> : null}
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`inline-flex w-full items-center justify-center rounded-full font-bold text-white shadow-sm transition hover:brightness-105 ${
            isPreview ? "px-3 py-2 text-[11px]" : "px-5 py-3 text-sm"
          }`}
          style={{ backgroundColor: primaryColor }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

/* ─── 1. HERO: large light spacious block ─── */
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
  theme,
  presentation,
  primaryCtaLabel,
  secondaryCtaLabel,
  primaryBookingHref,
  secondaryOrderHref,
  showBookingCta,
  showRequestCta,
  operatingMode,
  templateImages,
}: CleanHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const heroImage = templateImages?.heroImage ?? null;

  return (
    <header
      className={`${cleanHeroBg(isDark)} ${isPreview ? "py-5" : "py-14 md:py-20 lg:py-24"}`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div
        className={`${sectionContainer(variant)} grid items-center ${
          heroImage && !isPreview ? "md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-12" : ""
        } ${isPreview ? "gap-3" : "gap-8"}`}
      >
        <div
          className={`flex min-w-0 flex-col ${isPreview ? "gap-2.5" : "gap-5 md:gap-6"}`}
          data-testid={`${testIdPrefix}-hero-content`}
        >
          <CleanSectionEyebrow color={theme.accentColor} variant={variant} testId={`${testIdPrefix}-hero-badge`}>
            {heroBadgeText}
          </CleanSectionEyebrow>

          <h1
            className={`whitespace-normal font-black leading-[1.05] tracking-tight ${
              isPreview ? "text-xl" : "text-4xl sm:text-5xl md:text-6xl"
            } ${cleanHeadingText(isDark)}`}
            data-testid={`${testIdPrefix}-hero-title`}
          >
            {heroTitle}
          </h1>

          {heroSubtitle ? (
            <p
              className={`max-w-2xl whitespace-normal leading-relaxed ${
                isPreview ? "text-xs" : "text-base md:text-lg"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-subtitle`}
            >
              {heroSubtitle}
            </p>
          ) : (
            <p className={`max-w-2xl whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>
              {heroIntro(operatingMode)}
            </p>
          )}

          {heroBody ? (
            <p
              className={`max-w-2xl whitespace-normal leading-relaxed ${
                isPreview ? "text-[11px]" : "text-sm md:text-base"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-body`}
            >
              {heroBody}
            </p>
          ) : null}

          <div
            className={`flex flex-wrap ${isPreview ? "gap-1.5" : "gap-3"}`}
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

          {!business.logo_url ? (
            <div
              className="sr-only"
              data-testid={`${testIdPrefix}-logo-placeholder`}
              aria-hidden
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          ) : null}
        </div>

        {heroImage ? (
          <div className={`min-w-0 ${isPreview ? "mt-1" : ""}`}>
            <div
              className={`overflow-hidden shadow-xl ${isPreview ? "rounded-2xl" : "rounded-[2rem]"}`}
            >
              <MiniSiteSlotImage
                media={heroImage}
                testId={`${testIdPrefix}-template-heroImage`}
                className={`w-full object-cover ${
                  isPreview ? "aspect-[4/3] max-h-32" : "aspect-[4/3] md:max-h-[420px]"
                }`}
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ─── 2. ABOUT: secondary story split (reference woman-cleaning section) ─── */
export type CleanAboutSectionProps = CleanSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: CleanTheme;
  isDark: boolean;
  introVideo?: MiniSiteVideoMedia | null;
  templateImages?: MiniSiteTemplateImages;
  presentation?: MiniSiteTemplatePresentation;
  primaryCtaLabel?: string;
  primaryBookingHref?: string;
  previewButtons?: boolean;
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
  templateImages,
  presentation,
  primaryCtaLabel,
  primaryBookingHref,
  previewButtons = false,
}: CleanAboutSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const content = body || fallbackBody;
  const storyImage = templateImages?.ctaImage ?? null;

  if (!content && !introVideo) {
    return null;
  }

  return (
    <section
      className={`bg-white ${variantSpacing(variant)} ${isDark ? "bg-slate-950" : ""}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div
        className={`${sectionContainer(variant)} grid items-center ${
          storyImage && !isPreview ? "md:grid-cols-2 md:gap-10 lg:gap-14" : ""
        } ${isPreview ? "gap-3" : "gap-6"}`}
      >
        {storyImage ? (
          <div className={`overflow-hidden shadow-xl ${isPreview ? "rounded-2xl" : "rounded-[2rem]"}`}>
            <MiniSiteSlotImage
              media={storyImage}
              testId={`${testIdPrefix}-template-ctaImage`}
              className={`w-full object-cover ${isPreview ? "aspect-square max-h-28" : "aspect-square max-h-[360px]"}`}
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <CleanSectionEyebrow
            color={theme.accentColor}
            variant={variant}
            className={isPreview ? "mb-1.5" : "mb-3"}
            testId={`${testIdPrefix}-about-title`}
          >
            {title}
          </CleanSectionEyebrow>
          {content ? (
            <>
              <h2
                className={`whitespace-normal font-black leading-tight ${
                  isPreview ? "text-sm" : "text-2xl md:text-3xl lg:text-4xl"
                } ${cleanHeadingText(isDark)}`}
              >
                Quality service you can trust
              </h2>
              <p
                className={`mt-3 whitespace-normal leading-relaxed ${
                  isPreview ? "text-xs" : "text-base md:text-lg"
                } ${muted}`}
                data-testid={`${testIdPrefix}-about-body`}
              >
                {content}
              </p>
            </>
          ) : null}

          {presentation && primaryCtaLabel && hasMeaningfulText(primaryCtaLabel) && primaryBookingHref ? (
            <div className={isPreview ? "mt-2" : "mt-5"}>
              {previewButtons ? (
                <button
                  type="button"
                  disabled
                  className={presentation.primaryButtonClass}
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {primaryCtaLabel}
                </button>
              ) : (
                <Link
                  to={primaryBookingHref}
                  className={presentation.primaryButtonClass}
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {primaryCtaLabel}
                </Link>
              )}
            </div>
          ) : null}

          {introVideo ? (
            <CleanIntroVideoCard
              media={introVideo}
              variant={variant}
              testId={`${testIdPrefix}-template-introVideo`}
              isDark={isDark}
              primaryColor={theme.primaryColor}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ─── 3. SERVICES: blue showcase band + overlapping large cards ─── */
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
  const bandText = cleanBlueBandText(isDark);

  return (
    <section
      className="relative"
      aria-labelledby="pro-mini-site-services-heading"
      data-testid={`${testIdPrefix}-services`}
    >
      {/* Blue showcase band */}
      <div className={`${cleanBlueBand(isDark)} ${isPreview ? "py-5" : "py-12 md:py-16 lg:py-20"}`}>
        <div className={sectionContainer(variant)}>
          <div
            className={`grid items-center ${
              servicesImage && !isPreview ? "md:grid-cols-2 md:gap-10" : ""
            } ${isPreview ? "gap-3" : "gap-6"}`}
          >
            <div className={`min-w-0 ${bandText}`}>
              <CleanSectionEyebrow variant={variant} light className={isPreview ? "mb-1" : "mb-3"}>
                Professional service
              </CleanSectionEyebrow>
              <h2
                id="pro-mini-site-services-heading"
                className={`whitespace-normal font-black leading-tight ${
                  isPreview ? "text-base" : "text-2xl md:text-4xl lg:text-5xl"
                }`}
                data-testid={`${testIdPrefix}-services-title`}
              >
                {title}
              </h2>
              {badgeText ? (
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 font-medium ${
                    isPreview ? "text-[10px]" : "text-xs"
                  } ${isDark ? "bg-white/15" : "bg-white/30"}`}
                  data-testid={`${testIdPrefix}-services-badge`}
                >
                  {badgeText}
                </span>
              ) : null}
              {!badgeText ? (
                <p className={`mt-3 whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} opacity-90`}>
                  Professional services tailored to your needs.
                </p>
              ) : null}
            </div>

            {servicesImage ? (
              <div
                className={`overflow-hidden shadow-2xl ${
                  isPreview ? "rounded-2xl" : "rounded-[2rem]"
                } ${isDark ? "ring-2 ring-white/20" : "ring-4 ring-white/40"}`}
              >
                <MiniSiteSlotImage
                  media={servicesImage}
                  testId={`${testIdPrefix}-template-servicesImage`}
                  className={`w-full object-cover ${
                    isPreview ? "aspect-[3/4] max-h-28" : "aspect-[3/4] max-h-[380px]"
                  }`}
                />
              </div>
            ) : null}
          </div>

          <p
            className={`mx-auto mt-6 max-w-3xl text-center font-bold ${
              isPreview ? "text-xs" : "text-lg md:text-xl lg:text-2xl"
            } ${bandText}`}
          >
            Services that make your space shine
          </p>
        </div>
      </div>

      {/* Overlapping service cards */}
      <div
        className={`${sectionContainer(variant)} relative z-10 ${
          isPreview ? "-mt-3 pb-4" : "-mt-10 pb-14 md:-mt-16 md:pb-20 lg:-mt-20"
        }`}
      >
        {services && services.length > 0 ? (
          <div
            className={`grid ${
              isPreview ? "grid-cols-1 gap-2" : "gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
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
          <div className={`${cleanWhiteCard(isDark, isPreview)} p-3`}>
            <p className={`text-xs font-bold ${cleanHeadingText(isDark)}`}>Sample service</p>
            <p className={`mt-1 text-[11px] ${muted}`}>Your services will appear here on the live page.</p>
          </div>
        ) : (
          <p className={`text-sm ${muted}`}>
            Services will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
              View services
            </Link>
          </p>
        )}

      </div>
    </section>
  );
}

/* ─── 4–7. TRUST: chips → stats → why choose us blue block ─── */
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
  const benefitItems = copy.benefitsItems.filter(Boolean);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && benefitItems.length > 0;
  const chipItems = [
    ...benefitItems,
    ...copy.trustCards.map((card) => card.subtitle).filter(Boolean),
  ].slice(0, 9);

  if (!showTrustStats && !hasBenefits && chipItems.length === 0) {
    return null;
  }

  return (
    <section className={`bg-white ${isDark ? "bg-slate-950" : ""}`} data-testid={`${testIdPrefix}-trust`}>
      {/* Category chips */}
      {chipItems.length > 0 ? (
        <div className={`${sectionContainer(variant)} ${isPreview ? "py-3" : "py-10 md:py-12"}`}>
          <div className={`flex flex-wrap justify-center ${isPreview ? "gap-1.5" : "gap-2 md:gap-3"}`}>
            {chipItems.map((chip) => (
              <span
                key={chip}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 whitespace-normal ${
                  isDark
                    ? "border-slate-700/60 bg-slate-900/50 text-slate-200"
                    : "border-slate-200/80 bg-slate-100/80 text-slate-700"
                } ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full text-white ${
                    isPreview ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]"
                  }`}
                  style={{ backgroundColor: theme.primaryColor }}
                  aria-hidden
                >
                  ✓
                </span>
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Stats row */}
      {showTrustStats ? (
        <div className={`${sectionContainer(variant)} ${isPreview ? "pb-3" : "pb-12 md:pb-16"}`}>
          <div
            className={`grid ${isPreview ? "grid-cols-3 gap-2" : "gap-4 md:grid-cols-3 md:gap-6"}`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            {copy.trustCards.map((stat) => (
              <div
                key={stat.subtitle}
                className={`text-center ${cleanWhiteCard(isDark, isPreview)} ${
                  isPreview ? "px-2 py-3" : "px-4 py-8 md:px-6 md:py-10"
                }`}
              >
                <p
                  className={`font-black leading-none ${
                    isPreview ? "text-sm" : "text-3xl md:text-5xl"
                  } ${cleanHeadingText(isDark)}`}
                >
                  {stat.title}
                </p>
                <p className={`mt-2 font-semibold ${isPreview ? "text-[9px]" : "text-sm"} ${muted}`}>
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Why choose us — blue block with 2×2 cards */}
      {hasBenefits ? (
        <div className={`${cleanBlueBand(isDark)} ${isPreview ? "py-4" : "py-12 md:py-16"}`}>
          <div className={sectionContainer(variant)}>
            <div className={`text-center ${cleanBlueBandText(isDark)} ${isPreview ? "mb-3" : "mb-8 md:mb-10"}`}>
              <CleanSectionEyebrow variant={variant} light testId={`${testIdPrefix}-benefits-strip`}>
                {copy.benefitsSectionTitle}
              </CleanSectionEyebrow>
              <h3 className={`mt-2 font-black ${isPreview ? "text-sm" : "text-2xl md:text-4xl"}`}>
                Why choose us
              </h3>
            </div>
            <ul
              className={`grid ${isPreview ? "grid-cols-2 gap-2" : "gap-4 sm:grid-cols-2 lg:gap-6"}`}
            >
              {benefitItems.slice(0, 4).map((benefit) => (
                <li
                  key={benefit}
                  className={`${cleanWhiteCard(isDark, isPreview)} ${
                    isPreview ? "p-3 text-[11px]" : "p-5 md:p-6 text-sm"
                  } ${cleanHeadingText(isDark)}`}
                >
                  <span
                    className={`mb-2 inline-flex items-center justify-center rounded-full text-white ${
                      isPreview ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <p className={`font-bold ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>{benefit}</p>
                  <p className={`mt-1 ${muted}`}>Reliable local service, done right.</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ─── FAQ ─── */
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
      className={`border-t ${cleanBorder(isDark)} bg-white ${isDark ? "bg-slate-950" : ""} ${variantSpacing(variant)}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`${sectionContainer(variant)} max-w-3xl`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`font-bold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${cleanHeadingText(isDark)}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`${isPreview ? "mt-2 space-y-2" : "mt-5 space-y-3"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) return null;
            return (
              <div
                key={`${index}-${item.question}`}
                className={`${cleanWhiteCard(isDark, isPreview)} ${isPreview ? "px-3 py-2.5" : "px-5 py-4"}`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`font-semibold ${isPreview ? "text-xs" : "text-sm"} ${cleanHeadingText(isDark)}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-1.5 leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}
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

/* ─── Contact ─── */
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
      className={`border-t ${cleanBorder(isDark)} bg-slate-50 ${isDark ? "bg-slate-900/40" : ""} ${
        isPreview ? "py-4" : "py-10 md:py-12"
      }`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className={`${sectionContainer(variant)} max-w-4xl`}>
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`font-bold ${isPreview ? "text-sm" : "text-xl"} ${cleanHeadingText(isDark)}`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>
        <div className={`mt-4 grid gap-2 ${isPreview ? "text-xs" : "sm:grid-cols-2 gap-3 text-sm"}`}>
          {hasAddress ? (
            <div className={`${cleanWhiteCard(isDark, isPreview)} ${isPreview ? "p-3" : "p-4"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Address</p>
              <p className="mt-1 whitespace-normal">{contactAddress}</p>
            </div>
          ) : null}
          {hasPhone ? (
            <div className={`${cleanWhiteCard(isDark, isPreview)} ${isPreview ? "p-3" : "p-4"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Phone</p>
              <a href={`tel:${contactPhone}`} className="mt-1 font-semibold hover:underline" style={{ color: theme.primaryColor }}>
                {contactPhone}
              </a>
            </div>
          ) : null}
        </div>
        {entries.length > 0 ? (
          <div className={`flex flex-wrap gap-2 ${isPreview ? "mt-2" : "mt-3"}`} data-testid={`${testIdPrefix}-social-links`}>
            {entries.map((entry) => (
              <div
                key={entry.key}
                className={`rounded-full border px-3 py-1 ${isPreview ? "text-[10px]" : "text-xs"} ${
                  isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white"
                }`}
                data-testid={`${testIdPrefix}-${entry.key}`}
              >
                <span className={muted}>{entry.label}: </span>
                <span>{entry.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─── Final CTA band (newsletter-style) ─── */
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
  headline = "Ready to book your service?",
  subtext = "Get started today — professional care from a trusted local team.",
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
      className={`border-t ${cleanBorder(isDark)} bg-slate-50 ${isDark ? "bg-slate-900/30" : ""} ${
        isPreview ? "py-4" : "py-10 md:py-14"
      }`}
      data-testid="pro-mini-site-booking-cta-section"
    >
      <div className={sectionContainer(variant)}>
        <div
          className={`${cleanWhiteCard(isDark, isPreview)} ${
            isPreview ? "p-4" : "p-6 md:p-8"
          }`}
          data-testid="pro-mini-site-booking-cta-panel"
        >
          <div className={`grid items-center ${ctaImage && !isPreview ? "md:grid-cols-[1fr_auto] md:gap-8" : ""}`}>
            <div>
              <h2
                className={`font-black leading-tight ${
                  isPreview ? "text-base" : "text-2xl md:text-3xl"
                } ${cleanHeadingText(isDark)}`}
                data-testid="pro-mini-site-booking-cta-heading"
              >
                {headline}
              </h2>
              <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>{subtext}</p>
              <div className={`mt-4 flex flex-wrap ${isPreview ? "gap-1.5" : "gap-3"}`}>
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
                    <button type="button" disabled className={presentation.secondaryButtonClass}>
                      {secondaryLabel}
                    </button>
                  ) : (
                    <Link to={secondaryHref} className={presentation.secondaryButtonClass}>
                      {secondaryLabel}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
            {ctaImage ? (
              <div className={`shrink-0 ${isPreview ? "mt-2 max-w-[120px]" : "max-w-[160px]"}`}>
                <MiniSiteSectionAccentImage
                  media={ctaImage}
                  variant={variant}
                  tone="clean"
                  layout="cta"
                  className="mb-0 overflow-hidden rounded-2xl"
                  testId={`${testIdPrefix}-template-ctaImage`}
                />
              </div>
            ) : null}
          </div>
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
  isDark,
}: CleanGallerySectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} text-center ${isPreview ? "py-4" : "py-10"}`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div className={`${sectionContainer(variant)} max-w-md`}>
        <div className={`${cleanWhiteCard(isDark, isPreview)} ${isPreview ? "px-4 py-5" : "px-8 py-8"}`}>
          <h2
            id="pro-mini-site-gallery-heading"
            className={`font-bold ${isPreview ? "text-sm" : "text-lg"} ${cleanHeadingText(isDark)}`}
          >
            Gallery
          </h2>
          <p className={`mt-2 ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
            Photo gallery coming soon. Showcase your work here.
          </p>
        </div>
      </div>
    </section>
  );
}
