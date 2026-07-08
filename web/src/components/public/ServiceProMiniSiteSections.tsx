import { Link } from "react-router-dom";
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
      return "Book your service online — fast scheduling, clear pricing, reliable results.";
    case "orders_only":
      return "Request a quote or service online — tell us what you need and we will take it from there.";
    default:
      return "Book appointments or request service online — professional help when you need it.";
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
    ? service.description.length > (variant === "preview" ? 70 : 110)
      ? `${service.description.slice(0, variant === "preview" ? 70 : 110).trim()}…`
      : service.description
    : null;
  const muted = serviceMutedText(isDark);
  const radius = buttonRadiusClass(theme.buttonStyle);
  const isPreview = variant === "preview";

  return (
    <article
      className={`flex h-full flex-col border-2 shadow-md ${
        isPreview ? "rounded-lg p-3" : "rounded-2xl p-4 md:p-5"
      } ${isDark ? "border-slate-700/80 bg-slate-900/55" : "bg-white"}`}
      style={{ borderColor: theme.primaryColor }}
      data-testid="service-card"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex shrink-0 items-center justify-center ${
            isPreview ? "h-8 w-8 rounded-lg text-base" : "h-11 w-11 rounded-xl text-xl"
          } ${isDark ? "bg-slate-800" : "bg-slate-50"}`}
          aria-hidden
        >
          {serviceTypeIcon(service.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`whitespace-normal font-bold tracking-tight ${
                isPreview ? "text-xs" : "text-base md:text-lg"
              } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              {service.name}
            </h3>
            {!isPreview ? <TypeBadge type={service.type} /> : null}
          </div>
          {descriptionPreview ? (
            <p className={`mt-1 whitespace-normal leading-snug ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
              {descriptionPreview}
            </p>
          ) : null}
          <div className={`mt-2 flex flex-wrap items-center gap-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
            <PriceLabel service={service} />
            {duration ? <span>{duration}</span> : null}
          </div>
        </div>
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className={`mt-4 block w-full px-4 py-2.5 text-center font-bold text-white shadow-md transition hover:brightness-105 ${radius} ${
          isPreview ? "text-[11px]" : "text-sm"
        }`}
        style={{ backgroundColor: theme.primaryColor }}
      >
        {serviceActionLabel(service.type)}
      </Link>
    </article>
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
  showHeroTrustRow: boolean;
  operatingMode: OperatingMode;
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
  showHeroTrustRow,
  operatingMode,
}: ServiceHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = serviceMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <header
      className={`relative overflow-hidden border-2 shadow-lg ${
        isPreview ? "rounded-lg p-3" : "rounded-2xl p-6 md:p-8 lg:p-10"
      } ${isDark ? "border-slate-700/80 bg-slate-900/70" : "bg-white"}`}
      style={{ borderLeftColor: theme.primaryColor, borderLeftWidth: isPreview ? 6 : 8 }}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${theme.primaryColor}22 0%, transparent 55%)`
            : `linear-gradient(135deg, ${theme.primaryColor}12 0%, ${theme.accentColor}08 100%)`,
        }}
        aria-hidden
      />

      <div
        className={`${isPreview ? "flex flex-col gap-2" : "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10"}`}
        data-testid={`${testIdPrefix}-hero-content`}
      >
        <div className={`min-w-0 flex-1 ${isPreview ? "space-y-1.5" : "space-y-3 md:space-y-4"}`}>
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className={`shrink-0 object-cover ${isPreview ? "h-9 w-9 rounded-lg" : "h-14 w-14 rounded-xl shadow-sm"}`}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center font-bold ${
                  isPreview ? "h-9 w-9 rounded-lg text-sm" : "h-14 w-14 rounded-xl text-xl"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
                data-testid={`${testIdPrefix}-logo-placeholder`}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p
              className={`inline-flex rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wide ${
                isPreview ? "text-[10px]" : "text-xs"
              }`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}
              data-testid={`${testIdPrefix}-hero-badge`}
            >
              {heroBadgeText}
            </p>
          </div>

          <h1
            className={`${presentation.heroTitleClass} whitespace-normal`}
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
              className={`max-w-2xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
              data-testid={`${testIdPrefix}-hero-body`}
            >
              {heroBody}
            </p>
          ) : null}
        </div>

        <div
          className={`flex w-full flex-col ${isPreview ? "gap-1.5" : "gap-3 sm:min-w-[220px] lg:max-w-xs"}`}
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

      {showHeroTrustRow ? (
        <div
          className={`grid grid-cols-3 gap-2 border-t ${
            isDark ? "border-slate-700/70" : "border-slate-200/80"
          } ${isPreview ? "mt-3 pt-3" : "mt-6 pt-5 md:mt-8 md:pt-6"}`}
          data-testid={`${testIdPrefix}-hero-trust-row`}
        >
          {copy.trustCards.map((stat) => (
            <div key={stat.subtitle} className="min-w-0 text-center">
              <p
                className={`whitespace-normal font-bold ${isPreview ? "text-xs" : "text-lg"}`}
                style={{ color: theme.primaryColor }}
              >
                {stat.title}
              </p>
              <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
      ) : null}
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
      className={`border-2 ${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-7"} ${
        isDark ? "border-slate-700/80 bg-slate-900/55" : "border-slate-200/90 bg-white shadow-sm"
      }`}
      style={{ borderLeftColor: theme.primaryColor, borderLeftWidth: 4 }}
      data-testid={`${testIdPrefix}-about`}
    >
      <h2
        className={`whitespace-normal font-bold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`}
        data-testid={`${testIdPrefix}-about-title`}
      >
        {title}
      </h2>
      {content ? (
        <p
          className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
          data-testid={`${testIdPrefix}-about-body`}
        >
          {content}
        </p>
      ) : (
        <p className={`mt-2 text-sm italic ${muted}`}>About text will appear here.</p>
      )}
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
      className={isPreview ? "" : "py-2 md:py-4"}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
      style={isDark ? undefined : { backgroundColor: `${theme.primaryColor}06` }}
    >
      <div
        className={`${isPreview ? "rounded-lg border-2 p-3" : "rounded-2xl border-2 p-5 md:p-7 lg:p-8"} ${
          isDark ? "border-slate-700/80 bg-slate-900/60" : "border-slate-200/90 bg-white shadow-lg"
        }`}
        style={{ borderColor: theme.primaryColor }}
      >
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 ${isPreview ? "mb-2" : "md:mb-6"}`}>
          <div>
            <p
              className={`font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.primaryColor }}
            >
              Our services
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`whitespace-normal font-extrabold tracking-tight ${
                isPreview ? "text-sm" : "text-2xl md:text-3xl"
              } ${isDark ? "text-slate-100" : "text-slate-900"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {title}
            </h2>
          </div>
          {badgeText ? (
            <span
              className={`rounded-full px-3 py-1 font-bold ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}18` }}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {services && services.length > 0 ? (
          <div className={`grid gap-3 ${isPreview ? "" : "sm:grid-cols-2 sm:gap-4 lg:gap-5"}`}>
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
      </div>
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
      className={`${isPreview ? "space-y-2" : "space-y-5 md:space-y-6"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      {hasBenefits ? (
        <div
          className={`border-2 ${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-6"} ${
            isDark ? "border-slate-700/80 bg-slate-900/50" : "border-slate-200/90 bg-white shadow-sm"
          }`}
          style={{ borderTopColor: theme.primaryColor, borderTopWidth: 3 }}
          data-testid={`${testIdPrefix}-benefits-strip`}
        >
          <p
            className={`mb-3 font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}
          >
            {copy.benefitsSectionTitle}
          </p>
          <ul className={`grid ${isPreview ? "gap-1.5" : "gap-3 sm:grid-cols-3"}`}>
            {copy.benefitsItems.filter(Boolean).map((item) => (
              <li
                key={item}
                className={`flex items-start gap-2 whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${
                  isDark ? "text-slate-200" : "text-slate-800"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white ${
                    isPreview ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
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
          className={`grid grid-cols-3 gap-2 ${isPreview ? "" : "gap-4 md:gap-5"}`}
          data-testid={`${testIdPrefix}-trust-stats`}
        >
          {copy.trustCards.map((stat) => (
            <div
              key={stat.subtitle}
              className={`min-w-0 border-2 text-center ${
                isPreview ? "rounded-md px-2 py-2" : "rounded-xl px-3 py-4 md:px-4 md:py-5"
              } ${isDark ? "border-slate-700/80 bg-slate-900/55" : "border-slate-200/90 bg-white shadow-sm"}`}
              style={{ borderColor: `${theme.primaryColor}55` }}
            >
              <p
                className={`whitespace-normal font-extrabold ${isPreview ? "text-xs" : "text-xl md:text-2xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {stat.title}
              </p>
              <p className={`mt-1 whitespace-normal font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export type ServiceFaqSectionProps = ServiceSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  isDark: boolean;
};

export function ServiceFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  isDark,
}: ServiceFaqSectionProps) {
  const muted = serviceMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-2 ${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-7"} ${
        isDark ? "border-slate-700/80 bg-slate-900/55" : "border-slate-200/90 bg-white shadow-sm"
      }`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <h2
        id={`${testIdPrefix}-faq-heading`}
        className={`whitespace-normal font-bold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`}
        data-testid={`${testIdPrefix}-faq-title`}
      >
        {title}
      </h2>
      <div className={`mt-3 space-y-2 ${isPreview ? "" : "md:mt-5 md:space-y-3"}`}>
        {items.map((item, index) => {
          if (!isFaqItemFilled(item)) {
            return null;
          }

          return (
            <div
              key={`${index}-${item.question}`}
              className={`min-w-0 rounded-lg border px-3 py-2 ${
                isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/90"
              } ${isPreview ? "" : "px-4 py-3"}`}
              data-testid={`${testIdPrefix}-faq-item-${index}`}
            >
              <p
                className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm"} ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}-question`}
              >
                {item.question}
              </p>
              <p
                className={`mt-1 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm"} ${muted}`}
                data-testid={`${testIdPrefix}-faq-item-${index}-answer`}
              >
                {item.answer}
              </p>
            </div>
          );
        })}
      </div>
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
  const muted = serviceMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`border-2 ${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-7"} ${
        isDark ? "border-slate-700/80 bg-slate-900/55" : "border-slate-200/90 bg-white shadow-sm"
      }`}
      style={{ borderColor: `${theme.accentColor}66` }}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <h2
        id={`${testIdPrefix}-contact-heading`}
        className={`whitespace-normal font-bold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`}
        data-testid={`${testIdPrefix}-contact-title`}
      >
        {title}
      </h2>

      <dl className={`mt-3 grid gap-3 ${isPreview ? "text-xs" : "text-sm sm:grid-cols-2 md:gap-4"}`}>
        {hasAddress ? (
          <div
            className={`rounded-lg border px-3 py-2 ${
              isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/90"
            }`}
          >
            <dt className={`text-xs font-bold uppercase tracking-wide ${muted}`}>Address</dt>
            <dd className={`mt-1 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-800"}`}>{contactAddress}</dd>
          </div>
        ) : null}
        {hasPhone ? (
          <div
            className={`rounded-lg border px-3 py-2 ${
              isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/90"
            }`}
          >
            <dt className={`text-xs font-bold uppercase tracking-wide ${muted}`}>Phone</dt>
            <dd className="mt-1">
              <a href={`tel:${contactPhone}`} className="font-bold hover:underline" style={{ color: theme.primaryColor }}>
                {contactPhone}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {entries.length > 0 ? (
        <div
          className={`mt-3 grid gap-2 ${isPreview ? "text-xs" : "text-sm sm:grid-cols-2"}`}
          data-testid={`${testIdPrefix}-social-links`}
        >
          {entries.map((entry) => (
            <div
              key={entry.key}
              className={`rounded-lg border px-3 py-2 ${
                isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/90"
              }`}
              data-testid={`${testIdPrefix}-${entry.key}`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide ${muted}`}>{entry.label}</p>
              <p className={`mt-0.5 whitespace-normal ${muted}`}>{entry.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export type ServiceBookingCtaSectionProps = ServiceSectionShell & {
  label: string;
  href: string;
  theme: ServiceTheme;
  presentation: MiniSiteTemplatePresentation;
};

export function ServiceBookingCtaSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  label,
  href,
  theme,
  presentation,
}: ServiceBookingCtaSectionProps) {
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-2 text-center shadow-lg ${isPreview ? "rounded-lg py-4" : "rounded-2xl py-10 md:py-12"}`}
      style={{
        borderColor: theme.primaryColor,
        backgroundColor: `${theme.primaryColor}10`,
      }}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <Link
        to={href}
        className={presentation.primaryButtonClass}
        data-testid={`${testIdPrefix}-booking-cta-link`}
        style={{ backgroundColor: theme.primaryColor }}
      >
        {label}
      </Link>
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
      className={`border-2 border-dashed text-center ${isPreview ? "rounded-lg py-4" : "rounded-2xl py-10 md:py-14"} ${
        isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-300/80 bg-white/80"
      }`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
      style={{ borderColor: `${theme.accentColor}55` }}
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
