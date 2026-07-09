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
      return "Schedule your visit online — compassionate care from trusted specialists.";
    case "orders_only":
      return "Send a consultation request or ask our care team a question.";
    default:
      return "Book appointments and access specialist care — a calm, professional experience.";
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

function buildTrustChips(copy: MiniSiteCopy): string[] {
  const fromBenefits = copy.benefitsItems.filter(Boolean).slice(0, 2);
  const fromTrust = copy.trustCards.map((card) => card.subtitle).filter(Boolean);
  const combined = [...fromBenefits, ...fromTrust];
  const unique = Array.from(new Set(combined));
  return unique.slice(0, 3);
}

type ClinicInfoTile = {
  label: string;
  value: string;
  detail?: string;
};

function buildClinicInfoTiles({
  copy,
  serviceCount,
  contactPhone,
  contactAddress,
}: {
  copy: MiniSiteCopy;
  serviceCount: number | null;
  contactPhone: string;
  contactAddress: string;
}): ClinicInfoTile[] {
  const benefits = copy.benefitsItems.filter(Boolean);
  const trust = copy.trustCards;

  const appointmentsTile: ClinicInfoTile = {
    label: "Appointments",
    value: benefits[0] ?? trust[0]?.subtitle ?? "Easy booking",
    detail: trust[0]?.title ?? undefined,
  };

  const specialistsTile: ClinicInfoTile = {
    label: "Specialists",
    value:
      serviceCount != null && serviceCount > 0
        ? `${serviceCount} treatment${serviceCount === 1 ? "" : "s"}`
        : (benefits[1] ?? trust[1]?.subtitle ?? "Specialist care"),
    detail: serviceCount != null && serviceCount > 0 ? "Available to book" : trust[1]?.title,
  };

  let contactTile: ClinicInfoTile;
  if (hasMeaningfulText(contactPhone)) {
    contactTile = { label: "Contact", value: contactPhone.trim(), detail: "Call the clinic" };
  } else if (hasMeaningfulText(contactAddress)) {
    contactTile = { label: "Location", value: contactAddress.trim(), detail: "Visit us" };
  } else {
    contactTile = {
      label: "Patient care",
      value: benefits[2] ?? trust[2]?.subtitle ?? copy.benefitsSectionTitle,
      detail: trust[2]?.title,
    };
  }

  return [appointmentsTile, specialistsTile, contactTile];
}

function ClinicSpecialtyCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  primaryCtaLabel,
}: {
  slug: string;
  service: PublicService;
  theme: ClinicTheme;
  isDark: boolean;
  variant: ClinicSectionVariant;
  primaryCtaLabel: string;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 64 : 110)
      ? `${service.description.slice(0, variant === "preview" ? 64 : 110).trim()}…`
      : service.description
    : null;
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const ctaLabel =
    service.type === "booking"
      ? hasMeaningfulText(primaryCtaLabel)
        ? primaryCtaLabel
        : "Book appointment"
      : serviceActionLabel(service.type);

  return (
    <article
      className={`group flex gap-3 md:gap-4 ${isPreview ? "p-2.5" : "p-4 md:p-5"} ${
        isDark ? "bg-slate-900/50" : "bg-white/95"
      }`}
      style={{
        borderLeft: `3px solid ${theme.primaryColor}`,
        boxShadow: isDark ? undefined : `inset 0 0 0 1px ${theme.primaryColor}12`,
      }}
      data-testid="service-card"
    >
      <div
        className={`flex shrink-0 items-center justify-center font-semibold ${
          isPreview ? "h-9 w-9 rounded-lg text-sm" : "h-12 w-12 rounded-xl text-lg"
        }`}
        style={{
          backgroundColor: `${theme.primaryColor}14`,
          color: theme.primaryColor,
        }}
        aria-hidden
      >
        +
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium uppercase tracking-[0.12em] ${isPreview ? "text-[9px]" : "text-[10px]"}`}
          style={{ color: theme.accentColor }}
        >
          {service.type === "booking" ? "Treatment" : "Consultation"}
        </p>
        <h3
          className={`mt-0.5 whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-xs" : "text-base md:text-lg"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p className={`mt-1.5 whitespace-normal leading-relaxed ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
            {descriptionPreview}
          </p>
        ) : null}
        <div
          className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ${isPreview ? "text-[10px]" : "text-xs md:text-sm"} ${muted}`}
        >
          <PriceLabel service={service} />
          {duration ? <span>{duration}</span> : null}
          <span className="capitalize">{service.type === "booking" ? "appointment" : "request"}</span>
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-2 inline-flex items-center gap-1 font-semibold hover:underline ${
            isPreview ? "text-[10px]" : "text-sm"
          }`}
          style={{ color: theme.primaryColor }}
        >
          {ctaLabel}
          <span aria-hidden>→</span>
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
  copy: MiniSiteCopy;
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
  contactPhone: string;
  contactAddress: string;
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
  contactPhone,
  contactAddress,
}: ClinicHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const hasPhone = hasMeaningfulText(contactPhone);
  const trustChips = buildTrustChips(copy);
  const infoTiles = buildClinicInfoTiles({ copy, serviceCount, contactPhone, contactAddress });
  const processRows = copy.benefitsItems.filter(Boolean).slice(0, 3);

  return (
    <header data-testid={`${testIdPrefix}-hero`}>
      <div
        className={`relative overflow-hidden ${isPreview ? "rounded-lg" : "rounded-2xl md:rounded-3xl"}`}
        style={{
          background: isDark
            ? `linear-gradient(120deg, ${theme.primaryColor}20 0%, rgba(15,23,42,0.95) 55%, ${theme.accentColor}12 100%)`
            : `linear-gradient(120deg, ${theme.primaryColor}10 0%, #f8fafc 45%, ${theme.accentColor}08 100%)`,
        }}
      >
        <div
          className={`grid items-stretch ${isPreview ? "gap-3 p-3" : "gap-5 p-5 md:grid-cols-[1.05fr_0.95fr] md:gap-6 md:p-7 lg:p-9"}`}
          data-testid={`${testIdPrefix}-hero-content`}
        >
          <div className={`flex min-w-0 flex-col justify-center ${isPreview ? "space-y-2" : "space-y-4 md:space-y-5"}`}>
            <p
              className={`inline-flex w-fit rounded-md px-2.5 py-1 font-medium uppercase tracking-[0.14em] ${
                isPreview ? "text-[9px]" : "text-[11px]"
              } ${isDark ? "bg-white/10 text-slate-200" : "bg-white/80 text-slate-700 shadow-sm"}`}
              data-testid={`${testIdPrefix}-hero-badge`}
            >
              {heroBadgeText}
            </p>

            <h1
              className={`${presentation.heroTitleClass} whitespace-normal ${isDark ? "text-white" : "text-slate-900"}`}
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
                className={`max-w-lg whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}
                data-testid={`${testIdPrefix}-hero-body`}
              >
                {heroBody}
              </p>
            ) : null}

            <div
              className={`flex flex-col ${isPreview ? "gap-1.5" : "gap-2.5 sm:flex-row sm:flex-wrap"}`}
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
                    style: {
                      borderColor: isDark ? "rgba(255,255,255,0.25)" : theme.accentColor,
                      color: isDark ? "#fff" : theme.accentColor,
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
                    },
                    testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                  })
                : null}
            </div>

            {trustChips.length > 0 ? (
              <div className={`flex flex-wrap gap-2 ${isPreview ? "pt-1" : "pt-2"}`} data-testid={`${testIdPrefix}-hero-trust-chips`}>
                {trustChips.map((chip) => (
                  <span
                    key={chip}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      isPreview ? "text-[10px]" : "text-xs"
                    } ${isDark ? "bg-white/10 text-slate-200" : "bg-white/90 text-slate-700 shadow-sm"}`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside
            className={`flex flex-col overflow-hidden ${isPreview ? "rounded-lg" : "rounded-xl md:rounded-2xl"} ${
              isDark ? "bg-slate-950/80 shadow-xl ring-1 ring-slate-700/60" : "bg-white shadow-xl ring-1 ring-slate-200/80"
            }`}
            data-testid={`${testIdPrefix}-hero-appointment-card`}
          >
            <div
              className={`${isPreview ? "px-3 py-2" : "px-5 py-3 md:px-6 md:py-4"}`}
              style={{ backgroundColor: theme.primaryColor }}
            >
              <p className={`font-semibold text-white ${isPreview ? "text-[10px]" : "text-sm"}`}>
                Appointment availability
              </p>
            </div>

            <div className={`flex flex-1 flex-col ${isPreview ? "gap-2 p-3" : "gap-3 p-5 md:p-6"}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
                    isPreview ? "h-10 w-10 text-sm" : "h-14 w-14 text-xl"
                  }`}
                  style={{ backgroundColor: theme.primaryColor }}
                  data-testid={`${testIdPrefix}-logo-placeholder`}
                >
                  {monogram}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold ${isPreview ? "text-xs" : "text-base"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {business.name}
                  </p>
                  <p className={`${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Book a visit</p>
                </div>
              </div>

              <p className={`font-semibold ${isPreview ? "text-xs" : "text-lg"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {serviceCount != null && serviceCount > 0
                  ? `${serviceCount} specialt${serviceCount === 1 ? "y" : "ies"} open for booking`
                  : "Schedule your appointment today"}
              </p>

              {hasPhone ? (
                <a
                  href={`tel:${contactPhone}`}
                  className={`font-semibold hover:underline ${isPreview ? "text-sm" : "text-xl"}`}
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
              ) : null}

              {processRows.length > 0 ? (
                <ul className={`space-y-2 border-t pt-3 ${isDark ? "border-slate-700/60" : "border-slate-100"}`}>
                  {processRows.map((item, index) => (
                    <li
                      key={item}
                      className={`flex items-start gap-2.5 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${
                        isDark ? "text-slate-200" : "text-slate-700"
                      }`}
                    >
                      <span
                        className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
                          isPreview ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[11px]"
                        }`}
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        {index + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className={`mt-auto flex flex-col ${isPreview ? "gap-1.5 pt-1" : "gap-2 pt-2"}`} data-testid={`${testIdPrefix}-hero-cta-group`}>
                {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                  ? renderCtaButton({
                      previewButtons,
                      label: primaryCtaLabel,
                      href: primaryBookingHref,
                      className: `${presentation.primaryButtonClass} w-full`,
                      style: { backgroundColor: theme.primaryColor },
                      testId: previewButtons ? `${testIdPrefix}-appointment-primary` : `${testIdPrefix}-appointment-book`,
                    })
                  : null}
                {showRequestCta && hasMeaningfulText(secondaryCtaLabel)
                  ? renderCtaButton({
                      previewButtons,
                      label: secondaryCtaLabel,
                      href: secondaryOrderHref,
                      className: `${presentation.secondaryButtonClass} w-full`,
                      style: { borderColor: theme.accentColor, color: theme.accentColor },
                      testId: previewButtons ? `${testIdPrefix}-appointment-secondary` : `${testIdPrefix}-appointment-request`,
                    })
                  : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div
        className={`grid grid-cols-3 divide-x ${isPreview ? "mt-2 rounded-lg" : "mt-4 rounded-xl md:mt-5"} ${
          isDark ? "divide-slate-700/60 bg-slate-900/50 ring-1 ring-slate-700/55" : "divide-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-200/70"
        }`}
        data-testid={`${testIdPrefix}-clinic-info-strip`}
      >
        {infoTiles.map((tile) => (
          <div key={tile.label} className={`min-w-0 text-center ${isPreview ? "px-2 py-2.5" : "px-3 py-4 md:px-5 md:py-5"}`}>
            <p
              className={`font-medium uppercase tracking-[0.12em] ${isPreview ? "text-[9px]" : "text-[10px]"}`}
              style={{ color: theme.accentColor }}
            >
              {tile.label}
            </p>
            <p
              className={`mt-1 whitespace-normal font-semibold ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {tile.value}
            </p>
            {tile.detail ? (
              <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>{tile.detail}</p>
            ) : null}
          </div>
        ))}
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
    <section className={`${isPreview ? "py-3" : "py-8 md:py-10"}`} data-testid={`${testIdPrefix}-about`}>
      <div
        className={`mx-auto flex max-w-5xl overflow-hidden ${isPreview ? "rounded-lg" : "rounded-2xl"}`}
        style={{ boxShadow: isDark ? undefined : `inset 4px 0 0 ${theme.primaryColor}` }}
      >
        <div
          className={`hidden shrink-0 md:block ${isPreview ? "w-1" : "w-1.5"}`}
          style={{ backgroundColor: theme.primaryColor }}
          aria-hidden
        />
        <div className={`flex-1 ${isPreview ? "p-3" : "p-6 md:p-8"} ${isDark ? "bg-slate-900/40" : "bg-slate-50/80"}`}>
          <p
            className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`}
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
              className={`mt-3 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
              data-testid={`${testIdPrefix}-about-body`}
            >
              {content}
            </p>
          ) : (
            <p className={`mt-3 text-sm italic ${muted}`}>About text will appear here.</p>
          )}
        </div>
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
  primaryCtaLabel: string;
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
  primaryCtaLabel,
}: ClinicServicesSectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Specialties & treatments";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`mx-auto max-w-5xl ${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-7"}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}10 0%, rgba(15,23,42,0.5) 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}06 0%, #f1f5f9 100%)`,
        }}
      >
        <div className={`${isPreview ? "mb-2" : "mb-6 md:mb-8"} flex flex-wrap items-end justify-between gap-3`}>
          <div>
            <p
              className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.accentColor }}
            >
              Medical specialties
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-1 whitespace-normal font-semibold tracking-tight ${
                isPreview ? "text-sm" : "text-2xl md:text-3xl"
              } ${isDark ? "text-slate-100" : "text-slate-900"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
          </div>
          {badgeText ? (
            <span
              className={`rounded-md px-2.5 py-1 font-medium ${isPreview ? "text-[10px]" : "text-xs"} ${
                isDark ? "bg-slate-800/80 text-slate-200" : "bg-white text-slate-700 shadow-sm"
              }`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {services && services.length > 0 ? (
          <div className={`grid gap-3 ${isPreview ? "" : "md:grid-cols-2 md:gap-4"}`}>
            {services.map((service) => (
              <ClinicSpecialtyCard
                key={service.id}
                slug={publicSlug}
                service={service}
                theme={theme}
                isDark={isDark}
                variant={variant}
                primaryCtaLabel={primaryCtaLabel}
              />
            ))}
          </div>
        ) : isPreview ? (
          <ClinicSpecialtyCard
            slug=""
            service={{
              id: "preview-sample",
              name: "General consultation",
              description: "Specialties and treatments will appear here on the live page.",
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
            primaryCtaLabel={primaryCtaLabel}
          />
        ) : (
          <p className={`text-sm ${muted}`}>
            Services will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-medium hover:underline" style={{ color: theme.primaryColor }}>
              View services
            </Link>
          </p>
        )}
      </div>
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
    <section className={`${isPreview ? "py-3" : "py-8 md:py-10"}`} data-testid={`${testIdPrefix}-trust`}>
      <div className="mx-auto max-w-5xl">
        <p
          className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
        >
          Patient care
        </p>
        <h2
          className={`mt-1 whitespace-normal font-semibold tracking-tight ${
            isPreview ? "text-sm" : "text-xl md:text-2xl"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {copy.benefitsSectionTitle}
        </h2>

        <div className={`mt-4 grid ${isPreview ? "gap-3" : "gap-5 md:grid-cols-2 md:gap-8 md:mt-6"}`}>
          {hasBenefits ? (
            <div data-testid={`${testIdPrefix}-benefits-strip`}>
              <p className={`mb-3 font-medium ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>What to expect</p>
              <ol className="space-y-3">
                {copy.benefitsItems.filter(Boolean).map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${
                        isPreview ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
                      }`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {index + 1}
                    </span>
                    <p
                      className={`min-w-0 whitespace-normal pt-1 ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
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
              className={`${isPreview ? "rounded-lg p-3" : "rounded-2xl p-5 md:p-6"} ${
                isDark ? "bg-slate-900/50 ring-1 ring-slate-700/55" : "bg-white shadow-sm ring-1 ring-slate-200/70"
              }`}
              data-testid={`${testIdPrefix}-trust-stats`}
            >
              <p className={`mb-3 font-medium ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>Why patients choose us</p>
              <div className="space-y-4">
                {copy.trustCards.map((stat) => (
                  <div key={stat.subtitle} className="min-w-0 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: `${theme.primaryColor}20` }}>
                    <p
                      className={`whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}
                      style={{ color: theme.primaryColor }}
                    >
                      {stat.title}
                    </p>
                    <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{stat.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
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
      className={`${isPreview ? "py-3" : "py-8 md:py-10"}`}
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
        <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>Common questions from patients</p>
        <dl className={`mt-4 divide-y ${isDark ? "divide-slate-700/55" : "divide-slate-200/80"} ${isPreview ? "" : "md:mt-6"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`grid gap-2 py-4 ${isPreview ? "py-3" : "md:grid-cols-[auto_1fr] md:gap-4 md:py-5"}`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  <span
                    className={`mr-2 inline-flex items-center justify-center rounded-md font-bold text-white ${
                      isPreview ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Q
                  </span>
                  {item.question}
                </dt>
                <dd
                  className={`whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm"} ${muted} md:pl-8`}
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
      className={`${isPreview ? "py-3" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`mx-auto max-w-5xl overflow-hidden ${isPreview ? "rounded-lg" : "rounded-2xl"}`}
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${theme.primaryColor}12 0%, rgba(15,23,42,0.7) 100%)`
            : `linear-gradient(135deg, ${theme.primaryColor}08 0%, #f8fafc 100%)`,
        }}
      >
        <div className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8"}`}>
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
              Reach our care team for appointments and clinic information.
            </p>
          </div>

          <div className={`space-y-4 ${isPreview ? "text-xs" : "text-sm"}`}>
            {hasAddress ? (
              <div
                className={`${isPreview ? "rounded-md p-2.5" : "rounded-xl p-4"} ${
                  isDark ? "bg-slate-900/60" : "bg-white shadow-sm"
                }`}
              >
                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Clinic address</p>
                <p className={`mt-1 whitespace-normal font-medium ${isPreview ? "text-sm" : "text-base md:text-lg"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {contactAddress}
                </p>
              </div>
            ) : null}
            {hasPhone ? (
              <div
                className={`${isPreview ? "rounded-md p-2.5" : "rounded-xl p-4"} ${
                  isDark ? "bg-slate-900/60" : "bg-white shadow-sm"
                }`}
              >
                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
                <a
                  href={`tel:${contactPhone}`}
                  className={`mt-1 inline-block font-semibold hover:underline ${isPreview ? "text-base" : "text-xl md:text-2xl"}`}
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
              </div>
            ) : null}
            {entries.length > 0 ? (
              <div className={`flex flex-wrap gap-x-4 gap-y-2 ${isPreview ? "text-[11px]" : "text-xs"}`} data-testid={`${testIdPrefix}-social-links`}>
                {entries.map((entry) => (
                  <div key={entry.key} className="min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
                    <span className={`font-medium ${muted}`}>{entry.label}: </span>
                    <span className={isDark ? "text-slate-200" : "text-slate-700"}>{entry.value}</span>
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
    <section className={`${isPreview ? "py-3" : "py-8 md:py-10"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 overflow-hidden ${
          isPreview ? "rounded-lg p-3" : "rounded-2xl p-6 md:flex-row md:items-center md:p-8"
        }`}
        style={{
          background: isDark
            ? `linear-gradient(90deg, ${theme.primaryColor}22 0%, rgba(15,23,42,0.85) 100%)`
            : `linear-gradient(90deg, ${theme.primaryColor}12 0%, ${theme.accentColor}10 100%)`,
          boxShadow: isDark ? undefined : `inset 0 0 0 1px ${theme.primaryColor}18`,
        }}
      >
        <div className="min-w-0">
          <p className={`font-semibold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            Ready to schedule your visit?
          </p>
          <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${clinicMutedText(isDark)}`}>
            Book an appointment online or send a request — our care team will follow up promptly.
          </p>
        </div>
        <div className={`flex w-full shrink-0 flex-col ${isPreview ? "gap-1.5" : "gap-2 sm:w-auto sm:flex-row sm:gap-3"}`}>
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
                style: {
                  borderColor: isDark ? "rgba(255,255,255,0.3)" : theme.accentColor,
                  color: isDark ? "#fff" : theme.accentColor,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)",
                },
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
      className={`border-t text-center ${isPreview ? "py-4" : "py-8 md:py-10"}`}
      style={{ borderTopColor: `${theme.accentColor}25` }}
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
