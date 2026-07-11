import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
import {
  MiniSiteHeroMediaCard,
  MiniSiteTemplateVideoCard,
} from "@/components/public/MiniSiteTemplateMediaPresentation";
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
  return isDark ? "text-slate-300" : "text-slate-600";
}

function cleanBorder(isDark: boolean): string {
  return isDark ? "border-slate-700/60" : "border-slate-200/60";
}

function cleanDivider(isDark: boolean): string {
  return isDark ? "divide-slate-700/60" : "divide-slate-200/60";
}

function cleanSurfaceCard(isDark: boolean, isPreview: boolean): string {
  if (isPreview) {
    return isDark
      ? "rounded-xl border border-slate-700/60 bg-slate-900/40"
      : "rounded-xl border border-slate-200/70 bg-white/90 shadow-sm";
  }
  return isDark
    ? "rounded-2xl border border-slate-700/55 bg-slate-900/35 shadow-sm shadow-black/20 backdrop-blur-sm"
    : "rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm";
}

function variantSpacing(variant: CleanSectionVariant): string {
  return variant === "preview" ? "py-4" : "py-14 md:py-20";
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
  children: React.ReactNode;
  color: string;
  variant: CleanSectionVariant;
  className?: string;
  testId?: string;
}) {
  return (
    <p
      className={`font-medium uppercase tracking-[0.2em] ${
        variant === "preview" ? "text-[10px]" : "text-xs"
      } ${className}`}
      style={{ color }}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

function CleanGradientBackdrop({
  primaryColor,
  accentColor,
  isDark,
}: {
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 90% 70% at 50% -15%, ${primaryColor}22, transparent 62%), radial-gradient(ellipse 50% 40% at 100% 10%, ${accentColor}12, transparent 55%)`
            : `radial-gradient(ellipse 100% 80% at 50% -25%, ${primaryColor}14, transparent 58%), radial-gradient(ellipse 55% 45% at 100% 0%, ${accentColor}0c, transparent 50%), radial-gradient(ellipse 40% 35% at 0% 20%, ${primaryColor}08, transparent 45%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)"
            : "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
        }}
        aria-hidden
      />
    </>
  );
}

function CleanServiceRow({
  slug,
  service,
  primaryColor,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  primaryColor: string;
  isDark: boolean;
  variant: CleanSectionVariant;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 80 : 140)
      ? `${service.description.slice(0, variant === "preview" ? 80 : 140).trim()}…`
      : service.description
    : null;
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <article
      className={`group flex flex-col transition-colors ${
        isPreview
          ? "gap-2 px-3 py-2.5"
          : `gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6 md:py-6 ${
              isDark ? "hover:bg-slate-800/25" : "hover:bg-slate-50/80"
            }`
      }`}
      data-testid="service-card"
    >
      <div className="min-w-0 flex-1">
        <h3
          className={`whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-xs" : "text-base md:text-lg"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p
            className={`mt-1.5 whitespace-normal leading-relaxed ${
              isPreview ? "text-[11px]" : "text-sm"
            } ${muted}`}
          >
            {descriptionPreview}
          </p>
        ) : null}
        <div
          className={`mt-2.5 flex flex-wrap items-center gap-3 ${
            isPreview ? "text-[10px]" : "text-sm"
          } ${muted}`}
        >
          <PriceLabel service={service} />
          {duration ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                isDark ? "bg-slate-800/60" : "bg-slate-100"
              }`}
            >
              {duration}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className={`inline-flex shrink-0 items-center gap-1.5 font-medium whitespace-normal transition hover:gap-2 ${
          isPreview ? "text-[11px]" : "text-sm"
        }`}
        style={{ color: primaryColor }}
      >
        {serviceActionLabel(service.type)}
        {variant === "full" ? <span aria-hidden>→</span> : null}
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
  const hasHeroMedia = !!heroImage && !isPreview;

  return (
    <header
      className={`relative isolate overflow-hidden border-b ${cleanBorder(isDark)} ${
        isPreview ? "pb-4 pt-3" : "pb-16 pt-12 md:pb-24 md:pt-16"
      }`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <CleanGradientBackdrop
        primaryColor={theme.primaryColor}
        accentColor={theme.accentColor}
        isDark={isDark}
      />

      <div
        className={
          hasHeroMedia
            ? "mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-12 lg:gap-16"
            : `mx-auto flex flex-col items-center text-center ${
                isPreview ? "max-w-full gap-2 px-1" : "max-w-3xl gap-5 md:gap-6"
              }`
        }
      >
        <div
          className={`flex flex-col ${
            hasHeroMedia ? "items-start text-left" : "items-center text-center"
          } ${isPreview ? "gap-2" : "gap-4 md:gap-5"}`}
          data-testid={`${testIdPrefix}-hero-content`}
        >
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className={`shrink-0 object-cover ${
                isPreview
                  ? "h-9 w-9 rounded-lg"
                  : "h-14 w-14 rounded-xl shadow-md ring-2 ring-white/90 md:h-16 md:w-16"
              }`}
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center font-semibold ${
                isPreview
                  ? "h-9 w-9 rounded-lg text-sm"
                  : "h-14 w-14 rounded-xl text-xl shadow-md ring-2 ring-white/80 md:h-16 md:w-16 md:text-2xl"
              }`}
              style={{ backgroundColor: `${theme.primaryColor}16`, color: theme.primaryColor }}
              aria-hidden
              data-testid={`${testIdPrefix}-logo-placeholder`}
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}

          <p
            className={`${presentation.heroBadgeClass} whitespace-normal`}
            style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}12` }}
            data-testid={`${testIdPrefix}-hero-badge`}
          >
            {heroBadgeText}
          </p>

          <h1
            className={`${presentation.heroTitleClass} whitespace-normal`}
            data-testid={`${testIdPrefix}-hero-title`}
          >
            {heroTitle}
          </h1>

          {heroSubtitle ? (
            <p
              className={`max-w-2xl whitespace-normal font-medium ${
                isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-subtitle`}
            >
              {heroSubtitle}
            </p>
          ) : (
            <p
              className={`max-w-2xl whitespace-normal ${
                isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"
              } ${muted}`}
            >
              {heroIntro(operatingMode)}
            </p>
          )}

          {heroBody ? (
            <p
              className={`max-w-2xl whitespace-normal leading-relaxed ${
                isPreview ? "text-xs" : "text-sm md:text-base"
              } ${muted}`}
              data-testid={`${testIdPrefix}-hero-body`}
            >
              {heroBody}
            </p>
          ) : null}

          <div
            className={`flex w-full flex-col ${
              hasHeroMedia ? "items-stretch sm:items-start" : "sm:items-center"
            } ${isPreview ? "mt-2 gap-1.5" : "mt-2 gap-3 sm:flex-row md:mt-4 md:gap-4"}`}
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
        </div>

        {heroImage ? (
          <div className={hasHeroMedia ? "w-full" : "w-full max-w-md"}>
            <MiniSiteHeroMediaCard
              media={heroImage}
              variant={variant}
              tone="clean"
              testId={`${testIdPrefix}-template-heroImage`}
              className={hasHeroMedia ? "w-full" : ""}
            />
          </div>
        ) : null}
      </div>

      {showHeroTrustStrip ? (
        <div
          className={`mx-auto ${
            isPreview ? "mt-3 max-w-full px-1" : "mt-14 max-w-4xl px-4 md:mt-16"
          }`}
          data-testid={`${testIdPrefix}-hero-trust-strip`}
        >
          <div
            className={`grid grid-cols-3 ${
              isPreview ? "gap-2" : "gap-3 md:gap-4"
            }`}
          >
            {copy.trustCards.map((stat) => (
              <div
                key={stat.subtitle}
                className={`min-w-0 text-center ${cleanSurfaceCard(isDark, isPreview)} ${
                  isPreview ? "px-2 py-2" : "px-3 py-4 md:px-5 md:py-5"
                }`}
              >
                <p
                  className={`whitespace-normal font-semibold ${
                    isPreview ? "text-xs" : "text-lg md:text-xl"
                  }`}
                  style={{ color: theme.primaryColor }}
                >
                  {stat.title}
                </p>
                <p
                  className={`mt-0.5 whitespace-normal ${
                    isPreview ? "text-[10px]" : "text-xs"
                  } ${muted}`}
                >
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
}: CleanAboutSectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const content = body || fallbackBody;

  if (!content && !introVideo) {
    return null;
  }

  return (
    <section
      className={`border-b ${cleanBorder(isDark)} ${variantSpacing(variant)} ${
        isPreview ? "px-1" : "px-4"
      }`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div
        className={`mx-auto max-w-3xl text-center ${cleanSurfaceCard(isDark, isPreview)} ${
          isPreview ? "px-4 py-4" : "px-6 py-8 md:px-10 md:py-12"
        }`}
      >
        <CleanSectionEyebrow
          color={theme.accentColor}
          variant={variant}
          className={isPreview ? "mb-1.5" : "mb-4"}
          testId={`${testIdPrefix}-about-title`}
        >
          {title}
        </CleanSectionEyebrow>

        {content ? (
          <p
            className={`mx-auto max-w-2xl whitespace-normal leading-relaxed ${
              isPreview ? "text-xs" : "text-lg md:text-xl md:leading-relaxed"
            } ${muted}`}
            data-testid={`${testIdPrefix}-about-body`}
          >
            {content}
          </p>
        ) : null}

        {introVideo ? (
          <div className={`mx-auto ${content ? (isPreview ? "mt-3" : "mt-8") : ""} max-w-2xl`}>
            <MiniSiteTemplateVideoCard
              media={introVideo}
              variant={variant}
              tone="clean"
              label="Watch intro"
              testId={`${testIdPrefix}-template-introVideo`}
              maxWidthClass="w-full"
            />
          </div>
        ) : null}
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
      className={`${variantSpacing(variant)} ${isPreview ? "px-1" : "px-4"}`}
      aria-labelledby="pro-mini-site-services-heading"
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${
          isPreview ? "mb-2" : "md:mb-10"
        }`}
      >
        <div>
          <CleanSectionEyebrow
            color={theme.primaryColor}
            variant={variant}
            className={isPreview ? "mb-1" : "mb-2.5"}
          >
            Offerings
          </CleanSectionEyebrow>
          <h2
            id="pro-mini-site-services-heading"
            className={`whitespace-normal font-semibold tracking-tight ${
              isPreview ? "text-sm" : "text-2xl md:text-3xl lg:text-4xl"
            } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {title}
          </h2>
        </div>
        {badgeText ? (
          <span
            className={`rounded-full border px-3 py-1 font-medium ${
              isPreview ? "text-[10px]" : "text-xs"
            } ${isDark ? "border-slate-700/60" : "border-slate-200/80"}`}
            style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }}
            data-testid={`${testIdPrefix}-services-badge`}
          >
            {badgeText}
          </span>
        ) : null}
      </div>

      {servicesImage ? (
        <div className={isPreview ? "mb-3" : "mb-8"}>
          <MiniSiteSectionAccentImage
            media={servicesImage}
            variant={variant}
            tone="clean"
            layout="banner"
            testId={`${testIdPrefix}-template-servicesImage`}
          />
        </div>
      ) : null}

      {services && services.length > 0 ? (
        <div className={`overflow-hidden ${cleanSurfaceCard(isDark, isPreview)}`}>
          <div className={`divide-y ${cleanDivider(isDark)}`}>
            {services.map((service) => (
              <CleanServiceRow
                key={service.id}
                slug={publicSlug}
                service={service}
                primaryColor={theme.primaryColor}
                isDark={isDark}
                variant={variant}
              />
            ))}
          </div>
        </div>
      ) : variant === "preview" ? (
        <div className={`overflow-hidden ${cleanSurfaceCard(isDark, isPreview)}`}>
          <article className="flex flex-col gap-2 px-3 py-2.5">
            <p className={`text-xs font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Sample service
            </p>
            <p className={`text-[11px] leading-relaxed ${muted}`}>
              Your services will appear here on the live page.
            </p>
            <span className="text-[11px] font-medium" style={{ color: theme.primaryColor }}>
              View service
            </span>
          </article>
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
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);

  if (!showTrustStats && !hasBenefits) {
    return null;
  }

  return (
    <section
      className={`border-y ${cleanBorder(isDark)} ${
        isPreview ? "py-3 px-1" : "py-12 px-4 md:py-16"
      }`}
      data-testid={`${testIdPrefix}-trust`}
    >
      {showTrustStats ? (
        <div
          className={`mx-auto grid max-w-4xl ${
            isPreview ? "grid-cols-3 gap-2" : "gap-4 md:grid-cols-3 md:gap-5"
          }`}
          data-testid={`${testIdPrefix}-trust-stats`}
        >
          {copy.trustCards.map((stat) => (
            <div
              key={stat.subtitle}
              className={`min-w-0 text-center ${cleanSurfaceCard(isDark, isPreview)} ${
                isPreview ? "px-2 py-2" : "px-4 py-6 md:px-6 md:py-8"
              }`}
            >
              <p
                className={`whitespace-normal font-semibold ${
                  isPreview ? "text-xs" : "text-2xl md:text-3xl lg:text-4xl"
                }`}
                style={{ color: theme.primaryColor }}
              >
                {stat.title}
              </p>
              <p
                className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}
              >
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {hasBenefits ? (
        <div
          className={`mx-auto max-w-4xl ${
            showTrustStats ? (isPreview ? "mt-3" : "mt-12 md:mt-14") : ""
          }`}
        >
          <CleanSectionEyebrow
            color={theme.accentColor}
            variant={variant}
            className={`text-center ${isPreview ? "mb-2" : "mb-6"}`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            {copy.benefitsSectionTitle}
          </CleanSectionEyebrow>
          <ul
            className={`grid ${isPreview ? "gap-1.5" : "gap-4 sm:grid-cols-3 sm:gap-5"}`}
          >
            {copy.benefitsItems.filter(Boolean).map((benefit) => (
              <li
                key={benefit}
                className={`flex items-start gap-3 whitespace-normal ${cleanSurfaceCard(
                  isDark,
                  isPreview,
                )} ${isPreview ? "px-2.5 py-2 text-xs" : "px-4 py-4 text-sm md:px-5 md:py-5"} ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                    isPreview ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
                  }`}
                  style={{ backgroundColor: theme.primaryColor }}
                  aria-hidden
                >
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)} ${
        isPreview ? "px-1" : "px-4"
      }`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`mx-auto max-w-3xl ${isPreview ? "" : "md:px-2"}`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-sm" : "text-2xl md:text-3xl lg:text-4xl"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`${isPreview ? "mt-2 space-y-2" : "mt-8 space-y-3 md:mt-10"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`${cleanSurfaceCard(isDark, isPreview)} ${
                  isPreview ? "px-3 py-2.5" : "px-5 py-5 md:px-6 md:py-6"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-medium ${
                    isPreview ? "text-xs" : "text-base md:text-lg"
                  } ${isDark ? "text-slate-100" : "text-slate-900"}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-2 whitespace-normal leading-relaxed ${
                    isPreview ? "text-xs" : "text-sm md:text-base"
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
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)} ${
        isPreview ? "px-1" : "px-4"
      }`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl lg:text-3xl"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>

        <div
          className={`mt-5 grid gap-3 ${
            isPreview ? "text-xs" : "gap-4 text-sm md:mt-8 md:grid-cols-2 md:gap-5"
          }`}
        >
          {hasAddress ? (
            <div className={`${cleanSurfaceCard(isDark, isPreview)} ${isPreview ? "p-3" : "p-5"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Address</p>
              <p
                className={`mt-1.5 whitespace-normal ${
                  isDark ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {contactAddress}
              </p>
            </div>
          ) : null}
          {hasPhone ? (
            <div className={`${cleanSurfaceCard(isDark, isPreview)} ${isPreview ? "p-3" : "p-5"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
              <p className="mt-1.5">
                <a
                  href={`tel:${contactPhone}`}
                  className="font-medium hover:underline"
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
            className={`flex flex-wrap gap-2 ${isPreview ? "mt-2" : "mt-6"}`}
            data-testid={`${testIdPrefix}-social-links`}
          >
            {entries.map((entry) => (
              <div
                key={entry.key}
                className={`min-w-0 ${cleanSurfaceCard(isDark, isPreview)} ${
                  isPreview ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
                }`}
                data-testid={`${testIdPrefix}-${entry.key}`}
              >
                <span className={`text-xs font-medium uppercase tracking-wide ${muted}`}>
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
};

export function CleanBookingCtaSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  label,
  href,
  theme,
  presentation,
  templateImages,
}: CleanBookingCtaSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const isPreview = variant === "preview";
  const ctaImage = templateImages?.ctaImage ?? null;

  return (
    <section
      className={`relative isolate overflow-hidden border-t ${cleanBorder(isDark)} ${
        isPreview ? "py-4" : "py-14 md:py-20"
      }`}
      data-testid="pro-mini-site-booking-cta-section"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${theme.primaryColor}14 0%, transparent 50%, ${theme.accentColor}10 100%)`
            : `linear-gradient(135deg, ${theme.primaryColor}0a 0%, transparent 45%, ${theme.accentColor}08 100%)`,
        }}
        aria-hidden
      />

      <div className={`mx-auto max-w-3xl ${isPreview ? "px-1" : "px-4"}`}>
        <div
          className={`flex flex-col items-center text-center ${cleanSurfaceCard(isDark, isPreview)} ${
            isPreview ? "gap-3 px-4 py-4" : "gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-10 md:text-left"
          }`}
        >
          {ctaImage ? (
            <MiniSiteSectionAccentImage
              media={ctaImage}
              variant={variant}
              tone="clean"
              layout="cta"
              className="mb-0 w-full max-w-xs shrink-0"
              testId={`${testIdPrefix}-template-ctaImage`}
            />
          ) : null}
          <div className={`flex flex-col items-center ${ctaImage ? "md:items-end" : ""} gap-3`}>
            <Link
              to={href}
              className={`${presentation.primaryButtonClass} shrink-0`}
              data-testid="pro-mini-site-booking-cta-link"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {label}
            </Link>
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
  theme,
  isDark,
}: CleanGallerySectionProps) {
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} text-center ${
        isPreview ? "py-4 px-1" : "py-14 px-4 md:py-20"
      }`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`mx-auto max-w-md ${cleanSurfaceCard(isDark, isPreview)} ${
          isPreview ? "px-4 py-5" : "px-8 py-10 md:px-10 md:py-12"
        }`}
      >
        <div
          className={`mx-auto mb-3 flex items-center justify-center rounded-full font-medium ${
            isPreview ? "h-8 w-8 text-sm" : "h-12 w-12 text-lg"
          }`}
          style={{ backgroundColor: `${theme.accentColor}14`, color: theme.accentColor }}
          aria-hidden
        >
          +
        </div>
        <h2
          id="pro-mini-site-gallery-heading"
          className={`font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
        >
          Gallery
        </h2>
        <p
          className={`mx-auto mt-2 max-w-md whitespace-normal ${
            isPreview ? "text-xs" : "text-sm"
          } ${muted}`}
        >
          Photo gallery coming soon. Showcase your work here.
        </p>
      </div>
    </section>
  );
}
