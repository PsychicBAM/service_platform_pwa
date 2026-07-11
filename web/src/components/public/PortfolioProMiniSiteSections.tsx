import { useState } from "react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { PriceLabel } from "@/components/PriceLabel";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { MiniSiteImageMedia, MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";
import { isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteCopy,
  MiniSiteSocialLinks,
} from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";

export type PortfolioSectionVariant = "full" | "preview";

type PortfolioSectionShell = {
  variant?: PortfolioSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type PortfolioTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

const PORTFOLIO_CONTAINER = "mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8";

function portfolioCardImageAspect(isPreview: boolean): string {
  return isPreview ? "aspect-[5/3]" : "aspect-[4/3]";
}

function portfolioCardShell(isPreview: boolean): string {
  return `flex h-full flex-col overflow-hidden bg-white shadow-xl ${
    isPreview ? "rounded-xl" : "rounded-[1.75rem] md:rounded-[2rem]"
  }`;
}

function portfolioContainerClass(isPreview: boolean): string {
  return isPreview ? "mx-auto w-full max-w-none px-3" : PORTFOLIO_CONTAINER;
}

function portfolioMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function portfolioPink(theme: PortfolioTheme): string {
  return theme.primaryColor;
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book a session and bring your next creative project to life with focused, professional craft.";
    case "orders_only":
      return "Send an inquiry — let's shape your vision into work that stands out.";
    default:
      return "Bold creative work for brands, studios, and clients who expect more than ordinary.";
  }
}

function serviceCategoryLabel(service: PublicService): string {
  return service.type === "booking" ? "Bookable work" : "Project inquiry";
}

function renderCtaButton({
  previewButtons,
  label,
  href,
  className,
  style,
  testId,
}: {
  previewButtons: boolean;
  label: string;
  href: string;
  className: string;
  style: CSSProperties;
  testId: string;
}) {
  if (previewButtons) {
    return (
      <button type="button" disabled className={className} data-testid={testId} style={style}>
        {label}
      </button>
    );
  }
  return (
    <Link to={href} className={className} data-testid={testId} style={style}>
      {label}
    </Link>
  );
}

type CapabilityItem = {
  key: string;
  label: string;
};

function buildWhatWeDoItems(
  services: PublicService[] | undefined,
  copy: MiniSiteCopy,
): CapabilityItem[] {
  if (services && services.length > 0) {
    return services.slice(0, 8).map((service) => ({
      key: service.id,
      label: service.name,
    }));
  }

  const fromBenefits = copy.benefitsItems.filter(Boolean).slice(0, 8);
  if (fromBenefits.length > 0) {
    return fromBenefits.map((item, index) => ({ key: `benefit-${index}`, label: item }));
  }

  return copy.trustCards.slice(0, 6).map((card, index) => ({
    key: `trust-${index}`,
    label: card.title,
  }));
}

function PortfolioColorBlobs({ isPreview }: { isPreview: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`absolute rounded-full bg-pink-400/50 blur-3xl ${isPreview ? "-left-6 top-4 h-24 w-24" : "-left-16 top-8 h-56 w-56 md:h-72 md:w-72"}`}
      />
      <div
        className={`absolute rounded-full bg-purple-400/45 blur-3xl ${isPreview ? "right-0 top-12 h-20 w-20" : "right-0 top-16 h-48 w-48 md:h-64 md:w-64"}`}
      />
      <div
        className={`absolute rounded-full bg-cyan-300/50 blur-3xl ${isPreview ? "bottom-4 left-1/3 h-16 w-16" : "bottom-8 left-1/4 h-40 w-40 md:h-52 md:w-52"}`}
      />
      <div
        className={`absolute rounded-full bg-yellow-300/40 blur-3xl ${isPreview ? "bottom-8 right-8 h-14 w-14" : "bottom-12 right-1/4 h-36 w-36 md:h-44 md:w-44"}`}
      />
    </div>
  );
}

function PortfolioShowreelCard({
  media,
  variant,
  testId,
  isDark,
  primaryColor,
}: {
  media: MiniSiteVideoMedia;
  variant: PortfolioSectionVariant;
  testId: string;
  isDark: boolean;
  primaryColor: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPreview = variant === "preview";
  const imageAspect = portfolioCardImageAspect(isPreview);
  const muted = portfolioMutedText(isDark);

  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) {
    return null;
  }

  return (
    <article className={portfolioCardShell(isPreview)} data-testid="service-card">
      <div className={`relative w-full shrink-0 overflow-hidden ${imageAspect}`}>
        {isPlaying ? (
          <MiniSiteVideoEmbed media={media} variant={variant} testId={testId} className="h-full w-full" />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-center transition hover:brightness-105"
            data-testid={testId}
            style={{ background: `linear-gradient(135deg, ${primaryColor}18, #e0e7ff)` }}
          >
            <span
              className={`flex items-center justify-center rounded-full text-white ${isPreview ? "h-10 w-10 text-xs" : "h-14 w-14 text-base"}`}
              style={{ backgroundColor: primaryColor }}
              aria-hidden
            >
              ▶
            </span>
            <span className={`font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Play showreel
            </span>
          </button>
        )}
      </div>
      <div className={`flex flex-1 flex-col text-center ${isPreview ? "gap-1 p-3" : "gap-2 p-5 md:p-6"}`}>
        <h3
          className={`whitespace-normal font-bold uppercase tracking-wide ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
        >
          Showreel
        </h3>
        <p className={`italic ${isPreview ? "text-[10px]" : "text-xs md:text-sm"} ${muted}`}>Video showcase</p>
      </div>
    </article>
  );
}

function PortfolioProjectCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  showcaseImage,
  imageTestId,
}: {
  slug: string;
  service: PublicService;
  theme: PortfolioTheme;
  isDark: boolean;
  variant: PortfolioSectionVariant;
  showcaseImage?: MiniSiteImageMedia | null;
  imageTestId?: string;
}) {
  const isPreview = variant === "preview";
  const muted = portfolioMutedText(isDark);
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const pink = portfolioPink(theme);
  const imageAspect = portfolioCardImageAspect(isPreview);
  const monogram = service.name.charAt(0).toUpperCase();

  return (
    <article className={portfolioCardShell(isPreview)} data-testid="service-card">
      <div className={`relative w-full shrink-0 overflow-hidden ${imageAspect}`}>
        {showcaseImage && imageTestId ? (
          <MiniSiteSlotImage
            media={showcaseImage}
            testId={imageTestId}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(145deg, ${pink}20 0%, #c7d2fe 55%, ${pink}12 100%)` }}
            aria-hidden
          >
            <span
              className={`flex items-center justify-center rounded-2xl font-black text-white shadow-md ${
                isPreview ? "h-10 w-10 text-sm" : "h-14 w-14 text-xl"
              }`}
              style={{ backgroundColor: `${pink}cc` }}
            >
              {monogram}
            </span>
            <span className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[8px]" : "text-[10px]"} ${muted}`}>
              {serviceCategoryLabel(service)}
            </span>
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col text-center ${isPreview ? "gap-1.5 p-3" : "gap-2 p-5 md:p-6"}`}>
        <h3
          className={`min-h-[2.5em] whitespace-normal font-bold uppercase tracking-wide ${
            isPreview ? "text-xs leading-snug" : "text-sm leading-snug md:text-base"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {service.name}
        </h3>
        <p className={`italic ${isPreview ? "text-[10px]" : "text-xs md:text-sm"} ${muted}`}>{serviceCategoryLabel(service)}</p>
        {service.description ? (
          <p className={`line-clamp-2 min-h-[2.5em] whitespace-normal ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>
            {service.description}
          </p>
        ) : (
          <div className={isPreview ? "min-h-[2em]" : "min-h-[2.5em]"} aria-hidden />
        )}
        <div className={`flex flex-wrap items-center justify-center gap-2 ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>
          <PriceLabel service={service} />
          {duration ? <span>{duration}</span> : null}
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-auto inline-flex w-full items-center justify-center rounded-full font-bold text-white transition hover:brightness-110 ${
            isPreview ? "px-4 py-1.5 text-[10px]" : "px-6 py-2.5 text-xs md:text-sm"
          }`}
          style={{ backgroundColor: pink }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

/* ─── 1. HERO: colorful creative hero + white overlay card ─── */
export type PortfolioHeroSectionProps = PortfolioSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: PortfolioTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  operatingMode: OperatingMode;
  services: PublicService[] | undefined;
  serviceCount: number | null;
  templateImages?: MiniSiteTemplateImages;
};

export function PortfolioHeroSection({
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
}: PortfolioHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const heroVisual = templateImages?.heroVisual ?? null;
  const pink = portfolioPink(theme);
  const eyebrow = hasMeaningfulText(heroBadgeText) ? heroBadgeText : "Creative Agency";

  return (
    <header
      className={`relative overflow-hidden ${isPreview ? "py-6" : "py-12 md:py-16 lg:py-20"}`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <PortfolioColorBlobs isPreview={isPreview} />

      <div className={portfolioContainerClass(isPreview)}>
        <div
          className={`relative ${isPreview ? "" : "md:px-6"}`}
          data-testid={`${testIdPrefix}-portfolio-hero`}
        >
          <div
            className={`absolute rounded-[1.75rem] bg-pink-200/70 ${isPreview ? "-right-2 top-2 h-full w-[88%]" : "-right-4 top-4 h-full w-[92%] md:-right-6 md:top-6"}`}
            aria-hidden
          />

          <div
            className={`relative z-10 bg-white shadow-2xl ${isPreview ? "rounded-xl p-4" : "rounded-[1.75rem] p-8 md:rounded-[2rem] md:p-10 lg:p-12"} ${
              isDark ? "bg-slate-950/95 ring-1 ring-slate-800" : "border border-white/70"
            }`}
            data-testid={`${testIdPrefix}-portfolio-hero-visual`}
          >
            <div
              className={`grid ${heroVisual ? (isPreview ? "gap-4" : "gap-8 md:grid-cols-2 md:items-center md:gap-10") : ""} ${
                isPreview ? "gap-3" : "gap-5"
              }`}
            >
              <div className={`flex min-w-0 flex-col justify-center ${isPreview ? "gap-2" : "gap-4 md:gap-5"}`}>
                <p
                  className={`font-semibold uppercase tracking-[0.25em] ${isPreview ? "text-[9px]" : "text-[10px] md:text-xs"} ${muted}`}
                  data-testid={`${testIdPrefix}-hero-badge`}
                >
                  {eyebrow}
                </p>

                <h1
                  className={`whitespace-normal font-black leading-[1.05] ${isPreview ? "text-xl" : "text-4xl md:text-5xl lg:text-6xl"}`}
                  style={{ color: pink }}
                  data-testid={`${testIdPrefix}-hero-title`}
                >
                  {heroTitle}
                </h1>

                {heroSubtitle ? (
                  <p
                    className={`max-w-xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
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
                    className={`max-w-xl whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}
                    data-testid={`${testIdPrefix}-hero-body`}
                  >
                    {heroBody}
                  </p>
                ) : null}

                <div
                  className={`flex flex-wrap items-center ${isPreview ? "gap-2 pt-1" : "gap-3 pt-2"}`}
                  data-testid={`${testIdPrefix}-hero-cta-group`}
                >
                  {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                    ? renderCtaButton({
                        previewButtons,
                        label: primaryCtaLabel,
                        href: primaryBookingHref,
                        className: `${presentation.primaryButtonClass} rounded-full ${isPreview ? "" : "px-8"}`,
                        style: { backgroundColor: pink },
                        testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                      })
                    : null}
                  {showRequestCta && hasMeaningfulText(secondaryCtaLabel)
                    ? renderCtaButton({
                        previewButtons,
                        label: secondaryCtaLabel,
                        href: secondaryOrderHref,
                        className: `${presentation.secondaryButtonClass} rounded-full`,
                        style: { borderColor: pink, color: pink, backgroundColor: "transparent" },
                        testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                      })
                    : null}
                </div>

                {!business.logo_url ? (
                  <div className="sr-only" data-testid={`${testIdPrefix}-logo-placeholder`} aria-hidden>
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                ) : null}
              </div>

              {heroVisual ? (
                <div className={`flex w-full items-center justify-center ${isPreview ? "" : "md:justify-end"}`}>
                  <div
                    className={`w-full overflow-hidden ${isPreview ? "max-w-[12rem] rounded-lg" : "max-w-md rounded-2xl md:max-w-none md:rounded-3xl"} aspect-[4/3]`}
                  >
                    <MiniSiteSlotImage
                      media={heroVisual}
                      testId={`${testIdPrefix}-template-heroVisual`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── 2. ABOUT → What We Do compact service list ─── */
export type PortfolioAboutSectionProps = PortfolioSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: PortfolioTheme;
  isDark: boolean;
  services?: PublicService[] | undefined;
  copy: MiniSiteCopy;
  templateImages?: MiniSiteTemplateImages;
};

export function PortfolioAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
  services,
  copy,
  templateImages,
}: PortfolioAboutSectionProps) {
  const muted = portfolioMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";
  const pink = portfolioPink(theme);
  const whatWeDoItems = buildWhatWeDoItems(services, copy);
  const servicesImage = templateImages?.servicesImage ?? null;

  if (whatWeDoItems.length === 0 && !content) {
    return null;
  }

  return (
    <section
      className={`${portfolioContainerClass(isPreview)} bg-white ${isDark ? "bg-slate-950" : ""} ${isPreview ? "py-4" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div className={`text-center ${isPreview ? "mb-3" : "mb-6 md:mb-8"}`}>
        <h2
          className={`whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-4xl"}`}
          style={{ color: pink }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          {title || "What We Do"}
        </h2>
        {content ? (
          <p
            className={`mx-auto mt-2 max-w-2xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
            data-testid={`${testIdPrefix}-about-body`}
          >
            {content}
          </p>
        ) : null}
      </div>

      <div
        className={`grid items-start ${isPreview ? "gap-3" : "gap-6 md:grid-cols-[1fr_auto] md:gap-8"}`}
      >
        {whatWeDoItems.length > 0 ? (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${isPreview ? "gap-x-3 gap-y-2" : "gap-x-6 gap-y-3 md:gap-x-8 md:gap-y-4"}`}
            data-testid={`${testIdPrefix}-portfolio-capabilities`}
          >
            {whatWeDoItems.map((item) => (
              <div key={item.key} className={`flex items-center ${isPreview ? "gap-2" : "gap-3"}`}>
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full border-2 ${isPreview ? "h-5 w-5 text-[8px]" : "h-7 w-7 text-xs"}`}
                  style={{ borderColor: pink, color: pink }}
                  aria-hidden
                >
                  ✦
                </span>
                <p
                  className={`min-w-0 whitespace-normal font-semibold leading-snug ${
                    isPreview ? "text-[11px]" : "text-sm md:text-base"
                  } ${isDark ? "text-slate-100" : "text-slate-900"}`}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}

        {servicesImage ? (
          <div className={`mx-auto shrink-0 self-center ${isPreview ? "w-20" : "w-28 md:w-32"}`}>
            <MiniSiteSlotImage
              media={servicesImage}
              testId={`${testIdPrefix}-template-servicesImage`}
              className={`aspect-square w-full rounded-2xl object-cover shadow-md ${isPreview ? "rounded-xl" : ""}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─── 3. SERVICES → lavender portfolio grid ─── */
export type PortfolioWorkSectionProps = PortfolioSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: PortfolioTheme;
  isDark: boolean;
  templateImages?: MiniSiteTemplateImages;
  showreelVideo?: MiniSiteVideoMedia | null;
};

export function PortfolioWorkSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
  templateImages,
  showreelVideo = null,
}: PortfolioWorkSectionProps) {
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Our Portfolio";
  const pink = portfolioPink(theme);
  const featuredWorkImage = templateImages?.featuredWorkImage ?? null;
  const servicesImage = templateImages?.servicesImage ?? null;
  const heroVisual = templateImages?.heroVisual ?? null;
  const collaborationImage = templateImages?.collaborationImage ?? null;

  const projectImages = [featuredWorkImage, servicesImage, heroVisual, collaborationImage].filter(
    (img): img is MiniSiteImageMedia => img != null,
  );

  const imageTestIds = [
    `${testIdPrefix}-template-featuredWorkImage`,
    `${testIdPrefix}-template-servicesImage`,
    `${testIdPrefix}-template-heroVisual`,
    `${testIdPrefix}-template-collaborationImage`,
  ];

  return (
    <section
      className={`${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"} ${isDark ? "bg-indigo-950/40" : "bg-indigo-100"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={portfolioContainerClass(isPreview)} data-testid={`${testIdPrefix}-portfolio-work`}>
        <div className={`text-center ${isPreview ? "mb-4" : "mb-8 md:mb-10"}`}>
          {badgeText ? (
            <p
              className={`font-semibold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </p>
          ) : null}
          <h2
            id={`${testIdPrefix}-services-heading`}
            className={`mt-2 whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-4xl"}`}
            style={{ color: pink }}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {sectionTitle}
          </h2>
          <p className={`mx-auto mt-2 max-w-xl ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            Selected work and creative offerings — book or inquire directly.
          </p>
        </div>

        <div className={`grid items-stretch ${isPreview ? "gap-3" : "gap-4 md:grid-cols-2 md:gap-6 lg:gap-8"}`}>
          {showreelVideo ? (
            <PortfolioShowreelCard
              media={showreelVideo}
              variant={variant}
              testId={`${testIdPrefix}-template-showreelVideo`}
              isDark={isDark}
              primaryColor={pink}
            />
          ) : null}

          {services && services.length > 0
            ? services.map((service, index) => {
                const showcaseImage = projectImages[index] ?? null;
                const imageTestId = showcaseImage ? imageTestIds[index] : undefined;

                return (
                  <PortfolioProjectCard
                    key={service.id}
                    slug={publicSlug}
                    service={service}
                    theme={theme}
                    isDark={isDark}
                    variant={variant}
                    showcaseImage={showcaseImage}
                    imageTestId={imageTestId}
                  />
                );
              })
            : isPreview
              ? (
                  <PortfolioProjectCard
                    slug=""
                    service={{
                      id: "preview-sample",
                      name: "Brand identity",
                      description: "Your services appear here as creative work tiles on the live page.",
                      type: "booking",
                      price_cents: 25000,
                      duration_minutes: 60,
                      currency: "USD",
                      price_type: "fixed",
                      require_payment: false,
                      sort_order: 0,
                    }}
                    theme={theme}
                    isDark={isDark}
                    variant={variant}
                  />
                )
              : (
                  <p className={`text-center text-base ${muted}`}>
                    Work offerings will appear here.{" "}
                    <Link to={`/b/${publicSlug}/services`} className="font-bold hover:underline" style={{ color: pink }}>
                      View all
                    </Link>
                  </p>
                )}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. TRUST → compact process / stats ─── */
export type PortfolioProcessSectionProps = PortfolioSectionShell & {
  copy: MiniSiteCopy;
  theme: PortfolioTheme;
  isDark: boolean;
  showTrustStats: boolean;
  benefitsSectionEnabled: boolean;
};

export function PortfolioProcessSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  benefitsSectionEnabled,
}: PortfolioProcessSectionProps) {
  const benefits = !benefitsSectionEnabled ? copy.benefitsItems.filter(Boolean) : [];
  const isPreview = variant === "preview";
  const pink = portfolioPink(theme);
  const muted = portfolioMutedText(isDark);

  if (benefits.length === 0 && !showTrustStats) {
    return null;
  }

  return (
    <section
      className={`${portfolioContainerClass(isPreview)} ${isPreview ? "py-4" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      <div
        data-testid={`${testIdPrefix}-portfolio-process`}
        className={`grid ${isPreview ? "gap-4" : "gap-6 md:grid-cols-2 md:gap-8"}`}
      >
        {benefits.length > 0 ? (
          <div
            className={`rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100 ${isPreview ? "p-4" : "p-6 md:p-8"} ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            <p className={`font-semibold uppercase tracking-[0.16em] ${isPreview ? "text-[9px]" : "text-xs"}`} style={{ color: pink }}>
              How I work
            </p>
            <ol className={`mt-4 space-y-3 ${isPreview ? "space-y-2" : "md:space-y-4"}`}>
              {benefits.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className={`shrink-0 font-bold tabular-nums ${isPreview ? "text-lg" : "text-xl"}`} style={{ color: `${pink}66` }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className={`min-w-0 whitespace-normal ${isPreview ? "text-xs" : "text-sm md:text-base"} ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    {item}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div />
        )}

        {showTrustStats ? (
          <div
            className={`rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100 ${isPreview ? "p-4" : "p-6 md:p-8"} ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-semibold uppercase tracking-[0.16em] ${isPreview ? "text-[9px]" : "text-xs"}`} style={{ color: pink }}>
              Why clients choose this work
            </p>
            <div className={`mt-4 space-y-4 ${isPreview ? "space-y-3" : ""}`}>
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className={`border-b pb-3 last:border-0 last:pb-0 ${isDark ? "border-slate-700/60" : "border-slate-200/80"}`}>
                  <p className={`font-bold ${isPreview ? "text-base" : "text-xl md:text-2xl"}`} style={{ color: pink }}>
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{stat.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type PortfolioFaqSectionProps = PortfolioSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: PortfolioTheme;
  isDark: boolean;
};

export function PortfolioFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  theme,
  isDark,
}: PortfolioFaqSectionProps) {
  const muted = portfolioMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";
  const pink = portfolioPink(theme);

  return (
    <section
      className={`${portfolioContainerClass(isPreview)} ${isPreview ? "py-4" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 ${isPreview ? "p-4" : "p-6 md:p-8"} ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-bold ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`mt-4 divide-y ${isDark ? "divide-slate-700/60" : "divide-slate-200/80"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-l-4 py-3 pl-4 ${isPreview ? "py-2 pl-3" : ""}`}
                style={{ borderLeftColor: pink }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm"} ${muted}`}
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

/* ─── 5. CONTACT → contact info + social ─── */
export type PortfolioContactSectionProps = PortfolioSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: PortfolioTheme;
  isDark: boolean;
  primaryCtaLabel?: string;
  primaryBookingHref?: string;
  showBookingCta?: boolean;
  previewButtons?: boolean;
};

export function PortfolioContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
  primaryCtaLabel = "",
  primaryBookingHref = "",
  showBookingCta = false,
}: PortfolioContactSectionProps) {
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";
  const pink = portfolioPink(theme);
  const muted = portfolioMutedText(isDark);

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  const contactHeading = hasMeaningfulText(title) ? title : "Contact us";

  return (
    <section
      className={`${isPreview ? "py-4" : "py-12 md:py-16"} ${isDark ? "bg-pink-950/20" : "bg-gradient-to-b from-pink-50 to-white"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className={portfolioContainerClass(isPreview)}>
        <div
          className={`rounded-[1.75rem] bg-white shadow-xl ${isPreview ? "space-y-3 p-4" : "space-y-5 p-6 md:p-8 lg:p-10"} ${
            isDark ? "bg-slate-900/90 ring-1 ring-slate-700/50" : ""
          }`}
        >
          <div>
            <p className={`font-semibold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>Join our newsletter</p>
            <h2
              id={`${testIdPrefix}-contact-heading`}
              className={`mt-2 whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-3xl"}`}
              style={{ color: pink }}
              data-testid={`${testIdPrefix}-contact-title`}
            >
              {contactHeading}
            </h2>
          </div>

          <div className={`space-y-3 ${isPreview ? "text-xs" : "text-sm md:text-base"}`}>
            {hasAddress ? (
              <p className={`whitespace-normal ${isDark ? "text-slate-200" : "text-slate-800"}`}>{contactAddress}</p>
            ) : null}
            {hasPhone ? (
              <a href={`tel:${contactPhone}`} className="block font-bold hover:underline" style={{ color: pink }}>
                {contactPhone}
              </a>
            ) : null}
          </div>

          {entries.length > 0 ? (
            <div data-testid={`${testIdPrefix}-social-links`}>
              <p className={`mb-2 font-bold ${isPreview ? "text-xs" : "text-sm"}`} style={{ color: pink }}>
                Follow us
              </p>
              <div className={`flex flex-wrap gap-x-4 gap-y-2 ${isPreview ? "text-[10px]" : "text-sm"}`}>
                {entries.map((entry) => (
                  <div key={entry.key} data-testid={`${testIdPrefix}-${entry.key}`}>
                    <span className={`font-medium ${muted}`}>{entry.label}: </span>
                    <span>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-2xl ${isPreview ? "space-y-2 p-3" : "space-y-3 p-5"} ${isDark ? "bg-slate-800/60" : "bg-pink-50/80"}`}
            aria-hidden
          >
            <p className={`font-bold ${isPreview ? "text-xs" : "text-base"}`} style={{ color: pink }}>
              Contact us
            </p>
            <div className={`grid gap-2 ${isPreview ? "" : "md:grid-cols-2"}`}>
              <div className={`rounded-xl bg-white/80 px-3 py-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Name</div>
              <div className={`rounded-xl bg-white/80 px-3 py-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Email</div>
            </div>
            <div className={`rounded-xl bg-white/80 px-3 py-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Message</div>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
                  label: primaryCtaLabel,
                  href: primaryBookingHref,
                  className: `w-full rounded-full py-2.5 font-bold text-white ${isPreview ? "text-xs" : "text-sm"}`,
                  style: { backgroundColor: pink },
                  testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                })
              : (
                  <div
                    className={`rounded-full py-2.5 text-center font-bold text-white ${isPreview ? "text-xs" : "text-sm"}`}
                    style={{ backgroundColor: pink }}
                  >
                    Submit
                  </div>
                )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 6. BOOKING CTA → Start Today card on lavender ─── */
export type PortfolioBookingCtaSectionProps = PortfolioSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: PortfolioTheme;
  presentation: MiniSiteTemplatePresentation;
  templateImages?: MiniSiteTemplateImages;
};

export function PortfolioBookingCtaSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  showSecondary = false,
  theme,
  presentation,
  templateImages,
}: PortfolioBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;
  const pink = portfolioPink(theme);
  const collaborationImage = templateImages?.collaborationImage ?? null;

  return (
    <section
      className={`${isPreview ? "py-4" : "py-12 md:py-16"} ${theme.backgroundStyle === "dark" ? "bg-indigo-950/50" : "bg-indigo-100"}`}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <div className={portfolioContainerClass(isPreview)}>
        <div
          className={`mx-auto max-w-lg bg-white text-center shadow-2xl ${isPreview ? "rounded-xl p-5" : "rounded-[2rem] p-8 md:p-10 lg:p-12"}`}
          data-testid={`${testIdPrefix}-booking-cta-panel`}
        >
          {collaborationImage ? (
            <div className={`mx-auto overflow-hidden ${isPreview ? "mb-3 max-w-[5rem]" : "mb-5 max-w-[7rem] md:max-w-[9rem]"}`}>
              <MiniSiteSlotImage
                media={collaborationImage}
                testId={`${testIdPrefix}-template-collaborationImage`}
                className="w-full rounded-2xl object-cover"
              />
            </div>
          ) : (
            <div
              className={`mx-auto flex items-center justify-center rounded-2xl ${isPreview ? "mb-3 h-12 w-12 text-lg" : "mb-5 h-16 w-16 text-2xl md:h-20 md:w-20"}`}
              style={{ background: `linear-gradient(135deg, ${pink}22, #c7d2fe)` }}
              aria-hidden
            >
              ✦
            </div>
          )}

          <p
            className={`whitespace-normal font-black ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}
            style={{ color: pink }}
            data-testid={`${testIdPrefix}-booking-cta-heading`}
          >
            Start Today
          </p>
          <p className={`mx-auto mt-3 max-w-sm whitespace-normal ${isPreview ? "text-xs" : "text-sm md:text-base"} ${portfolioMutedText(false)}`}>
            Start a project or send an inquiry — let's build something bold together.
          </p>

          <div className={`mt-5 flex flex-col items-center justify-center gap-3 ${isPreview ? "mt-4" : "mt-6"}`}>
            {renderCtaButton({
              previewButtons,
              label: primaryLabel,
              href: primaryHref,
              className: `${presentation.primaryButtonClass} rounded-full ${isPreview ? "px-6" : "px-10"}`,
              style: { backgroundColor: pink },
              testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
            })}
            {showSecondaryCta
              ? renderCtaButton({
                  previewButtons,
                  label: secondaryLabel!,
                  href: secondaryHref!,
                  className: `${presentation.secondaryButtonClass} rounded-full`,
                  style: { borderColor: pink, color: pink, backgroundColor: "transparent" },
                  testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                })
              : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export type PortfolioGallerySectionProps = PortfolioSectionShell & {
  theme: PortfolioTheme;
  isDark: boolean;
};

export function PortfolioGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: PortfolioGallerySectionProps) {
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const pink = portfolioPink(theme);

  return (
    <section
      className={`${portfolioContainerClass(isPreview)} text-center ${isPreview ? "py-4" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`rounded-2xl border-2 border-dashed ${isPreview ? "p-4" : "p-8 md:p-10"}`}
        style={{ borderColor: `${pink}44`, backgroundColor: `${pink}08` }}
      >
        <h2
          id={`${testIdPrefix}-gallery-heading`}
          className={`font-bold ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          Gallery
        </h2>
        <p className={`mx-auto mt-2 max-w-lg whitespace-normal ${isPreview ? "text-xs" : "text-base"} ${muted}`}>
          Photo gallery coming soon. Showcase your work here.
        </p>
      </div>
    </section>
  );
}
