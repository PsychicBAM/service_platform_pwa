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
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteCopy,
  MiniSiteSocialLinks,
} from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";

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

const CLINIC_CONTAINER = "mx-auto w-full max-w-[75rem] px-5 sm:px-6 md:px-8 lg:px-10";

function clinicContainerClass(isPreview: boolean): string {
  return isPreview ? "mx-auto w-full max-w-none px-3" : CLINIC_CONTAINER;
}

function clinicMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function clinicPanel(isDark: boolean): string {
  return isDark ? "bg-slate-900/80 text-slate-100" : "bg-white text-slate-900";
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book your visit with trusted specialists — calm, professional care tailored to you.";
    case "orders_only":
      return "Send a consultation request and our care team will guide you through the next steps.";
    default:
      return "A modern clinic experience — appointments, treatments, and patient support in one place.";
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

type ClinicValueCard = {
  key: string;
  label: string;
  title: string;
  detail?: string;
};

function buildValueCards({
  copy,
  serviceCount,
  contactPhone,
  contactAddress,
}: {
  copy: MiniSiteCopy;
  serviceCount: number | null;
  contactPhone: string;
  contactAddress: string;
}): ClinicValueCard[] {
  const benefits = copy.benefitsItems.filter(Boolean);
  const trust = copy.trustCards;

  const booking: ClinicValueCard = {
    key: "booking",
    label: "Appointments",
    title: benefits[0] ?? trust[0]?.subtitle ?? "Easy online booking",
    detail: trust[0]?.title,
  };

  const specialists: ClinicValueCard = {
    key: "specialists",
    label: "Specialties",
    title:
      serviceCount != null && serviceCount > 0
        ? `${serviceCount} treatment${serviceCount === 1 ? "" : "s"} available`
        : (benefits[1] ?? trust[1]?.subtitle ?? "Specialist-led care"),
    detail: serviceCount != null && serviceCount > 0 ? "Book online today" : trust[1]?.title,
  };

  let contact: ClinicValueCard;
  if (hasMeaningfulText(contactPhone)) {
    contact = { key: "phone", label: "Contact", title: contactPhone.trim(), detail: "Call the clinic" };
  } else if (hasMeaningfulText(contactAddress)) {
    contact = { key: "address", label: "Location", title: contactAddress.trim(), detail: "Visit our clinic" };
  } else {
    contact = {
      key: "care",
      label: "Patient care",
      title: benefits[2] ?? trust[2]?.subtitle ?? copy.benefitsSectionTitle,
      detail: trust[2]?.title,
    };
  }

  return [booking, specialists, contact];
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
    ? service.description.length > (variant === "preview" ? 80 : 140)
      ? `${service.description.slice(0, variant === "preview" ? 80 : 140).trim()}…`
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
      className={`flex h-full flex-col overflow-hidden ${isPreview ? "rounded-xl" : "rounded-3xl"} ${clinicPanel(isDark)} ${
        isDark ? "ring-1 ring-slate-700/50" : "shadow-md ring-1 ring-slate-200/70"
      }`}
      data-testid="service-card"
    >
      <div
        className={`h-1 shrink-0 ${isPreview ? "" : "h-1.5"}`}
        style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor}88)` }}
        aria-hidden
      />
      <div className={`flex flex-1 flex-col ${isPreview ? "p-4" : "p-7 lg:p-8"}`}>
        <div className="flex flex-1 gap-5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-2xl border font-semibold ${
              isPreview ? "h-12 w-12 text-lg" : "h-16 w-16 text-2xl"
            }`}
            style={{
              borderColor: `${theme.primaryColor}30`,
              backgroundColor: `${theme.primaryColor}08`,
              color: theme.primaryColor,
            }}
            aria-hidden
          >
            ✚
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`}
              style={{ color: theme.accentColor }}
            >
              {service.type === "booking" ? "Specialty treatment" : "Medical consultation"}
            </p>
            <h3 className={`mt-2 whitespace-normal font-semibold leading-tight ${isPreview ? "text-base" : "text-xl lg:text-2xl"}`}>
              {service.name}
            </h3>
            {descriptionPreview ? (
              <p className={`mt-3 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base lg:text-lg"} ${muted}`}>
                {descriptionPreview}
              </p>
            ) : null}
            <div
              className={`mt-4 flex flex-wrap items-center gap-2 ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
            >
              <span
                className={`rounded-full px-3 py-1 ${isDark ? "bg-slate-800/80" : "bg-slate-100"}`}
              >
                <PriceLabel service={service} />
              </span>
              {duration ? (
                <span className={`rounded-full px-3 py-1 ${isDark ? "bg-slate-800/80" : "bg-slate-100"}`}>{duration}</span>
              ) : null}
            </div>
          </div>
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`mt-6 inline-flex w-full items-center justify-center font-semibold text-white transition hover:brightness-105 ${
            isPreview ? "rounded-lg py-2.5 text-xs" : "rounded-xl py-4 text-base md:text-lg"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {ctaLabel}
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
  templateImages?: MiniSiteTemplateImages;
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
  templateImages,
}: ClinicHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const heroImage = templateImages?.heroImage ?? null;
  const doctorOrClinicImage = templateImages?.doctorOrClinicImage ?? null;
  const hasPhone = hasMeaningfulText(contactPhone);
  const hasAddress = hasMeaningfulText(contactAddress);
  const trustChips = buildTrustChips(copy);
  const valueCards = buildValueCards({ copy, serviceCount, contactPhone, contactAddress });
  const careSteps = copy.benefitsItems.filter(Boolean).slice(0, 3);

  return (
    <div className={clinicContainerClass(isPreview)}>
      <section
        data-testid={`${testIdPrefix}-clinic-hero`}
        className={isPreview ? "pb-4" : "pb-8 lg:pb-10"}
      >
        <div
          className={`relative overflow-hidden ${isPreview ? "rounded-2xl" : "rounded-[2rem] lg:rounded-[2.25rem]"} ${clinicPanel(isDark)} ${
            isDark ? "ring-1 ring-slate-700/50" : "shadow-xl ring-1 ring-slate-200/60"
          }`}
          data-testid={`${testIdPrefix}-hero`}
          style={{
            background: isDark
              ? undefined
              : `linear-gradient(160deg, #ffffff 0%, #f8fafc 42%, ${theme.primaryColor}04 100%)`,
          }}
        >
          <div
            className={`clinic-hero-shell grid items-stretch ${
              isPreview
                ? "gap-4 p-4"
                : "min-h-[28rem] gap-10 p-8 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:p-10 lg:min-h-[32rem] lg:p-14"
            }`}
            data-testid={`${testIdPrefix}-hero-content`}
          >
            <div className={`clinic-hero-copy flex min-w-0 flex-col justify-center ${isPreview ? "space-y-3" : "space-y-6 lg:space-y-7"}`}>
              {heroImage ? (
                <MiniSiteSlotImage
                  media={heroImage}
                  className={`w-full max-w-md ${isPreview ? "h-24 rounded-lg" : "h-36 rounded-xl"}`}
                  testId={`${testIdPrefix}-template-heroImage`}
                />
              ) : null}
              <p
                className={`inline-flex w-fit rounded-full px-4 py-1.5 font-medium uppercase tracking-[0.18em] ${
                  isPreview ? "text-[10px]" : "text-xs md:text-sm"
                } ${isDark ? "bg-slate-800/80 text-slate-200" : "bg-slate-100 text-slate-600"}`}
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
                  className={`max-w-2xl whitespace-normal font-medium leading-relaxed ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${muted}`}
                  data-testid={`${testIdPrefix}-hero-subtitle`}
                >
                  {heroSubtitle}
                </p>
              ) : (
                <p className={`max-w-2xl whitespace-normal leading-relaxed ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${muted}`}>
                  {heroIntro(operatingMode)}
                </p>
              )}

              {heroBody ? (
                <p
                  className={`max-w-2xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"} ${muted}`}
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
                      style: { borderColor: theme.accentColor, color: theme.accentColor, backgroundColor: "transparent" },
                      testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                    })
                  : null}
              </div>

              {trustChips.length > 0 ? (
                <div className="flex flex-wrap gap-2.5" data-testid={`${testIdPrefix}-hero-trust-chips`}>
                  {trustChips.map((chip) => (
                    <span
                      key={chip}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium ${
                        isPreview ? "text-[10px]" : "text-sm"
                      } ${isDark ? "border-slate-600/70 bg-slate-800/50 text-slate-200" : "border-slate-200/90 bg-white text-slate-600 shadow-sm"}`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: theme.accentColor }}
                        aria-hidden
                      />
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <aside
              className={`clinic-appointment-card flex flex-col overflow-hidden ${isPreview ? "rounded-xl" : "rounded-[1.5rem] lg:rounded-[1.75rem]"} ${
                isDark ? "bg-slate-950/95 ring-1 ring-slate-700/60" : "bg-white ring-1 ring-slate-200/70"
              } shadow-lg`}
              data-testid={`${testIdPrefix}-hero-appointment-card`}
            >
              <div
                className={`border-b ${isDark ? "border-slate-700/60" : "border-slate-100"} ${
                  isPreview ? "px-4 py-3" : "px-7 py-5 lg:px-8 lg:py-6"
                }`}
                style={{
                  background: isDark
                    ? `linear-gradient(90deg, ${theme.primaryColor}20 0%, rgba(15,23,42,0.95) 100%)`
                    : `linear-gradient(90deg, ${theme.primaryColor}08 0%, #f8fafc 100%)`,
                }}
              >
                <p className={`font-semibold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>Book a visit</p>
                <p className={`mt-0.5 ${isPreview ? "text-[10px]" : "text-sm md:text-base"} ${muted}`}>
                  Clinic appointment intake
                </p>
              </div>

              <div className={`flex flex-1 flex-col ${isPreview ? "space-y-3 p-4" : "space-y-6 p-7 lg:space-y-7 lg:p-9"}`}>
                <div
                  className={`rounded-2xl text-center ${isPreview ? "px-3 py-2.5" : "px-5 py-4"} ${
                    isDark ? "bg-slate-900/80" : "bg-slate-50"
                  }`}
                >
                  <p className={`font-medium uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>
                    Appointment availability
                  </p>
                  <p className={`mt-1 font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>
                    {serviceCount != null && serviceCount > 0
                      ? `${serviceCount} specialt${serviceCount === 1 ? "y" : "ies"} available`
                      : "Open for booking"}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  {doctorOrClinicImage ? (
                    <MiniSiteSlotImage
                      media={doctorOrClinicImage}
                      className={`shrink-0 ${isPreview ? "h-14 w-14 rounded-2xl" : "h-20 w-20 rounded-2xl"}`}
                      testId={`${testIdPrefix}-template-doctorOrClinicImage`}
                    />
                  ) : (
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-2xl border-2 font-bold ${
                      isPreview ? "h-14 w-14 text-xl" : "h-20 w-20 text-3xl"
                    }`}
                    style={{
                      borderColor: `${theme.primaryColor}35`,
                      backgroundColor: `${theme.primaryColor}10`,
                      color: theme.primaryColor,
                    }}
                    data-testid={`${testIdPrefix}-logo-placeholder`}
                  >
                    {monogram}
                  </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-semibold ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>{business.name}</p>
                    <p className={`${isPreview ? "text-xs" : "text-base"} ${muted}`}>Trusted clinic care</p>
                  </div>
                </div>

                {hasPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className={`block rounded-xl px-4 py-3 font-semibold hover:underline ${
                      isPreview ? "text-sm" : "text-xl md:text-2xl"
                    } ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}
                    style={{ color: theme.primaryColor }}
                  >
                    {contactPhone}
                  </a>
                ) : null}

                {hasAddress ? (
                  <p className={`whitespace-normal rounded-xl px-4 py-3 ${isPreview ? "text-xs" : "text-base"} ${muted} ${
                    isDark ? "bg-slate-900/80" : "bg-slate-50"
                  }`}>
                    {contactAddress}
                  </p>
                ) : null}

                {careSteps.length > 0 ? (
                  <ul className={`space-y-3.5 ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
                    {careSteps.map((step, index) => (
                      <li key={step} className={`flex gap-3.5 whitespace-normal ${muted}`}>
                        <span
                          className={`flex shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                            isPreview ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs"
                          }`}
                          style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                        >
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={`mt-auto flex flex-col ${isPreview ? "gap-2" : "gap-3"}`}>
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
          className={`mt-8 grid grid-cols-1 gap-4 ${isPreview ? "mt-4 gap-2" : "md:grid-cols-3 lg:mt-10 lg:gap-6"}`}
          data-testid={`${testIdPrefix}-clinic-info-strip`}
        >
          {valueCards.map((card) => (
            <div
              key={card.key}
              className={`flex min-w-0 gap-4 ${isPreview ? "rounded-xl p-3" : "rounded-2xl p-6 lg:p-7"} ${clinicPanel(isDark)} ${
                isDark ? "ring-1 ring-slate-700/50" : "shadow-md ring-1 ring-slate-200/70"
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold ${
                  isPreview ? "h-10 w-10 text-xs" : "h-14 w-14 text-sm"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}10`, color: theme.primaryColor }}
                aria-hidden
              >
                {card.label.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
                  {card.label}
                </p>
                <p className={`mt-1.5 whitespace-normal font-semibold leading-snug ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>
                  {card.title}
                </p>
                {card.detail ? (
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{card.detail}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export type ClinicAboutSectionProps = ClinicSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ClinicTheme;
  isDark: boolean;
  businessName: string;
  copy: MiniSiteCopy;
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
  copy,
}: ClinicAboutSectionProps) {
  const muted = clinicMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";
  const monogram = businessName.charAt(0).toUpperCase();
  const identityChips = buildTrustChips(copy);

  return (
    <section className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`} data-testid={`${testIdPrefix}-about`}>
      <div className={`grid items-stretch ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-12"}`}>
        <div
          className={`${isPreview ? "rounded-xl p-4" : "rounded-[1.75rem] p-8 lg:p-10"} ${clinicPanel(isDark)} ${
            isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
          }`}
        >
          <p
            className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`}
            style={{ color: theme.accentColor }}
            data-testid={`${testIdPrefix}-about-title`}
          >
            About the clinic
          </p>
          <h2 className={`mt-3 whitespace-normal font-semibold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl lg:text-[2.75rem]"}`}>
            {title}
          </h2>
          {content ? (
            <p
              className={`mt-5 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}
              data-testid={`${testIdPrefix}-about-body`}
            >
              {content}
            </p>
          ) : (
            <p className={`mt-5 text-sm italic ${muted}`}>About text will appear here.</p>
          )}
        </div>

        <div
          className={`flex flex-col justify-between ${isPreview ? "rounded-xl p-4" : "rounded-[1.75rem] p-8 lg:p-10"} ${
            isDark ? "bg-slate-900/80 ring-1 ring-slate-700/50" : "bg-white shadow-lg ring-1 ring-slate-200/60"
          }`}
        >
          <div className="flex items-center gap-5">
            <div
              className={`flex items-center justify-center rounded-2xl border-2 font-bold ${
                isPreview ? "h-14 w-14 text-xl" : "h-20 w-20 text-3xl"
              }`}
              style={{
                borderColor: `${theme.primaryColor}35`,
                backgroundColor: `${theme.primaryColor}10`,
                color: theme.primaryColor,
              }}
            >
              {monogram}
            </div>
            <div>
              <p className={`font-semibold ${isPreview ? "text-sm" : "text-2xl md:text-3xl"}`}>{businessName}</p>
              <p className={`${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>Trusted clinic care</p>
            </div>
          </div>
          {identityChips.length > 0 ? (
            <div className={`flex flex-wrap gap-2.5 ${isPreview ? "mt-4" : "mt-8"}`}>
              {identityChips.map((chip) => (
                <span
                  key={chip}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium ${
                    isPreview ? "text-[10px]" : "text-sm"
                  } ${isDark ? "border-slate-600/70 bg-slate-800/50 text-slate-200" : "border-slate-200/90 bg-slate-50 text-slate-600"}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: theme.accentColor }} aria-hidden />
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
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
  templateImages?: MiniSiteTemplateImages;
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
  templateImages,
}: ClinicServicesSectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Our services";
  const servicesImage = templateImages?.servicesImage ?? null;

  return (
    <section
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`${isPreview ? "rounded-2xl p-4" : "rounded-[2rem] p-8 lg:p-12"} ${clinicPanel(isDark)} ${
          isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
        }`}
        data-testid={`${testIdPrefix}-clinic-specialties`}
      >
        <div className={`${isPreview ? "mb-4" : "mb-10"} flex flex-wrap items-end justify-between gap-6`}>
          <div className="max-w-3xl">
            <p className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Specialties & treatments
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-3 whitespace-normal font-semibold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl lg:text-[2.75rem]"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-3 max-w-2xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}>
              Expert-led treatments and appointments with our clinical care team.
            </p>
          </div>
          {badgeText ? (
            <span
              className={`rounded-full border px-5 py-2 font-medium ${isPreview ? "text-[10px]" : "text-sm md:text-base"} ${
                isDark ? "border-slate-600/70 bg-slate-800/50" : "border-slate-200/90 bg-slate-50 text-slate-600"
              }`}
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
          <div className={`grid gap-5 ${isPreview ? "" : "md:grid-cols-2 md:gap-8 lg:gap-10"}`}>
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
          <p className={`text-base ${muted}`}>
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
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      <div data-testid={`${testIdPrefix}-clinic-care`} className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-10"}`}>
        {hasBenefits ? (
          <div
            className={`flex flex-col ${isPreview ? "rounded-xl p-4" : "min-h-[22rem] rounded-[1.75rem] p-8 lg:p-10"} ${clinicPanel(isDark)} ${
              isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
            }`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            <p className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Patient care
            </p>
            <h2 className={`mt-3 font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}>What to expect</h2>
            <ol className={`mt-6 flex-1 space-y-6 ${isPreview ? "mt-3 space-y-3" : "lg:mt-8 lg:space-y-7"}`}>
              {copy.benefitsItems.filter(Boolean).map((item, index) => (
                <li key={item} className="flex gap-5">
                  <span
                    className={`shrink-0 font-bold leading-none tabular-nums ${isPreview ? "text-2xl" : "text-4xl md:text-5xl lg:text-6xl"}`}
                    style={{ color: `${theme.primaryColor}35` }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className={`min-w-0 whitespace-normal pt-2 leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div />
        )}

        {showTrustStats ? (
          <div
            className={`flex flex-col ${isPreview ? "rounded-xl p-4" : "min-h-[22rem] rounded-[1.75rem] p-8 lg:p-10"} ${clinicPanel(isDark)} ${
              isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
            }`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Why patients choose us
            </p>
            <div className={`mt-6 flex flex-1 flex-col justify-center space-y-7 ${isPreview ? "mt-3 space-y-4" : "lg:mt-8 lg:space-y-8"}`}>
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className={`border-b pb-6 last:border-0 last:pb-0 ${isDark ? "border-slate-700/60" : "border-slate-200/80"}`}>
                  <p className={`font-semibold leading-tight ${isPreview ? "text-xl" : "text-3xl md:text-4xl lg:text-[2.5rem]"}`} style={{ color: theme.primaryColor }}>
                    {stat.title}
                  </p>
                  <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}>{stat.subtitle}</p>
                </div>
              ))}
            </div>
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
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div
        className={`${isPreview ? "rounded-xl p-4" : "rounded-[1.75rem] p-8 lg:p-10"} ${clinicPanel(isDark)} ${
          isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
        }`}
      >
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <p className={`mt-2 ${isPreview ? "text-xs" : "text-lg"} ${muted}`}>Common patient questions</p>
        <dl className={`mt-6 divide-y ${isDark ? "divide-slate-700/60" : "divide-slate-200/80"} ${isPreview ? "mt-3" : "lg:mt-8"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-l-4 py-5 pl-5 ${isPreview ? "py-3 pl-3" : "lg:py-6 lg:pl-6"}`}
                style={{ borderLeftColor: theme.primaryColor }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-3 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
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
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`overflow-hidden ${isPreview ? "rounded-xl" : "rounded-[1.75rem]"} ${clinicPanel(isDark)} ${
          isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
        }`}
      >
        <div
          className={`border-b ${isDark ? "border-slate-700/60" : "border-slate-100"} ${
            isPreview ? "px-4 py-3" : "px-8 py-6 lg:px-10 lg:py-7"
          }`}
          style={{
            background: isDark
              ? `linear-gradient(90deg, ${theme.primaryColor}18 0%, rgba(15,23,42,0.95) 100%)`
              : `linear-gradient(90deg, ${theme.primaryColor}06 0%, #f8fafc 100%)`,
          }}
        >
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`whitespace-normal font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {title}
          </h2>
          <p className={`mt-1 ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}>Appointment details and clinic location</p>
        </div>

        <div className={`${isPreview ? "p-4" : "p-8 lg:p-10"}`}>
          <div className={`grid gap-5 ${isPreview ? "" : "md:grid-cols-2 md:gap-8"}`}>
            {hasPhone ? (
              <div className={`rounded-2xl ${isPreview ? "p-3" : "p-6 lg:p-8"} ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}>
                <p className={`text-xs font-medium uppercase tracking-[0.14em] md:text-sm ${muted}`}>Phone</p>
                <a
                  href={`tel:${contactPhone}`}
                  className={`mt-3 inline-block font-semibold hover:underline ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
                <p className={`mt-2 ${isPreview ? "text-[10px]" : "text-base"} ${muted}`}>Call to schedule or ask about availability</p>
              </div>
            ) : null}
            {hasAddress ? (
              <div className={`rounded-2xl ${isPreview ? "p-3" : "p-6 lg:p-8"} ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}>
                <p className={`text-xs font-medium uppercase tracking-[0.14em] md:text-sm ${muted}`}>Clinic address</p>
                <p className={`mt-3 whitespace-normal font-medium leading-relaxed ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>
                  {contactAddress}
                </p>
                <p className={`mt-2 ${isPreview ? "text-[10px]" : "text-base"} ${muted}`}>Visit us for in-person appointments</p>
              </div>
            ) : null}
          </div>

          {entries.length > 0 ? (
            <div
              className={`mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6 ${isDark ? "border-slate-700/60" : "border-slate-200/80"} ${
                isPreview ? "text-[10px]" : "text-base"
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
  templateImages?: MiniSiteTemplateImages;
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
  templateImages,
}: ClinicBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;
  const appointmentImage = templateImages?.appointmentImage ?? null;

  return (
    <section className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`flex flex-col justify-between gap-8 ${isPreview ? "rounded-xl p-4" : "rounded-[2rem] p-8 md:flex-row md:items-center md:gap-10 lg:p-12"} ${
          clinicPanel(isDark)
        } ${isDark ? "ring-1 ring-slate-700/50" : "shadow-xl ring-1 ring-slate-200/60"}`}
        style={{
          background: isDark
            ? undefined
            : `linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, ${theme.primaryColor}05 100%)`,
        }}
      >
        {appointmentImage ? (
          <MiniSiteSectionAccentImage
            media={appointmentImage}
            variant={variant}
            testId={`${testIdPrefix}-template-appointmentImage`}
            className={`${isPreview ? "mb-3" : "mb-6"} max-w-md`}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={`font-semibold leading-tight ${isPreview ? "text-base" : "text-3xl md:text-4xl lg:text-[2.75rem]"}`}>Schedule your visit</p>
          <p className={`mt-3 max-w-2xl leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${clinicMutedText(isDark)}`}>
            Ready to book an appointment? Our care team will help you take the next step.
          </p>
        </div>
        <div className={`flex w-full shrink-0 flex-col ${isPreview ? "gap-2" : "gap-4 sm:min-w-[20rem] sm:flex-row md:w-auto"}`}>
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
  isDark: boolean;
};

export function ClinicGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  isDark,
}: ClinicGallerySectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`${clinicContainerClass(isPreview)} text-center ${isPreview ? "py-4" : "py-8 lg:py-10"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <h2 id={`${testIdPrefix}-gallery-heading`} className={`font-semibold ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-lg whitespace-normal ${isPreview ? "text-xs" : "text-base"} ${muted}`}>
        Photo gallery coming soon. Showcase your clinic here.
      </p>
    </section>
  );
}
