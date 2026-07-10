import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { PriceLabel } from "@/components/PriceLabel";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
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

const PORTFOLIO_CONTAINER = "mx-auto w-full max-w-[75rem] px-5 sm:px-6 md:px-8 lg:px-10";

function portfolioMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function buttonRadiusClass(buttonStyle: MiniSiteButtonStyle): string {
  switch (buttonStyle) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-xl";
  }
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

type CapabilityCard = {
  key: string;
  label: string;
  value: string;
  detail?: string;
};

function buildCapabilityCards({
  copy,
  serviceCount,
}: {
  copy: MiniSiteCopy;
  serviceCount: number | null;
}): CapabilityCard[] {
  const benefits = copy.benefitsItems.filter(Boolean);
  const trust = copy.trustCards;

  const work: CapabilityCard = {
    key: "work",
    label: "Selected work",
    value:
      serviceCount != null && serviceCount > 0
        ? `${serviceCount} offering${serviceCount === 1 ? "" : "s"}`
        : (trust[0]?.title ?? "Creative services"),
    detail: trust[0]?.subtitle ?? benefits[0],
  };

  const process: CapabilityCard = {
    key: "process",
    label: "Creative process",
    value: benefits[1] ?? trust[1]?.title ?? copy.benefitsSectionTitle,
    detail: trust[1]?.subtitle ?? benefits[2],
  };

  const trustCard: CapabilityCard = {
    key: "trust",
    label: "Client trust",
    value: trust[2]?.title ?? benefits[2] ?? trust[0]?.title ?? "Premium craft",
    detail: trust[2]?.subtitle ?? trust[1]?.subtitle,
  };

  return [work, process, trustCard];
}

function PortfolioWorkCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  index,
}: {
  slug: string;
  service: PublicService;
  theme: PortfolioTheme;
  isDark: boolean;
  variant: PortfolioSectionVariant;
  index: number;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 70 : 120)
      ? `${service.description.slice(0, variant === "preview" ? 70 : 120).trim()}…`
      : service.description
    : null;
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const staggered = !isPreview && index % 2 === 1;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden ${
        isPreview ? "rounded-lg" : "rounded-2xl lg:rounded-3xl"
      } ${staggered ? "md:mt-10" : ""} ${
        isDark ? "bg-slate-900/60 ring-1 ring-slate-700/60" : "bg-white ring-1 ring-slate-900/10 shadow-lg"
      }`}
      data-testid="service-card"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${isPreview ? "h-1" : ""}`}
        style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor})` }}
        aria-hidden
      />
      <div className={`flex flex-1 flex-col ${isPreview ? "p-3" : "p-6 md:p-8 lg:p-9"}`}>
        <div className="flex items-start justify-between gap-4">
          <p
            className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-[11px] md:text-xs"}`}
            style={{ color: theme.accentColor }}
          >
            {serviceCategoryLabel(service)}
          </p>
          <span
            className={`shrink-0 font-black tabular-nums ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`}
            style={{ color: `${theme.primaryColor}30` }}
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <h3
          className={`mt-3 whitespace-normal font-black uppercase leading-[1.05] tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl lg:text-3xl"
          } ${isDark ? "text-slate-50" : "text-slate-900"}`}
        >
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p className={`mt-3 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            {descriptionPreview}
          </p>
        ) : null}
        <div className={`mt-4 flex flex-wrap items-center gap-3 ${isPreview ? "text-[10px]" : "text-sm md:text-base"} ${muted}`}>
          <span
            className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}
          >
            <PriceLabel service={service} />
          </span>
          {duration ? <span>{duration}</span> : null}
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-auto inline-flex w-full items-center justify-center font-bold uppercase tracking-wide text-white transition hover:brightness-110 ${
            isPreview ? "mt-4 rounded-md py-2 text-[10px]" : "mt-8 rounded-xl py-4 text-sm md:text-base"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

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
  copy,
  theme,
  presentation,
  primaryCtaLabel,
  secondaryCtaLabel,
  primaryBookingHref,
  secondaryOrderHref,
  showBookingCta,
  showRequestCta,
  operatingMode,
  services,
  serviceCount,
  templateImages,
}: PortfolioHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const heroVisual = templateImages?.heroVisual ?? null;
  const featuredWorkImage = templateImages?.featuredWorkImage ?? null;
  const capabilityCards = buildCapabilityCards({ copy, serviceCount });
  const highlightServices = (services ?? []).slice(0, 3);
  const chips = [
    ...copy.benefitsItems.filter(Boolean).slice(0, 2),
    ...copy.trustCards.map((card) => card.subtitle).filter(Boolean),
  ].slice(0, 3);

  return (
    <div className={PORTFOLIO_CONTAINER}>
      <header
        className={isPreview ? "pb-4 pt-2" : "pb-10 pt-6 md:pb-14 md:pt-10 lg:pb-16"}
        data-testid={`${testIdPrefix}-hero`}
      >
        <div
          className={`portfolio-hero-grid grid items-end ${
            isPreview ? "gap-4" : "gap-8 md:grid-cols-[1.12fr_0.88fr] md:gap-10 lg:gap-14"
          }`}
          data-testid={`${testIdPrefix}-portfolio-hero`}
        >
          <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-5 md:space-y-6 lg:space-y-7"}`}>
            <p
              className={`inline-flex font-bold uppercase tracking-[0.22em] ${
                isPreview ? "text-[9px]" : "text-xs md:text-sm"
              }`}
              style={{ color: theme.accentColor }}
              data-testid={`${testIdPrefix}-hero-badge`}
            >
              {heroBadgeText}
            </p>

            <h1
              className={`${presentation.heroTitleClass} whitespace-normal ${isDark ? "text-slate-50" : "text-slate-900"}`}
              data-testid={`${testIdPrefix}-hero-title`}
            >
              {heroTitle}
            </h1>

            {heroSubtitle ? (
              <p
                className={`max-w-xl whitespace-normal font-semibold uppercase tracking-wide ${
                  isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"
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
                className={`max-w-xl whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base lg:text-lg"} ${muted}`}
                data-testid={`${testIdPrefix}-hero-body`}
              >
                {heroBody}
              </p>
            ) : null}

            <div
              className={`flex flex-col ${isPreview ? "gap-2" : "gap-3 sm:flex-row sm:flex-wrap"}`}
              data-testid={`${testIdPrefix}-hero-cta-group`}
            >
              {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                ? renderCtaButton({
                    previewButtons,
                    label: primaryCtaLabel,
                    href: primaryBookingHref,
                    className: presentation.primaryButtonClass,
                    style: { backgroundColor: theme.primaryColor },
                    testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                  })
                : null}
              {showRequestCta && hasMeaningfulText(secondaryCtaLabel)
                ? renderCtaButton({
                    previewButtons,
                    label: secondaryCtaLabel,
                    href: secondaryOrderHref,
                    className: presentation.secondaryButtonClass,
                    style: { borderColor: theme.accentColor, color: theme.accentColor },
                    testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                  })
                : null}
            </div>
          </div>

          <div
            className={`portfolio-hero-visual relative overflow-hidden ${isPreview ? "min-h-[10rem]" : "min-h-[18rem] md:min-h-[22rem] lg:min-h-[26rem]"}`}
            data-testid={`${testIdPrefix}-portfolio-hero-visual`}
          >
            {heroVisual ? (
              <MiniSiteSlotImage
                media={heroVisual}
                className="absolute inset-0 h-full w-full"
                testId={`${testIdPrefix}-template-heroVisual`}
              />
            ) : null}
            <div
              className={`absolute ${isPreview ? "-right-2 top-0 h-16 w-16" : "-right-4 top-0 h-28 w-28 md:h-36 md:w-36"} rounded-full blur-2xl`}
              style={{ backgroundColor: `${theme.primaryColor}25` }}
              aria-hidden
            />
            <div
              className={`absolute ${isPreview ? "left-0 top-6 h-10 w-10 rotate-12" : "left-2 top-8 h-16 w-16 rotate-12 md:h-20 md:w-20"} ${buttonRadiusClass(theme.buttonStyle)}`}
              style={{ backgroundColor: `${theme.accentColor}20` }}
              aria-hidden
            />
            <div
              className={`relative z-10 flex h-full flex-col ${isPreview ? "gap-2 p-3" : "gap-4 p-5 md:p-6"} ${
                isDark ? "bg-slate-950/80 ring-1 ring-slate-700/60" : "bg-white shadow-2xl ring-1 ring-slate-900/10"
              } ${heroVisual ? (isDark ? "bg-slate-950/70" : "bg-white/90") : ""} ${isPreview ? "rounded-xl" : "rounded-2xl lg:rounded-3xl"}`}
            >
              <div className="flex items-start justify-between gap-3">
                {featuredWorkImage && !heroVisual ? (
                  <MiniSiteSlotImage
                    media={featuredWorkImage}
                    className={`shrink-0 ${isPreview ? "h-12 w-12" : "h-16 w-16 md:h-20 md:w-20"} ${buttonRadiusClass(theme.buttonStyle)}`}
                    testId={`${testIdPrefix}-template-featuredWorkImage`}
                  />
                ) : !heroVisual ? (
                  <div
                    className={`flex items-center justify-center font-black ${
                      isPreview ? "h-12 w-12 text-xl" : "h-16 w-16 text-3xl md:h-20 md:w-20 md:text-4xl"
                    } ${buttonRadiusClass(theme.buttonStyle)}`}
                    style={{ backgroundColor: theme.primaryColor, color: "#fff" }}
                    data-testid={`${testIdPrefix}-logo-placeholder`}
                  >
                    {monogram}
                  </div>
                ) : null}
                {serviceCount != null && serviceCount > 0 ? (
                  <p className={`text-right font-black uppercase leading-none ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}>
                    <span style={{ color: theme.primaryColor }}>{serviceCount}</span>
                    <span className={`block ${isPreview ? "text-[8px]" : "text-[10px] md:text-xs"} ${muted}`}>works</span>
                  </p>
                ) : null}
              </div>

              {highlightServices.length > 0 ? (
                <div className={`mt-auto space-y-2 ${isPreview ? "" : "md:space-y-3"}`}>
                  {highlightServices.map((service, index) => (
                    <div
                      key={service.id}
                      className={`border-l-4 ${isPreview ? "px-2 py-1.5" : "px-3 py-2 md:px-4 md:py-3"} ${
                        isDark ? "bg-slate-900/80" : "bg-slate-50"
                      } ${index === 1 && !isPreview ? "ml-4 md:ml-8" : ""} ${index === 2 && !isPreview ? "ml-2 md:ml-4" : ""}`}
                      style={{ borderLeftColor: index % 2 === 0 ? theme.primaryColor : theme.accentColor }}
                    >
                      <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-[10px] md:text-xs"} ${muted}`}>
                        {serviceCategoryLabel(service)}
                      </p>
                      <p className={`whitespace-normal font-semibold ${isPreview ? "text-[11px]" : "text-sm md:text-base"}`}>
                        {service.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {chips.length > 0 ? (
                <div className={`flex flex-wrap gap-1.5 ${highlightServices.length > 0 ? "pt-1" : "mt-auto"}`}>
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className={`font-semibold uppercase tracking-wide ${
                        isPreview ? "rounded px-1.5 py-0.5 text-[8px]" : "rounded-md px-2 py-1 text-[10px] md:text-xs"
                      }`}
                      style={{ backgroundColor: `${theme.accentColor}18`, color: theme.accentColor }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${isPreview ? "mt-3 gap-2" : "mt-10 gap-4 lg:mt-12 lg:gap-6"}`}
          data-testid={`${testIdPrefix}-portfolio-capabilities`}
        >
          {capabilityCards.map((card) => (
            <div
              key={card.key}
              className={`${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-6 lg:p-7"} ${
                isDark ? "bg-slate-900/70 ring-1 ring-slate-700/60" : "bg-slate-900 text-white shadow-xl"
              }`}
            >
              <p className={`font-bold uppercase tracking-[0.18em] ${isPreview ? "text-[8px]" : "text-[10px] md:text-xs"}`} style={{ color: theme.accentColor }}>
                {card.label}
              </p>
              <p className={`mt-2 whitespace-normal font-black uppercase leading-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl lg:text-3xl"}`}>
                {card.value}
              </p>
              {card.detail ? (
                <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? "text-slate-300" : "text-slate-300"}`}>
                  {card.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export type PortfolioAboutSectionProps = PortfolioSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: PortfolioTheme;
  isDark: boolean;
};

export function PortfolioAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: PortfolioAboutSectionProps) {
  const muted = portfolioMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`} data-testid={`${testIdPrefix}-about`}>
      <div className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-[0.35fr_0.65fr] lg:gap-12"}`}>
        <div className={isPreview ? "" : "lg:pt-4"}>
          <p
            className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`}
            style={{ color: theme.accentColor }}
            data-testid={`${testIdPrefix}-about-title`}
          >
            Studio note
          </p>
          <p
            className={`mt-4 font-black leading-none ${isPreview ? "text-4xl" : "text-6xl md:text-7xl lg:text-8xl"}`}
            style={{ color: `${theme.primaryColor}20` }}
            aria-hidden
          >
            “
          </p>
        </div>
        <div className="min-w-0">
          <h2
            className={`whitespace-normal font-black uppercase leading-[1.02] tracking-tight ${
              isPreview ? "text-lg" : "text-3xl md:text-4xl lg:text-5xl"
            } ${isDark ? "text-slate-50" : "text-slate-900"}`}
          >
            {title}
          </h2>
          {content ? (
            <p
              className={`mt-5 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"} ${muted}`}
              data-testid={`${testIdPrefix}-about-body`}
            >
              {content}
            </p>
          ) : (
            <p className={`mt-5 text-sm italic ${muted}`}>Studio statement will appear here.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export type PortfolioWorkSectionProps = PortfolioSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: PortfolioTheme;
  isDark: boolean;
  templateImages?: MiniSiteTemplateImages;
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
}: PortfolioWorkSectionProps) {
  const muted = portfolioMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Work & services";
  const servicesImage = templateImages?.servicesImage ?? null;

  return (
    <section
      className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div data-testid={`${testIdPrefix}-portfolio-work`}>
        <div className={`flex flex-wrap items-end justify-between gap-4 ${isPreview ? "mb-4" : "mb-8 md:mb-10"}`}>
          <div>
            <p className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Selected work
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-2 whitespace-normal font-black uppercase leading-none tracking-tight ${
                isPreview ? "text-lg" : "text-3xl md:text-4xl lg:text-5xl"
              } ${isDark ? "text-slate-50" : "text-slate-900"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-2 max-w-2xl whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
              Offerings shaped as creative project tiles — book or inquire directly.
            </p>
          </div>
          {badgeText ? (
            <span
              className={`font-bold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs md:text-sm"} ${muted}`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {servicesImage ? (
          <MiniSiteSectionAccentImage
            media={servicesImage}
            variant={variant}
            testId={`${testIdPrefix}-template-servicesImage`}
          />
        ) : null}

        {services && services.length > 0 ? (
          <div className={`grid gap-4 ${isPreview ? "" : "md:grid-cols-2 md:gap-8 lg:gap-10"}`}>
            {services.map((service, index) => (
              <PortfolioWorkCard
                key={service.id}
                slug={publicSlug}
                service={service}
                theme={theme}
                isDark={isDark}
                variant={variant}
                index={index}
              />
            ))}
          </div>
        ) : isPreview ? (
          <PortfolioWorkCard
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
            index={0}
          />
        ) : (
          <p className={`text-base ${muted}`}>
            Work offerings will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-bold uppercase hover:underline" style={{ color: theme.primaryColor }}>
              View all
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

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

  if (benefits.length === 0 && !showTrustStats) {
    return null;
  }

  return (
    <section
      className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      <div
        data-testid={`${testIdPrefix}-portfolio-process`}
        className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12"}`}
      >
        {benefits.length > 0 ? (
          <div data-testid={`${testIdPrefix}-benefits-strip`}>
            <p className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              How I work
            </p>
            <h2 className={`mt-2 font-black uppercase tracking-tight ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}>
              Creative process
            </h2>
            <ol className={`mt-5 space-y-4 ${isPreview ? "mt-3 space-y-3" : "lg:mt-8 lg:space-y-6"}`}>
              {benefits.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span
                    className={`shrink-0 font-black leading-none ${isPreview ? "text-2xl" : "text-4xl md:text-5xl"}`}
                    style={{ color: theme.primaryColor }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className={`min-w-0 whitespace-normal pt-1 font-medium leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
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
            className={`${isPreview ? "rounded-lg p-3" : "rounded-2xl p-6 md:p-8 lg:p-10"} ${
              isDark ? "bg-slate-900/70 ring-1 ring-slate-700/60" : "bg-slate-900 text-white"
            }`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Why clients choose this work
            </p>
            <div className={`mt-5 space-y-5 ${isPreview ? "mt-3 space-y-3" : "lg:mt-6 lg:space-y-6"}`}>
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className={`border-b pb-4 last:border-0 last:pb-0 ${isDark ? "border-slate-700/60" : "border-white/15"}`}>
                  <p className={`font-black uppercase leading-tight ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`} style={{ color: theme.primaryColor }}>
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm md:text-base"} text-slate-300`}>
                    {stat.subtitle}
                  </p>
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

  return (
    <section
      className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`grid ${isPreview ? "gap-3" : "gap-8 md:grid-cols-[0.4fr_0.6fr] md:gap-10"}`}>
        <div>
          <p className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
            Project FAQ
          </p>
          <h2
            id={`${testIdPrefix}-faq-heading`}
            className={`mt-2 whitespace-normal font-black uppercase tracking-tight ${
              isPreview ? "text-sm" : "text-2xl md:text-3xl lg:text-4xl"
            } ${isDark ? "text-slate-50" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-faq-title`}
          >
            {title}
          </h2>
        </div>
        <dl className={`space-y-4 ${isPreview ? "space-y-2" : "md:space-y-5"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-l-4 ${isPreview ? "py-2 pl-3" : "py-4 pl-5 md:py-5 md:pl-6"}`}
                style={{ borderLeftColor: theme.primaryColor }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-bold uppercase tracking-wide ${
                    isPreview ? "text-[11px]" : "text-sm md:text-base"
                  } ${isDark ? "text-slate-100" : "text-slate-900"}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}
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

export type PortfolioContactSectionProps = PortfolioSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: PortfolioTheme;
  isDark: boolean;
};

export function PortfolioContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: PortfolioContactSectionProps) {
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-12"} ${
          isDark ? "bg-slate-900/70 ring-1 ring-slate-700/60" : "bg-slate-900 text-white"
        } ${isPreview ? "rounded-lg p-4" : "rounded-2xl p-6 md:p-10 lg:p-12"}`}
      >
        <div className="min-w-0">
          <p className={`font-bold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
            Collaboration
          </p>
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`mt-2 whitespace-normal font-black uppercase leading-tight tracking-tight ${
              isPreview ? "text-base" : "text-3xl md:text-4xl lg:text-5xl"
            }`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {hasMeaningfulText(title) ? title : "Let's work together"}
          </h2>
          <p className={`mt-3 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} text-slate-300`}>
            Reach out to start a project, ask a question, or explore availability.
          </p>
        </div>

        <div className={`space-y-4 ${isPreview ? "space-y-2" : "md:space-y-5"}`}>
          {hasPhone ? (
            <div>
              <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"} text-slate-400`}>Phone</p>
              <a
                href={`tel:${contactPhone}`}
                className={`mt-1 inline-block font-black hover:underline ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {contactPhone}
              </a>
            </div>
          ) : null}
          {hasAddress ? (
            <div>
              <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"} text-slate-400`}>Studio</p>
              <p className={`mt-1 whitespace-normal font-medium leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
                {contactAddress}
              </p>
            </div>
          ) : null}
          {entries.length > 0 ? (
            <div
              className={`flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 ${isDark ? "border-slate-700/60" : "border-white/15"} ${
                isPreview ? "text-[10px]" : "text-sm md:text-base"
              }`}
              data-testid={`${testIdPrefix}-social-links`}
            >
              {entries.map((entry) => (
                <div key={entry.key} data-testid={`${testIdPrefix}-${entry.key}`}>
                  <span className="font-bold uppercase tracking-wide text-slate-400">{entry.label}: </span>
                  <span>{entry.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;
  const collaborationImage = templateImages?.collaborationImage ?? null;

  return (
    <section className={`${PORTFOLIO_CONTAINER} ${isPreview ? "py-4" : "py-12 md:py-16 lg:py-20"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`relative overflow-hidden ${isPreview ? "rounded-lg p-4" : "rounded-2xl p-8 md:p-10 lg:p-12"} ${
          isDark ? "bg-slate-900/80 ring-1 ring-slate-700/60" : "bg-slate-900 text-white shadow-2xl"
        }`}
      >
        <div
          className={`absolute ${isPreview ? "-right-6 -top-6 h-20 w-20" : "-right-10 -top-10 h-32 w-32 md:h-40 md:w-40"} rotate-12 ${buttonRadiusClass(theme.buttonStyle)}`}
          style={{ backgroundColor: `${theme.primaryColor}30` }}
          aria-hidden
        />
        <div className={`relative flex flex-col justify-between gap-6 ${isPreview ? "" : "md:flex-row md:items-center md:gap-10"}`}>
          {collaborationImage ? (
            <MiniSiteSectionAccentImage
              media={collaborationImage}
              variant={variant}
              testId={`${testIdPrefix}-template-collaborationImage`}
              className={`shrink-0 ${isPreview ? "max-w-[8rem]" : "max-w-xs md:max-w-sm"}`}
            />
          ) : null}
          <div className="min-w-0">
            <p className={`font-black uppercase leading-tight tracking-tight ${isPreview ? "text-base" : "text-3xl md:text-4xl lg:text-5xl"}`}>
              Ready to create?
            </p>
            <p className={`mt-2 max-w-xl ${isPreview ? "text-[11px]" : "text-sm md:text-base lg:text-lg"} text-slate-300`}>
              Start a project or send an inquiry — let's build something bold together.
            </p>
          </div>
          <div className={`flex w-full shrink-0 flex-col ${isPreview ? "gap-2" : "gap-3 sm:min-w-[18rem] sm:flex-row md:w-auto"}`}>
            {renderCtaButton({
              previewButtons,
              label: primaryLabel,
              href: primaryHref,
              className: presentation.primaryButtonClass,
              style: { backgroundColor: theme.primaryColor },
              testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
            })}
            {showSecondaryCta
              ? renderCtaButton({
                  previewButtons,
                  label: secondaryLabel!,
                  href: secondaryHref!,
                  className: presentation.secondaryButtonClass,
                  style: { borderColor: theme.accentColor, color: theme.accentColor, backgroundColor: "transparent" },
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

  return (
    <section
      className={`${PORTFOLIO_CONTAINER} text-center ${isPreview ? "py-4" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`border-2 border-dashed ${isPreview ? "rounded-lg p-4" : "rounded-2xl p-8 md:p-12"}`}
        style={{ borderColor: `${theme.accentColor}55`, backgroundColor: `${theme.accentColor}08` }}
      >
        <div
          className={`mx-auto mb-3 flex items-center justify-center font-black ${
            isPreview ? "h-10 w-10 text-lg" : "h-14 w-14 text-2xl"
          } ${buttonRadiusClass(theme.buttonStyle)}`}
          style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
          aria-hidden
        >
          +
        </div>
        <h2
          id={`${testIdPrefix}-gallery-heading`}
          className={`font-black uppercase tracking-wide ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
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
