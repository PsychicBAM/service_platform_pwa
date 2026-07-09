import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { PriceLabel } from "@/components/PriceLabel";
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
  MiniSiteTrustCard,
} from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";

export type ClinicSectionVariant = "full" | "preview";

type ClinicSectionShell = {
  variant?: ClinicSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type ClinicTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

function clinicMutedText(isDark: boolean): string {
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
      return "Schedule your appointment online — trusted care from experienced specialists.";
    case "orders_only":
      return "Request a consultation or send your questions — we're here to help.";
    default:
      return "Book appointments or reach out for care — professional healthcare when you need it.";
  }
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

function ClinicSpecialtyCard({
  slug,
  service,
  theme,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  theme: ClinicTheme;
  isDark: boolean;
  variant: ClinicSectionVariant;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 72 : 128)
      ? `${service.description.slice(0, variant === "preview" ? 72 : 128).trim()}…`
      : service.description
    : null;
  const muted = clinicMutedText(isDark);
  const radius = buttonRadiusClass(theme.buttonStyle);
  const isPreview = variant === "preview";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden ${
        isPreview ? "rounded-xl" : "rounded-2xl"
      } ${isDark ? "bg-slate-900/45 ring-1 ring-slate-700/60" : "bg-white/90 ring-1 ring-slate-200/60 shadow-sm"}`}
      data-testid="service-card"
    >
      <div className={`flex flex-1 flex-col ${isPreview ? "p-3" : "p-5 md:p-6"}`}>
        <div className="flex gap-3 md:gap-4">
          <div
            className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${isPreview ? "min-h-[3rem]" : "min-h-[4rem]"}`}
            style={{ backgroundColor: theme.primaryColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[9px]" : "text-[11px]"}`}
              style={{ color: theme.accentColor }}
            >
              {service.type === "booking" ? "Appointment" : "Consultation"}
            </p>
            <h3
              className={`mt-1 whitespace-normal font-semibold tracking-tight ${
                isPreview ? "text-xs" : "text-lg md:text-xl"
              } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              {service.name}
            </h3>
            {descriptionPreview ? (
              <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
                {descriptionPreview}
              </p>
            ) : null}
            <div className={`mt-3 flex flex-wrap items-center gap-3 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
              <PriceLabel service={service} />
              {duration ? <span>{duration}</span> : null}
            </div>
          </div>
        </div>
      </div>
      <div className={`border-t ${isDark ? "border-slate-700/50" : "border-slate-100"} ${isPreview ? "px-3 pb-3 pt-2" : "px-5 pb-5 pt-3 md:px-6 md:pb-6"}`}>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`block w-full px-4 py-2.5 text-center font-medium text-white transition hover:brightness-105 ${radius} ${
            isPreview ? "text-[11px]" : "text-sm"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {service.type === "booking" ? "Book appointment" : serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

export type ClinicHeroSectionProps = ClinicSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  theme: ClinicTheme;
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
  trustHighlights: MiniSiteTrustCard[];
  contactPhone: string;
};

export function ClinicHeroSection({
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
  serviceCount,
  benefitHighlights,
  trustHighlights,
  contactPhone,
}: ClinicHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const hasPhone = hasMeaningfulText(contactPhone);

  return (
    <header
      className={`relative overflow-hidden ${isPreview ? "rounded-xl" : "rounded-[1.75rem] md:rounded-[2rem]"}`}
      data-testid={`${testIdPrefix}-hero`}
      style={{
        background: isDark
          ? `linear-gradient(145deg, ${theme.primaryColor}16 0%, rgba(15,23,42,0.92) 48%, ${theme.accentColor}10 100%)`
          : `linear-gradient(145deg, ${theme.primaryColor}08 0%, #ffffff 42%, ${theme.accentColor}06 100%)`,
      }}
    >
      <div
        className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:p-8 lg:p-10"}`}
        data-testid={`${testIdPrefix}-hero-content`}
      >
        <div className={`min-w-0 ${isPreview ? "space-y-1.5" : "space-y-4 md:space-y-5"}`}>
          <p
            className={`inline-flex rounded-full px-3 py-1 font-medium uppercase tracking-[0.14em] ${
              isPreview ? "text-[10px]" : "text-xs"
            }`}
            style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}12` }}
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
              className={`whitespace-normal font-medium ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
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
        </div>

        <aside
          className={`${isPreview ? "rounded-xl p-3" : "rounded-2xl p-5 md:p-6"} ${
            isDark ? "bg-slate-900/70 ring-1 ring-slate-700/60" : "bg-white/90 ring-1 ring-slate-200/70 shadow-md"
          }`}
          data-testid={`${testIdPrefix}-hero-cta-group`}
        >
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className={`shrink-0 rounded-full object-cover ${isPreview ? "h-10 w-10" : "h-12 w-12"}`}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
                  isPreview ? "h-10 w-10 text-base" : "h-12 w-12 text-lg"
                }`}
                style={{
                  background: `linear-gradient(145deg, ${theme.primaryColor}18, ${theme.accentColor}12)`,
                  color: theme.primaryColor,
                }}
                data-testid={`${testIdPrefix}-logo-placeholder`}
              >
                {monogram}
              </div>
            )}
            <div className="min-w-0">
              <p className={`font-medium uppercase tracking-[0.12em] ${isPreview ? "text-[9px]" : "text-[11px]"} ${muted}`}>
                Patient care
              </p>
              <p className={`font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {serviceCount != null && serviceCount > 0
                  ? `${serviceCount} specialt${serviceCount === 1 ? "y" : "ies"} available`
                  : "Book your appointment"}
              </p>
            </div>
          </div>

          {hasPhone ? (
            <p className={`mt-3 ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>
              <a href={`tel:${contactPhone}`} className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
                {contactPhone}
              </a>
            </p>
          ) : null}

          {(benefitHighlights.length > 0 || trustHighlights.length > 0) ? (
            <ul className={`mt-3 space-y-2 ${isPreview ? "text-[11px]" : "text-sm"}`}>
              {benefitHighlights.slice(0, 2).map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-2 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-700"}`}
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: theme.accentColor }}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
              {benefitHighlights.length < 2
                ? trustHighlights.slice(0, 2 - benefitHighlights.length).map((stat) => (
                    <li
                      key={stat.subtitle}
                      className={`flex items-start gap-2 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-700"}`}
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: theme.accentColor }}
                        aria-hidden
                      />
                      <span>
                        <span className="font-medium" style={{ color: theme.primaryColor }}>
                          {stat.title}
                        </span>{" "}
                        {stat.subtitle}
                      </span>
                    </li>
                  ))
                : null}
            </ul>
          ) : null}

          <div className={`mt-4 flex flex-col ${isPreview ? "gap-1.5" : "gap-2.5"}`}>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
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
                  label: secondaryCtaLabel,
                  href: secondaryOrderHref,
                  className: `${presentation.secondaryButtonClass} w-full`,
                  style: { borderColor: theme.accentColor, color: theme.accentColor },
                  testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                })
              : null}
          </div>
        </aside>
      </div>
    </header>
  );
}

export type ClinicAboutSectionProps = ClinicSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ClinicTheme;
  isDark: boolean;
};

export function ClinicAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: ClinicAboutSectionProps) {
  const muted = clinicMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div
        className={`mx-auto max-w-4xl ${isPreview ? "rounded-xl p-3" : "rounded-2xl p-6 md:p-8 lg:p-10"} ${
          isDark ? "bg-slate-900/40 ring-1 ring-slate-700/50" : "bg-white/80 ring-1 ring-slate-200/60 shadow-sm"
        }`}
        style={{
          background: isDark
            ? undefined
            : `linear-gradient(160deg, ${theme.primaryColor}04 0%, #ffffff 55%, ${theme.accentColor}04 100%)`,
        }}
      >
        <p
          className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          About the clinic
        </p>
        <h2
          className={`mt-2 whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-sm" : "text-2xl md:text-3xl"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {title}
        </h2>
        {content ? (
          <p
            className={`mt-4 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
            data-testid={`${testIdPrefix}-about-body`}
          >
            {content}
          </p>
        ) : (
          <p className={`mt-4 text-sm italic ${muted}`}>About text will appear here.</p>
        )}
      </div>
    </section>
  );
}

export type ClinicServicesSectionProps = ClinicSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: ClinicTheme;
  isDark: boolean;
};

export function ClinicServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
}: ClinicServicesSectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={`mx-auto max-w-4xl ${isPreview ? "mb-2 space-y-1" : "mb-8 space-y-2 md:mb-10"}`}>
        <p
          className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
        >
          Treatments & care
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id={`${testIdPrefix}-services-heading`}
            className={`whitespace-normal font-semibold tracking-tight ${
              isPreview ? "text-sm" : "text-2xl md:text-3xl"
            } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {title}
          </h2>
          {badgeText ? (
            <span
              className={`rounded-full px-3 py-1 font-medium ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>
        <p className={`whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
          Medical specialties and treatments available for online booking.
        </p>
      </div>

      {services && services.length > 0 ? (
        <div className={`mx-auto grid max-w-4xl gap-4 ${isPreview ? "" : "sm:grid-cols-2 lg:gap-5"}`}>
          {services.map((service) => (
            <ClinicSpecialtyCard
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
        <div className="mx-auto max-w-4xl">
          <ClinicSpecialtyCard
            slug=""
            service={{
              id: "preview-sample",
              name: "Sample treatment",
              description: "Your specialties and treatments will appear here on the live page.",
              type: "booking",
              price_cents: 12000,
              duration_minutes: 45,
              currency: "USD",
              price_type: "fixed",
              require_payment: false,
              sort_order: 0,
            }}
            theme={theme}
            isDark={isDark}
            variant={variant}
          />
        </div>
      ) : (
        <p className={`text-sm ${muted}`}>
          Services will appear here.{" "}
          <Link to={`/b/${publicSlug}/services`} className="font-medium hover:underline" style={{ color: theme.primaryColor }}>
            View services
          </Link>
        </p>
      )}
    </section>
  );
}

export type ClinicTrustSectionProps = ClinicSectionShell & {
  copy: MiniSiteCopy;
  theme: ClinicTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function ClinicTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: ClinicTrustSectionProps) {
  const muted = clinicMutedText(isDark);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);
  const isPreview = variant === "preview";

  if (!showTrustStats && !hasBenefits) {
    return null;
  }

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      <div
        className={`mx-auto max-w-4xl overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-[1.75rem]"} ${
          isDark ? "bg-slate-900/45 ring-1 ring-slate-700/55" : "bg-white/85 ring-1 ring-slate-200/60 shadow-sm"
        }`}
        style={{
          background: isDark
            ? undefined
            : `linear-gradient(180deg, ${theme.primaryColor}05 0%, #ffffff 40%, ${theme.accentColor}04 100%)`,
        }}
      >
        {showTrustStats ? (
          <div
            className={`grid grid-cols-3 divide-x ${isDark ? "divide-slate-700/55" : "divide-slate-200/70"} ${
              isPreview ? "py-3" : "py-6 md:py-8"
            }`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            {copy.trustCards.map((stat) => (
              <div key={stat.subtitle} className={`min-w-0 px-3 text-center ${isPreview ? "" : "md:px-6"}`}>
                <p
                  className={`whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}
                  style={{ color: theme.primaryColor }}
                >
                  {stat.title}
                </p>
                <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-xs md:text-sm"} ${muted}`}>
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {hasBenefits ? (
          <div
            className={`border-t ${isDark ? "border-slate-700/55" : "border-slate-200/70"} ${
              isPreview ? "p-3" : "p-6 md:p-8"
            }`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            <p className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Patient care
            </p>
            <p className={`mt-1 font-semibold ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {copy.benefitsSectionTitle}
            </p>
            <ul className={`mt-3 grid ${isPreview ? "gap-2" : "gap-3 sm:grid-cols-3 md:mt-4"}`}>
              {copy.benefitsItems.filter(Boolean).map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-2 whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <span
                    className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                    aria-hidden
                  >
                    +
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type ClinicFaqSectionProps = ClinicSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: ClinicTheme;
  isDark: boolean;
};

export function ClinicFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  theme,
  isDark,
}: ClinicFaqSectionProps) {
  const muted = clinicMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-semibold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`mt-4 space-y-3 ${isPreview ? "" : "md:mt-6 md:space-y-4"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`rounded-xl ${isPreview ? "p-2.5" : "p-4 md:p-5"} ${
                  isDark ? "bg-slate-900/40 ring-1 ring-slate-700/50" : "bg-white/80 ring-1 ring-slate-200/60"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-medium ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}
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

export type ClinicContactSectionProps = ClinicSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: ClinicTheme;
  isDark: boolean;
};

export function ClinicContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: ClinicContactSectionProps) {
  const muted = clinicMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`mx-auto max-w-4xl overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-[1.75rem]"} ${
          isDark ? "bg-slate-900/50 ring-1 ring-slate-700/55" : "bg-white/90 ring-1 ring-slate-200/60 shadow-sm"
        }`}
      >
        <div className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-2 md:p-8"}`}>
          <div>
            <h2
              id={`${testIdPrefix}-contact-heading`}
              className={`whitespace-normal font-semibold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
              data-testid={`${testIdPrefix}-contact-title`}
            >
              {title}
            </h2>
            <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
              Visit us or get in touch to schedule your appointment.
            </p>
          </div>

          <div className={`space-y-3 ${isPreview ? "text-xs" : "text-sm"}`}>
            {hasPhone ? (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
                <a
                  href={`tel:${contactPhone}`}
                  className={`mt-1 inline-block font-semibold hover:underline ${isPreview ? "text-sm" : "text-lg"}`}
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
              </div>
            ) : null}
            {hasAddress ? (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Address</p>
                <p className={`mt-1 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-700"}`}>{contactAddress}</p>
              </div>
            ) : null}
            {entries.length > 0 ? (
              <div data-testid={`${testIdPrefix}-social-links`}>
                {entries.map((entry) => (
                  <div key={entry.key} className="mt-2 min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
                    <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>{entry.label}</p>
                    <p className={`mt-0.5 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-700"}`}>{entry.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export type ClinicBookingCtaSectionProps = ClinicSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: ClinicTheme;
  presentation: MiniSiteTemplatePresentation;
};

export function ClinicBookingCtaSection({
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
}: ClinicBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;

  return (
    <section
      className={`${isPreview ? "py-4" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <div
        className={`mx-auto max-w-3xl text-center ${isPreview ? "rounded-xl px-3 py-4" : "rounded-2xl px-6 py-8 md:px-10 md:py-10"} ${
          isDark ? "bg-slate-900/55 ring-1 ring-slate-700/55" : "bg-white/90 ring-1 ring-slate-200/60 shadow-sm"
        }`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}14 0%, rgba(15,23,42,0.55) 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}06 0%, #ffffff 50%, ${theme.accentColor}05 100%)`,
        }}
      >
        <p className={`font-semibold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          Schedule your visit
        </p>
        <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${clinicMutedText(isDark)}`}>
          Request an appointment or ask a question — we're here to help.
        </p>
        <div
          className={`mt-4 flex flex-col items-center justify-center ${isPreview ? "gap-1.5" : "gap-3 sm:flex-row sm:gap-4"}`}
        >
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
                style: { borderColor: theme.accentColor, color: theme.accentColor },
                testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
              })
            : null}
        </div>
      </div>
    </section>
  );
}

export type ClinicGallerySectionProps = ClinicSectionShell & {
  theme: ClinicTheme;
  isDark: boolean;
};

export function ClinicGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: ClinicGallerySectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`border-t text-center ${isDark ? "border-slate-700/55" : "border-slate-200/70"} ${
        isPreview ? "py-4" : "py-10 md:py-12"
      }`}
      style={{ borderTopColor: `${theme.accentColor}30` }}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <h2
        id={`${testIdPrefix}-gallery-heading`}
        className={`font-semibold ${isPreview ? "text-sm" : "text-lg"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
        Photo gallery coming soon. Showcase your clinic here.
      </p>
    </section>
  );
}
