import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import {
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import type { MiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteCopy,
  MiniSiteSocialLinks,
} from "@/types/miniSite";
import { formatDuration, serviceActionLabel, serviceTypeIcon } from "@/utils/format";

export type ServiceSectionVariant = "full" | "preview";

type ServiceSectionShell = {
  variant?: ServiceSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type ServiceTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

function serviceMutedText(isDark: boolean): string {
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
      return "Professional service you can book online — fast scheduling, clear pricing, reliable results.";
    case "orders_only":
      return "Tell us what you need and get a clear quote — local professionals ready to help.";
    default:
      return "Book service appointments or request a quote online — trusted local help when you need it.";
  }
}

function ServiceOfferingCard({
  slug,
  service,
  theme,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  theme: ServiceTheme;
  isDark: boolean;
  variant: ServiceSectionVariant;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 70 : 120)
      ? `${service.description.slice(0, variant === "preview" ? 70 : 120).trim()}…`
      : service.description
    : null;
  const muted = serviceMutedText(isDark);
  const radius = buttonRadiusClass(theme.buttonStyle);
  const isPreview = variant === "preview";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden shadow-lg ${
        isPreview ? "rounded-xl" : "rounded-2xl"
      } ${isDark ? "bg-slate-900/80 ring-1 ring-slate-700/80" : "bg-white ring-1 ring-slate-200/80"}`}
      data-testid="service-card"
    >
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
      <div className={isPreview ? "flex flex-1 flex-col p-3" : "flex flex-1 flex-col p-5 md:p-6"}>
        <div className="flex items-start gap-3 md:gap-4">
          <div
            className={`flex shrink-0 items-center justify-center ${
              isPreview ? "h-10 w-10 rounded-lg text-lg" : "h-14 w-14 rounded-2xl text-2xl"
            }`}
            style={{
              background: `linear-gradient(145deg, ${theme.primaryColor}22, ${theme.accentColor}18)`,
            }}
            aria-hidden
          >
            {serviceTypeIcon(service.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`whitespace-normal font-extrabold tracking-tight ${
                  isPreview ? "text-xs" : "text-lg md:text-xl"
                } ${isDark ? "text-slate-100" : "text-slate-900"}`}
              >
                {service.name}
              </h3>
              {!isPreview ? <TypeBadge type={service.type} /> : null}
            </div>
            {descriptionPreview ? (
              <p className={`mt-1.5 whitespace-normal leading-snug ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
                {descriptionPreview}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-2 ${
            isPreview ? "rounded-md px-2 py-1.5 text-[10px]" : "rounded-xl px-3 py-2.5 text-sm"
          } ${isDark ? "bg-slate-800/80" : "bg-slate-50"}`}
        >
          <PriceLabel service={service} />
          {duration ? <span className={muted}>{duration}</span> : null}
          <span
            className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"}`}
            style={{ color: theme.accentColor }}
          >
            {service.type === "booking" ? "Book now" : "Request quote"}
          </span>
        </div>

        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-4 block w-full px-4 py-3 text-center font-bold text-white shadow-md transition hover:brightness-105 ${radius} ${
            isPreview ? "py-2 text-[11px]" : "text-sm md:text-base"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
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

export type ServiceHeroSectionProps = ServiceSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: ServiceTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  operatingMode: OperatingMode;
  serviceCount: number | null;
  benefitHighlights: string[];
  showHeroTrustPills: boolean;
};

export function ServiceHeroSection({
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
  serviceCount,
  benefitHighlights,
  showHeroTrustPills,
}: ServiceHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = serviceMutedText(isDark);
  const isPreview = variant === "preview";
  const panelSurface = isDark ? "bg-slate-950/85 text-slate-100" : "bg-slate-900 text-white";

  return (
    <header
      className={`relative overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-3xl"}`}
      data-testid={`${testIdPrefix}-hero`}
      style={{
        background: isDark
          ? `linear-gradient(135deg, ${theme.primaryColor}28 0%, rgba(15,23,42,0.95) 45%, ${theme.accentColor}18 100%)`
          : `linear-gradient(135deg, ${theme.primaryColor}14 0%, #ffffff 42%, ${theme.accentColor}10 100%)`,
      }}
    >
      <div
        className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:p-8 lg:p-10"}`}
        data-testid={`${testIdPrefix}-hero-content`}
      >
        <div className={`min-w-0 ${isPreview ? "space-y-1.5" : "space-y-4 md:space-y-5"}`}>
          <div className="flex flex-wrap items-center gap-2">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className={`shrink-0 object-cover ${isPreview ? "h-9 w-9 rounded-lg" : "h-12 w-12 rounded-xl shadow-sm"}`}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center font-bold ${
                  isPreview ? "h-9 w-9 rounded-lg text-sm" : "h-12 w-12 rounded-xl text-lg"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
                data-testid={`${testIdPrefix}-logo-placeholder`}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p
              className={`inline-flex rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wide ${
                isPreview ? "text-[10px]" : "text-xs"
              }`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}18` }}
              data-testid={`${testIdPrefix}-hero-badge`}
            >
              {heroBadgeText}
            </p>
          </div>

          <h1
            className={`${presentation.heroTitleClass} whitespace-normal ${isDark ? "text-slate-50" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-hero-title`}
          >
            {heroTitle}
          </h1>

          {heroSubtitle ? (
            <p
              className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
              data-testid={`${testIdPrefix}-hero-subtitle`}
            >
              {heroSubtitle}
            </p>
          ) : (
            <p className={`whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>
              {heroIntro(operatingMode)}
            </p>
          )}

          {heroBody ? (
            <p
              className={`max-w-xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
              data-testid={`${testIdPrefix}-hero-body`}
            >
              {heroBody}
            </p>
          ) : null}

          {benefitHighlights.length > 0 ? (
            <ul className={`grid ${isPreview ? "gap-1" : "gap-2 sm:grid-cols-2"}`}>
              {benefitHighlights.map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-2 whitespace-normal ${isPreview ? "text-[11px]" : "text-sm"} ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <span
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {showHeroTrustPills ? (
            <div
              className={`flex flex-wrap gap-2 ${isPreview ? "pt-1" : "pt-2"}`}
              data-testid={`${testIdPrefix}-hero-trust-row`}
            >
              {copy.trustCards.map((stat) => (
                <span
                  key={stat.subtitle}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                    isPreview ? "text-[10px]" : "text-xs"
                  } ${isDark ? "bg-slate-800/80 text-slate-200" : "bg-white/90 text-slate-800 shadow-sm"}`}
                >
                  <span style={{ color: theme.primaryColor }}>{stat.title}</span>
                  <span className={muted}>{stat.subtitle}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside
          className={`${panelSurface} ${isPreview ? "rounded-lg p-3 shadow-lg" : "rounded-2xl p-5 shadow-2xl md:p-6"}`}
          data-testid={`${testIdPrefix}-hero-cta-group`}
        >
          <p className={`font-bold uppercase tracking-wider ${isPreview ? "text-[10px]" : "text-xs"} text-slate-300`}>
            Get started today
          </p>
          <p className={`mt-1 font-extrabold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>
            {serviceCount != null && serviceCount > 0
              ? `${serviceCount} service${serviceCount === 1 ? "" : "s"} available`
              : "Book or request service"}
          </p>

          <ul className={`mt-3 space-y-2 ${isPreview ? "text-[11px]" : "text-sm"}`}>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel) ? (
              <li className="flex items-center gap-2 whitespace-normal text-slate-200">
                <span className="text-base" aria-hidden>
                  ⚡
                </span>
                <span>{primaryCtaLabel}</span>
              </li>
            ) : null}
            {showRequestCta && hasMeaningfulText(secondaryCtaLabel) ? (
              <li className="flex items-center gap-2 whitespace-normal text-slate-200">
                <span className="text-base" aria-hidden>
                  📋
                </span>
                <span>{secondaryCtaLabel}</span>
              </li>
            ) : null}
            {benefitHighlights.slice(0, 2).map((item) => (
              <li key={`panel-${item}`} className="flex items-center gap-2 whitespace-normal text-slate-300">
                <span className="font-bold text-emerald-400" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className={`mt-4 flex flex-col ${isPreview ? "gap-1.5" : "gap-3"}`}>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
                  testIdPrefix,
                  label: primaryCtaLabel,
                  href: primaryBookingHref,
                  className: `${presentation.primaryButtonClass} w-full`,
                  style: { backgroundColor: theme.primaryColor },
                  testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                })
              : null}
            {showRequestCta && hasMeaningfulText(secondaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
                  testIdPrefix,
                  label: secondaryCtaLabel,
                  href: secondaryOrderHref,
                  className: `${presentation.secondaryButtonClass} w-full border-white/30 bg-white/10 text-white hover:bg-white/20`,
                  style: { borderColor: "rgba(255,255,255,0.35)", color: "#fff" },
                  testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                })
              : null}
          </div>
        </aside>
      </div>
    </header>
  );
}

export type ServiceAboutSectionProps = ServiceSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ServiceTheme;
  isDark: boolean;
};

export function ServiceAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: ServiceAboutSectionProps) {
  const muted = serviceMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "px-1 py-3" : "py-6 md:py-8"}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div
        className={`${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-7"} ${
          isDark ? "bg-slate-900/50" : "bg-white/80 shadow-sm ring-1 ring-slate-200/70"
        }`}
      >
        <p
          className={`font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.primaryColor }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          {title}
        </p>
        {content ? (
          <p
            className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base lg:text-lg"} ${muted}`}
            data-testid={`${testIdPrefix}-about-body`}
          >
            {content}
          </p>
        ) : (
          <p className={`mt-2 text-sm italic ${muted}`}>About text will appear here.</p>
        )}
      </div>
    </section>
  );
}

export type ServiceServicesSectionProps = ServiceSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: ServiceTheme;
  isDark: boolean;
};

export function ServiceServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
}: ServiceServicesSectionProps) {
  const muted = serviceMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`relative ${isPreview ? "py-2" : "py-8 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`absolute inset-0 -z-10 ${isPreview ? "rounded-lg" : "rounded-3xl"}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}18 0%, transparent 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}10 0%, ${theme.accentColor}06 100%)`,
        }}
        aria-hidden
      />

      <div className={`${isPreview ? "space-y-2" : "mb-6 space-y-2 md:mb-8"}`}>
        <p
          className={`font-bold uppercase tracking-wider ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.primaryColor }}
        >
          Service offers
        </p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id={`${testIdPrefix}-services-heading`}
            className={`whitespace-normal font-black tracking-tight ${
              isPreview ? "text-sm" : "text-2xl md:text-4xl"
            } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {title}
          </h2>
          {badgeText ? (
            <span
              className={`rounded-full px-3 py-1 font-bold ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}20` }}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>
        <p className={`max-w-2xl whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
          Choose a service below and book online or request a quote in minutes.
        </p>
      </div>

      {services && services.length > 0 ? (
        <div className={`grid gap-4 ${isPreview ? "" : "sm:grid-cols-2 lg:gap-6"}`}>
          {services.map((service) => (
            <ServiceOfferingCard
              key={service.id}
              slug={publicSlug}
              service={service}
              theme={theme}
              isDark={isDark}
              variant={variant}
            />
          ))}
        </div>
      ) : isPreview ? (
        <ServiceOfferingCard
          slug=""
          service={{
            id: "preview-sample",
            name: "Sample service",
            description: "Your services will appear here on the live page.",
            type: "booking",
            price_cents: 5000,
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
      ) : (
        <p className={`text-sm ${muted}`}>
          Services will appear here.{" "}
          <Link to={`/b/${publicSlug}/services`} className="font-bold hover:underline" style={{ color: theme.primaryColor }}>
            View services
          </Link>
        </p>
      )}
    </section>
  );
}

export type ServiceTrustSectionProps = ServiceSectionShell & {
  copy: MiniSiteCopy;
  theme: ServiceTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function ServiceTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: ServiceTrustSectionProps) {
  const muted = serviceMutedText(isDark);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);
  const isPreview = variant === "preview";

  if (!showTrustStats && !hasBenefits) {
    return null;
  }

  return (
    <section
      className={`overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-3xl"}`}
      data-testid={`${testIdPrefix}-trust`}
      style={{
        background: isDark
          ? `linear-gradient(90deg, ${theme.primaryColor}20 0%, rgba(15,23,42,0.9) 100%)`
          : `linear-gradient(90deg, ${theme.primaryColor}08 0%, #ffffff 55%, ${theme.accentColor}08 100%)`,
      }}
    >
      <div className={`grid ${isPreview ? "" : "md:grid-cols-[1.2fr_0.8fr]"}`}>
        {hasBenefits ? (
          <div className={isPreview ? "p-3" : "p-6 md:p-8"} data-testid={`${testIdPrefix}-benefits-strip`}>
            <p
              className={`font-black uppercase tracking-wider ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.primaryColor }}
            >
              Why choose us
            </p>
            <p className={`mt-1 font-bold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {copy.benefitsSectionTitle}
            </p>
            <ul className={`mt-3 grid ${isPreview ? "gap-1.5" : "mt-5 gap-3 sm:grid-cols-2"}`}>
              {copy.benefitsItems.filter(Boolean).map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-2.5 whitespace-normal ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                    isDark ? "text-slate-200" : "text-slate-800"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${
                      isPreview ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-sm"
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showTrustStats ? (
          <div
            className={`${hasBenefits ? (isDark ? "border-t border-slate-700/70 md:border-l md:border-t-0" : "border-t border-slate-200/80 md:border-l md:border-t-0") : ""} ${
              isPreview ? "p-3" : "p-6 md:p-8"
            } ${isDark ? "bg-slate-950/40" : "bg-slate-900/[0.03]"}`}
          >
            <p className={`font-bold uppercase tracking-wider ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>
              Trusted locally
            </p>
            <div
              className={`mt-3 grid grid-cols-3 gap-2 ${isPreview ? "" : "mt-5 gap-4"}`}
              data-testid={`${testIdPrefix}-trust-stats`}
            >
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className="min-w-0 text-center">
                  <p
                    className={`whitespace-normal font-black ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}
                    style={{ color: theme.primaryColor }}
                  >
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal font-semibold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>
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

export type ServiceFaqSectionProps = ServiceSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: ServiceTheme;
  isDark: boolean;
};

export function ServiceFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  theme,
  isDark,
}: ServiceFaqSectionProps) {
  const muted = serviceMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <h2
        id={`${testIdPrefix}-faq-heading`}
        className={`whitespace-normal font-black tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`}
        data-testid={`${testIdPrefix}-faq-title`}
      >
        {title}
      </h2>
      <dl className={`mt-3 divide-y ${isDark ? "divide-slate-700/70" : "divide-slate-200/80"} ${isPreview ? "" : "md:mt-5"}`}>
        {items.map((item, index) => {
          if (!isFaqItemFilled(item)) {
            return null;
          }

          return (
            <div
              key={`${index}-${item.question}`}
              className={`min-w-0 border-l-4 py-3 pl-3 ${isPreview ? "py-2 pl-2" : "md:py-4 md:pl-4"}`}
              style={{ borderLeftColor: theme.primaryColor }}
              data-testid={`${testIdPrefix}-faq-item-${index}`}
            >
              <dt
                className={`whitespace-normal font-bold ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}-question`}
              >
                {item.question}
              </dt>
              <dd
                className={`mt-1 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm"} ${muted}`}
                data-testid={`${testIdPrefix}-faq-item-${index}-answer`}
              >
                {item.answer}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export type ServiceContactSectionProps = ServiceSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: ServiceTheme;
  isDark: boolean;
};

export function ServiceContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: ServiceContactSectionProps) {
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-3xl"} ${
        isDark ? "bg-slate-900/80 text-slate-100" : "bg-slate-900 text-white"
      }`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-2 md:p-8"}`}>
        <div>
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`whitespace-normal font-black tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {title}
          </h2>
          {hasPhone ? (
            <p className={`mt-3 ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`}>
              <a href={`tel:${contactPhone}`} className="font-black hover:underline" style={{ color: theme.accentColor }}>
                {contactPhone}
              </a>
            </p>
          ) : null}
          {hasAddress ? (
            <p className={`mt-2 whitespace-normal ${isPreview ? "text-xs" : "text-sm"} text-slate-300`}>{contactAddress}</p>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div className={`space-y-2 ${isPreview ? "text-xs" : "text-sm"}`} data-testid={`${testIdPrefix}-social-links`}>
            {entries.map((entry) => (
              <div key={entry.key} className="min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{entry.label}</p>
                <p className="mt-0.5 whitespace-normal text-slate-200">{entry.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type ServiceBookingCtaSectionProps = ServiceSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: ServiceTheme;
  presentation: MiniSiteTemplatePresentation;
};

export function ServiceBookingCtaSection({
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
}: ServiceBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;

  return (
    <section
      className={`relative overflow-hidden text-center ${isPreview ? "rounded-xl py-4 px-3" : "rounded-2xl py-10 px-6 md:py-14 md:px-10"}`}
      style={{
        background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)`,
      }}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" aria-hidden />
      <p className={`relative font-black text-white ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}>
        Ready to get started?
      </p>
      <p className={`relative mt-1 text-white/85 ${isPreview ? "text-[11px]" : "text-sm md:text-base"}`}>
        Book online or request service in a few clicks.
      </p>
      <div
        className={`relative mt-4 flex flex-col items-center justify-center ${isPreview ? "gap-1.5" : "gap-3 sm:flex-row sm:gap-4"}`}
      >
        {renderCtaButton({
          previewButtons,
          testIdPrefix,
          label: primaryLabel,
          href: primaryHref,
          className: `${presentation.primaryButtonClass} ${isPreview ? "" : "min-w-[200px]"}`,
          style: { backgroundColor: "#fff", color: theme.primaryColor },
          testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
        })}
        {showSecondaryCta
          ? renderCtaButton({
              previewButtons,
              testIdPrefix,
              label: secondaryLabel!,
              href: secondaryHref!,
              className: `${presentation.secondaryButtonClass} ${isPreview ? "" : "min-w-[200px]"} border-white/40 bg-white/10 text-white hover:bg-white/20`,
              style: { borderColor: "rgba(255,255,255,0.45)", color: "#fff" },
              testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
            })
          : null}
      </div>
    </section>
  );
}

export type ServiceGallerySectionProps = ServiceSectionShell & {
  theme: ServiceTheme;
  isDark: boolean;
};

export function ServiceGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: ServiceGallerySectionProps) {
  const muted = serviceMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-2 border-dashed text-center ${isPreview ? "rounded-xl py-4" : "rounded-2xl py-10 md:py-12"} ${
        isDark ? "border-slate-700/80 bg-slate-900/30" : "border-slate-300/70 bg-slate-50/80"
      }`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
      style={{ borderColor: `${theme.accentColor}44` }}
    >
      <div
        className={`mx-auto mb-2 flex items-center justify-center rounded-xl font-bold ${
          isPreview ? "h-8 w-8 text-sm" : "h-12 w-12 text-lg"
        }`}
        style={{ backgroundColor: `${theme.accentColor}18`, color: theme.accentColor }}
        aria-hidden
      >
        +
      </div>
      <h2
        id={`${testIdPrefix}-gallery-heading`}
        className={`font-bold ${isPreview ? "text-sm" : "text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
        Photo gallery coming soon. Showcase your work here.
      </p>
    </section>
  );
}
