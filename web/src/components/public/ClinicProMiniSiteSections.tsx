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

function clinicSurface(isDark: boolean): string {
  return isDark ? "bg-slate-900/70 text-slate-100" : "bg-white text-slate-900";
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book your visit online — compassionate specialists and a calm, patient-first experience.";
    case "orders_only":
      return "Request a consultation or message our care team — we respond with clear next steps.";
    default:
      return "Trusted clinic care with easy appointments — specialists, treatments, and support in one place.";
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
  return Array.from(new Set([...fromBenefits, ...fromTrust])).slice(0, 3);
}

type ClinicInfoTile = {
  key: string;
  glyph: string;
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

  const appointments: ClinicInfoTile = {
    key: "appointments",
    glyph: "Ap",
    label: "Appointments",
    value: benefits[0] ?? trust[0]?.subtitle ?? "Easy booking",
    detail: trust[0]?.title,
  };

  const specialists: ClinicInfoTile = {
    key: "specialists",
    glyph: "Sp",
    label: "Specialists",
    value:
      serviceCount != null && serviceCount > 0
        ? `${serviceCount} treatment${serviceCount === 1 ? "" : "s"}`
        : (benefits[1] ?? trust[1]?.subtitle ?? "Specialist care"),
    detail: serviceCount != null && serviceCount > 0 ? "Available online" : trust[1]?.title,
  };

  let contact: ClinicInfoTile;
  if (hasMeaningfulText(contactPhone)) {
    contact = { key: "contact", glyph: "Ph", label: "Contact", value: contactPhone.trim(), detail: "Call the clinic" };
  } else if (hasMeaningfulText(contactAddress)) {
    contact = { key: "location", glyph: "Lo", label: "Location", value: contactAddress.trim(), detail: "Clinic address" };
  } else {
    contact = {
      key: "care",
      glyph: "Pc",
      label: "Patient care",
      value: benefits[2] ?? trust[2]?.subtitle ?? copy.benefitsSectionTitle,
      detail: trust[2]?.title,
    };
  }

  return [appointments, specialists, contact];
}

function MedicalIconTile({
  theme,
  isPreview,
  glyph = "+",
}: {
  theme: ClinicTheme;
  isPreview: boolean;
  glyph?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold ${
        isPreview ? "h-10 w-10 text-sm" : "h-14 w-14 text-xl"
      }`}
      style={{
        background: `linear-gradient(145deg, ${theme.primaryColor}18, ${theme.accentColor}12)`,
        color: theme.primaryColor,
      }}
      aria-hidden
    >
      {glyph}
    </div>
  );
}

function ClinicSpecialtyRow({
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
    ? service.description.length > (variant === "preview" ? 58 : 100)
      ? `${service.description.slice(0, variant === "preview" ? 58 : 100).trim()}…`
      : service.description
    : null;
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const ctaLabel =
    service.type === "booking"
      ? hasMeaningfulText(primaryCtaLabel)
        ? primaryCtaLabel
        : "Book"
      : serviceActionLabel(service.type);

  return (
    <article
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        isPreview ? "rounded-xl p-2.5" : "rounded-2xl p-4 md:p-5"
      } ${clinicSurface(isDark)} shadow-sm`}
      data-testid="service-card"
    >
      <div className={`flex min-w-0 flex-1 gap-3 ${isPreview ? "" : "md:gap-4"}`}>
        <MedicalIconTile theme={theme} isPreview={isPreview} glyph="Rx" />
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium uppercase tracking-[0.12em] ${isPreview ? "text-[9px]" : "text-[10px]"}`}
            style={{ color: theme.accentColor }}
          >
            {service.type === "booking" ? "Specialty treatment" : "Consultation"}
          </p>
          <h3 className={`mt-0.5 whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
            {service.name}
          </h3>
          {descriptionPreview ? (
            <p className={`mt-1 whitespace-normal leading-relaxed ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
              {descriptionPreview}
            </p>
          ) : null}
          <div className={`mt-2 flex flex-wrap gap-2 ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>
            <PriceLabel service={service} />
            {duration ? <span>{duration}</span> : null}
          </div>
        </div>
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className={`shrink-0 px-4 py-2 text-center font-semibold text-white transition hover:brightness-105 ${
          isPreview ? "rounded-lg text-[10px]" : "rounded-xl text-sm"
        }`}
        style={{ backgroundColor: theme.primaryColor }}
      >
        {ctaLabel}
      </Link>
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
  const careBullets = copy.benefitsItems.filter(Boolean).slice(0, 3);
  const trustBullets = copy.trustCards.slice(0, Math.max(0, 3 - careBullets.length));

  return (
    <header data-testid={`${testIdPrefix}-hero`}>
      <div
        className={`relative ${isPreview ? "px-1 pt-1 pb-6" : "px-2 pt-2 pb-10 md:pb-14"}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}22 0%, ${theme.accentColor}10 55%, transparent 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}14 0%, ${theme.accentColor}08 50%, transparent 100%)`,
        }}
      >
        <div
          className={`mx-auto max-w-6xl overflow-hidden shadow-xl ${isPreview ? "rounded-xl" : "rounded-3xl"} ${clinicSurface(isDark)}`}
        >
          <div
            className={`grid ${isPreview ? "gap-3 p-3" : "gap-6 p-6 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:p-8 lg:p-10"}`}
            data-testid={`${testIdPrefix}-hero-content`}
          >
            <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-4 md:space-y-5"}`}>
              <div className="flex items-center gap-2">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
                <p
                  className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[9px]" : "text-[11px]"}`}
                  style={{ color: theme.accentColor }}
                  data-testid={`${testIdPrefix}-hero-badge`}
                >
                  {heroBadgeText}
                </p>
              </div>

              <h1
                className={`${presentation.heroTitleClass} whitespace-normal leading-[1.1]`}
                data-testid={`${testIdPrefix}-hero-title`}
              >
                {heroTitle}
              </h1>

              {heroSubtitle ? (
                <p
                  className={`max-w-xl whitespace-normal font-medium ${isPreview ? "text-xs" : "text-lg"} ${muted}`}
                  data-testid={`${testIdPrefix}-hero-subtitle`}
                >
                  {heroSubtitle}
                </p>
              ) : (
                <p className={`max-w-xl whitespace-normal ${isPreview ? "text-xs" : "text-lg"} ${muted}`}>
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

              <div className={`flex flex-col ${isPreview ? "gap-1.5" : "gap-2.5 sm:flex-row sm:flex-wrap"}`}>
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
                      style: { borderColor: theme.accentColor, color: theme.accentColor, backgroundColor: "transparent" },
                      testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                    })
                  : null}
              </div>

              {trustChips.length > 0 ? (
                <div className="flex flex-wrap gap-2" data-testid={`${testIdPrefix}-hero-trust-chips`}>
                  {trustChips.map((chip) => (
                    <span
                      key={chip}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                        isPreview ? "text-[10px]" : "text-xs"
                      }`}
                      style={{ backgroundColor: `${theme.primaryColor}10`, color: theme.primaryColor }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} aria-hidden />
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <aside
              className={`overflow-hidden ${isPreview ? "rounded-lg" : "rounded-2xl"} ring-1`}
              style={{
                borderColor: `${theme.primaryColor}25`,
                background: isDark
                  ? `linear-gradient(180deg, ${theme.primaryColor}16 0%, rgba(15,23,42,0.9) 100%)`
                  : `linear-gradient(180deg, ${theme.primaryColor}08 0%, #f8fafc 100%)`,
              }}
              data-testid={`${testIdPrefix}-hero-appointment-card`}
            >
              <div
                className={`flex items-center justify-between ${isPreview ? "px-3 py-2" : "px-5 py-4"}`}
                style={{ backgroundColor: theme.primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center rounded-full bg-white/20 font-bold text-white ${
                      isPreview ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
                    }`}
                    data-testid={`${testIdPrefix}-logo-placeholder`}
                  >
                    {monogram}
                  </div>
                  <div>
                    <p className={`font-semibold text-white ${isPreview ? "text-[10px]" : "text-sm"}`}>Book a visit</p>
                    <p className={`text-white/80 ${isPreview ? "text-[9px]" : "text-xs"}`}>{business.name}</p>
                  </div>
                </div>
                <p className={`font-medium text-white/90 ${isPreview ? "text-[9px]" : "text-xs"}`}>Intake panel</p>
              </div>

              <div className={`${isPreview ? "space-y-2 p-3" : "space-y-4 p-5 md:p-6"}`}>
                <div
                  className={`rounded-xl text-center ${isPreview ? "px-2 py-2" : "px-4 py-3"} ${clinicSurface(isDark)} shadow-sm`}
                >
                  <p className={`font-medium uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-[10px]"} ${muted}`}>
                    Appointment availability
                  </p>
                  <p className={`mt-1 font-semibold ${isPreview ? "text-sm" : "text-xl"}`}>
                    {serviceCount != null && serviceCount > 0
                      ? `${serviceCount} specialt${serviceCount === 1 ? "y" : "ies"}`
                      : "Open for booking"}
                  </p>
                </div>

                {hasPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className={`block rounded-xl px-3 py-2 font-semibold hover:underline ${
                      isPreview ? "text-xs" : "text-base"
                    }`}
                    style={{ backgroundColor: `${theme.primaryColor}12`, color: theme.primaryColor }}
                  >
                    {contactPhone}
                  </a>
                ) : null}

                <ul className={`space-y-2 ${isPreview ? "text-[10px]" : "text-sm"}`}>
                  {careBullets.map((item) => (
                    <li key={item} className={`flex items-start gap-2 whitespace-normal ${muted}`}>
                      <span
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: theme.accentColor }}
                        aria-hidden
                      >
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                  {trustBullets.map((stat) => (
                    <li key={stat.subtitle} className={`flex items-start gap-2 whitespace-normal ${muted}`}>
                      <span
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: theme.primaryColor }}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span>
                        <span className="font-medium" style={{ color: theme.primaryColor }}>
                          {stat.title}
                        </span>{" "}
                        {stat.subtitle}
                      </span>
                    </li>
                  ))}
                </ul>

                <div
                  className={`flex flex-col border-t pt-3 ${isDark ? "border-slate-700/60" : "border-slate-200/80"} ${
                    isPreview ? "gap-1.5" : "gap-2"
                  }`}
                  data-testid={`${testIdPrefix}-hero-cta-group`}
                >
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
          className={`relative z-10 mx-auto grid max-w-6xl grid-cols-3 gap-3 ${
            isPreview ? "-mt-4 px-1" : "-mt-6 px-2 md:-mt-8 md:gap-4"
          }`}
          data-testid={`${testIdPrefix}-clinic-info-strip`}
        >
          {infoTiles.map((tile) => (
            <div
              key={tile.key}
              className={`text-center shadow-md ${isPreview ? "rounded-lg px-2 py-2.5" : "rounded-2xl px-3 py-4 md:px-4 md:py-5"} ${clinicSurface(isDark)}`}
            >
              <div
                className={`mx-auto flex items-center justify-center rounded-full font-bold ${
                  isPreview ? "mb-1 h-7 w-7 text-[9px]" : "mb-2 h-9 w-9 text-[10px]"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}14`, color: theme.primaryColor }}
              >
                {tile.glyph}
              </div>
              <p className={`font-medium uppercase tracking-[0.12em] ${isPreview ? "text-[9px]" : "text-[10px]"}`} style={{ color: theme.accentColor }}>
                {tile.label}
              </p>
              <p className={`mt-1 whitespace-normal font-semibold ${isPreview ? "text-[11px]" : "text-sm"}`}>{tile.value}</p>
              {tile.detail ? (
                <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>{tile.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
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
  businessName: string;
};

export function ClinicAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
  businessName,
}: ClinicAboutSectionProps) {
  const muted = clinicMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";
  const monogram = businessName.charAt(0).toUpperCase();

  return (
    <section className={`${isPreview ? "py-4" : "py-10 md:py-12"}`} data-testid={`${testIdPrefix}-about`}>
      <div
        className={`mx-auto grid max-w-6xl overflow-hidden shadow-sm ${isPreview ? "rounded-xl" : "rounded-3xl"} ${
          isPreview ? "" : "md:grid-cols-[1.1fr_0.9fr]"
        } ${clinicSurface(isDark)}`}
      >
        <div className={isPreview ? "p-3" : "p-6 md:p-8 lg:p-10"}>
          <p
            className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`}
            style={{ color: theme.accentColor }}
            data-testid={`${testIdPrefix}-about-title`}
          >
            About the clinic
          </p>
          <h2 className={`mt-2 whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}>{title}</h2>
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
        <div
          className={`flex items-center justify-center ${isPreview ? "min-h-[4rem] p-3" : "min-h-[12rem] p-8"}`}
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}12, ${theme.accentColor}10)`,
          }}
          aria-hidden
        >
          <div
            className={`flex items-center justify-center rounded-full font-bold text-white shadow-lg ${
              isPreview ? "h-14 w-14 text-xl" : "h-24 w-24 text-4xl"
            }`}
            style={{ backgroundColor: theme.primaryColor }}
          >
            {monogram}
          </div>
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
      className={`${isPreview ? "py-4" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`mx-auto max-w-6xl ${isPreview ? "rounded-xl px-3 py-4" : "rounded-3xl px-5 py-8 md:px-8 md:py-10"}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}12 0%, rgba(15,23,42,0.55) 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}08 0%, ${theme.accentColor}06 100%)`,
        }}
      >
        <div className={`${isPreview ? "mb-3" : "mb-6 md:mb-8"} flex flex-wrap items-end justify-between gap-3`}>
          <div>
            <p className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Medical specialties
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-1 whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-1 whitespace-normal ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
              Treatments and appointments with our care team.
            </p>
          </div>
          {badgeText ? (
            <span
              className={`rounded-full px-3 py-1 font-medium ${isPreview ? "text-[10px]" : "text-xs"} ${clinicSurface(isDark)} shadow-sm`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {services && services.length > 0 ? (
          <div className={`grid gap-3 ${isPreview ? "" : "md:grid-cols-2 md:gap-4"}`}>
            {services.map((service) => (
              <ClinicSpecialtyRow
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
          <ClinicSpecialtyRow
            slug=""
            service={{
              id: "preview-sample",
              name: "General consultation",
              description: "Specialties and treatments appear here on the live page.",
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
    <section className={`${isPreview ? "py-4" : "py-10 md:py-12"}`} data-testid={`${testIdPrefix}-trust`}>
      <div className={`mx-auto max-w-6xl ${isPreview ? "space-y-3" : "space-y-4"}`}>
        <div>
          <p className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
            Patient care
          </p>
          <h2 className={`mt-1 font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>{copy.benefitsSectionTitle}</h2>
        </div>

        <div
          className={`grid overflow-hidden shadow-sm ${isPreview ? "rounded-xl" : "rounded-3xl"} ${
            isPreview ? "" : "md:grid-cols-2"
          }`}
        >
          {hasBenefits ? (
            <div
              className={isPreview ? "p-3" : "p-6 md:p-8"}
              style={{ backgroundColor: isDark ? `${theme.primaryColor}14` : `${theme.primaryColor}08` }}
              data-testid={`${testIdPrefix}-benefits-strip`}
            >
              <p className={`mb-4 font-medium ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>What to expect</p>
              <ol className="space-y-4">
                {copy.benefitsItems.filter(Boolean).map((item, index) => (
                  <li key={item} className="flex gap-4">
                    <span
                      className={`shrink-0 font-bold leading-none ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}
                      style={{ color: `${theme.primaryColor}55` }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className={`min-w-0 whitespace-normal pt-1 ${isPreview ? "text-xs" : "text-sm md:text-base"}`}>{item}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {showTrustStats ? (
            <div
              className={`${clinicSurface(isDark)} ${isPreview ? "p-3" : "p-6 md:p-8"}`}
              data-testid={`${testIdPrefix}-trust-stats`}
            >
              <p className={`mb-4 font-medium ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>Why patients choose us</p>
              <div className="space-y-4">
                {copy.trustCards.map((stat) => (
                  <div
                    key={stat.subtitle}
                    className={`flex items-start gap-3 rounded-xl ${isPreview ? "p-2" : "p-3"}`}
                    style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : `${theme.accentColor}08` }}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${
                        isPreview ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
                      }`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {stat.title.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className={`font-semibold ${isPreview ? "text-sm" : "text-lg"}`} style={{ color: theme.primaryColor }}>
                        {stat.title}
                      </p>
                      <p className={`whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{stat.subtitle}</p>
                    </div>
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
      className={`${isPreview ? "py-4" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`mx-auto max-w-4xl ${isPreview ? "rounded-xl p-3" : "rounded-3xl p-6 md:p-8"} ${clinicSurface(isDark)} shadow-sm`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>Patient questions & answers</p>
        <dl className={`mt-4 space-y-0 ${isPreview ? "" : "mt-6"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-b border-l-4 py-4 pl-4 last:border-b-0 ${isDark ? "border-slate-700/55" : "border-slate-200/80"} ${
                  isPreview ? "py-3 pl-3" : "md:py-5 md:pl-5"
                }`}
                style={{ borderLeftColor: theme.primaryColor }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"}`}
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
      className={`${isPreview ? "py-4" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`mx-auto max-w-6xl ${isPreview ? "rounded-xl p-3" : "rounded-3xl p-6 md:p-8"}`}
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${theme.primaryColor}16 0%, rgba(15,23,42,0.8) 100%)`
            : `linear-gradient(135deg, ${theme.primaryColor}10 0%, #ffffff 100%)`,
        }}
      >
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`whitespace-normal font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>
        <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>Appointment details & clinic location</p>

        <div className={`mt-4 grid gap-3 ${isPreview ? "" : "md:mt-6 md:grid-cols-2 md:gap-4"}`}>
          {hasPhone ? (
            <div className={`rounded-2xl ${isPreview ? "p-3" : "p-5"} ${clinicSurface(isDark)} shadow-sm`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
              <a
                href={`tel:${contactPhone}`}
                className={`mt-2 inline-block font-semibold hover:underline ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {contactPhone}
              </a>
            </div>
          ) : null}
          {hasAddress ? (
            <div className={`rounded-2xl ${isPreview ? "p-3" : "p-5"} ${clinicSurface(isDark)} shadow-sm`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Clinic address</p>
              <p className={`mt-2 whitespace-normal font-medium ${isPreview ? "text-sm" : "text-base md:text-lg"}`}>{contactAddress}</p>
            </div>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div
            className={`mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 ${isDark ? "border-slate-700/55" : "border-slate-200/70"} ${
              isPreview ? "text-[11px]" : "text-xs"
            }`}
            data-testid={`${testIdPrefix}-social-links`}
          >
            {entries.map((entry) => (
              <div key={entry.key} data-testid={`${testIdPrefix}-${entry.key}`}>
                <span className={`font-medium ${muted}`}>{entry.label}: </span>
                <span>{entry.value}</span>
              </div>
            ))}
          </div>
        ) : null}
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
    <section className={`${isPreview ? "py-4" : "py-10 md:py-12"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`mx-auto max-w-6xl overflow-hidden ${isPreview ? "rounded-xl" : "rounded-3xl"}`}
        style={{
          background: isDark
            ? `linear-gradient(90deg, ${theme.primaryColor}24 0%, rgba(15,23,42,0.9) 100%)`
            : `linear-gradient(90deg, ${theme.primaryColor}16 0%, ${theme.accentColor}12 100%)`,
        }}
      >
        <div
          className={`flex flex-col justify-between gap-4 ${isPreview ? "p-3" : "p-6 md:flex-row md:items-center md:p-8 lg:p-10"} ${
            clinicSurface(isDark)
          } m-1 rounded-[inherit] shadow-sm`}
        >
          <div className="min-w-0">
            <p className={`font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>Schedule your visit</p>
            <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${clinicMutedText(isDark)}`}>
              Ready to book an appointment? Our care team is here to help you take the next step.
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
                  style: { borderColor: theme.accentColor, color: theme.accentColor },
                  testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                })
              : null}
          </div>
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
      className={`text-center ${isPreview ? "py-4" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <h2 id={`${testIdPrefix}-gallery-heading`} className={`font-semibold ${isPreview ? "text-sm" : "text-lg"}`}>
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
        Photo gallery coming soon. Showcase your clinic here.
      </p>
    </section>
  );
}
