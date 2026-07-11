import { useState, type ReactNode } from "react";
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
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteCopy,
  MiniSiteSocialLinks,
} from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";
import { isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";

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

function clinicHeading(isDark: boolean): string {
  return isDark ? "text-white" : "text-slate-950";
}

function clinicCoralBg(theme: ClinicTheme): string {
  return theme.primaryColor;
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

type ServiceFeature = {
  key: string;
  title: string;
  detail: string;
};

function buildServiceFeatures(
  services: PublicService[] | undefined,
  copy: MiniSiteCopy,
): ServiceFeature[] {
  if (services && services.length > 0) {
    return services.slice(0, 4).map((service) => ({
      key: service.id,
      title: service.name,
      detail:
        service.description?.slice(0, 60) ??
        (service.type === "booking" ? "Book an appointment" : "Request a consultation"),
    }));
  }

  const fromBenefits = copy.benefitsItems.filter(Boolean).slice(0, 4);
  if (fromBenefits.length > 0) {
    return fromBenefits.map((item, index) => ({
      key: `benefit-${index}`,
      title: item,
      detail: "Patient-focused care",
    }));
  }

  return copy.trustCards.slice(0, 4).map((card, index) => ({
    key: `trust-${index}`,
    title: card.title,
    detail: card.subtitle,
  }));
}

function ClinicIntroVideoCard({
  media,
  variant,
  testId,
  isDark,
  primaryColor,
}: {
  media: MiniSiteVideoMedia;
  variant: ClinicSectionVariant;
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
    <div className={isPreview ? "mt-3" : "mt-6"}>
      {isPlaying ? (
        <div className="max-w-xs">
          <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${clinicMutedText(isDark)}`}>
            Clinic introduction
          </p>
          <MiniSiteVideoEmbed media={media} variant={variant} testId={testId} className="rounded-xl overflow-hidden" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${
            isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white"
          } ${isPreview ? "text-[10px]" : "text-xs"}`}
          data-testid={testId}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px]"
            style={{ backgroundColor: primaryColor }}
            aria-hidden
          >
            ▶
          </span>
          <span className={`font-semibold ${clinicHeading(isDark)}`}>Clinic introduction</span>
        </button>
      )}
    </div>
  );
}

function ClinicTreatmentCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  primaryCtaLabel,
  showcaseImage,
  imageTestId,
}: {
  slug: string;
  service: PublicService;
  theme: ClinicTheme;
  isDark: boolean;
  variant: ClinicSectionVariant;
  primaryCtaLabel: string;
  showcaseImage?: MiniSiteImageMedia | null;
  imageTestId?: string;
}) {
  const isPreview = variant === "preview";
  const muted = clinicMutedText(isDark);
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (isPreview ? 70 : 100)
      ? `${service.description.slice(0, isPreview ? 70 : 100).trim()}…`
      : service.description
    : null;
  const ctaLabel =
    service.type === "booking"
      ? hasMeaningfulText(primaryCtaLabel)
        ? primaryCtaLabel
        : "Book now"
      : serviceActionLabel(service.type);

  return (
    <article
      className={`overflow-hidden ${isPreview ? "rounded-xl" : "rounded-[1.5rem] md:rounded-[2rem]"} bg-white shadow-lg ${
        isDark ? "ring-1 ring-slate-700/50" : "ring-1 ring-slate-100"
      }`}
      data-testid="service-card"
    >
      <div className="relative overflow-hidden">
        {showcaseImage && imageTestId ? (
          <MiniSiteSlotImage
            media={showcaseImage}
            testId={imageTestId}
            className={`w-full object-cover ${isPreview ? "h-24" : "h-44 md:h-52"}`}
          />
        ) : (
          <div
            className={`w-full ${isPreview ? "h-24" : "h-44 md:h-52"}`}
            style={{ background: `linear-gradient(135deg, ${theme.primaryColor}22, ${theme.accentColor}18)` }}
            aria-hidden
          />
        )}
        <div
          className={`absolute inset-x-0 bottom-0 px-4 py-3 ${isPreview ? "px-3 py-2" : "px-5 py-4"}`}
          style={{ backgroundColor: clinicCoralBg(theme) }}
        >
          <h3 className={`font-bold text-white ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>{service.name}</h3>
        </div>
      </div>
      <div className={isPreview ? "space-y-2 p-3" : "space-y-3 p-5 md:p-6"}>
        {descriptionPreview ? (
          <p className={`whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
            {descriptionPreview}
          </p>
        ) : null}
        <div className={`flex flex-wrap items-center gap-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
          <PriceLabel service={service} />
          {duration ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{duration}</span> : null}
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`inline-flex w-full items-center justify-center rounded-full border-2 font-bold transition hover:brightness-105 ${
            isPreview ? "py-2 text-[11px]" : "py-3 text-sm"
          }`}
          style={{ borderColor: clinicCoralBg(theme), color: clinicCoralBg(theme), backgroundColor: "white" }}
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

/* ─── 1. HERO: white medical hero + large circular image ─── */
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
  const heroImage = templateImages?.heroImage ?? templateImages?.doctorOrClinicImage ?? null;
  const valueCards = buildValueCards({ copy, serviceCount, contactPhone, contactAddress });
  const trustStat = copy.trustCards[0];

  return (
    <div className={clinicContainerClass(isPreview)}>
      <section data-testid={`${testIdPrefix}-clinic-hero`} className={isPreview ? "pb-3" : "pb-10 lg:pb-14"}>
        <div
          className={`bg-white ${isDark ? "bg-slate-950" : ""} ${isPreview ? "py-3" : "py-10 md:py-14 lg:py-16"}`}
          data-testid={`${testIdPrefix}-hero`}
        >
          <div
            className={`grid items-center ${
              isPreview ? "gap-4" : "gap-8 md:grid-cols-2 md:gap-12 lg:gap-16"
            }`}
            data-testid={`${testIdPrefix}-hero-content`}
          >
            <div className={`min-w-0 ${isPreview ? "space-y-2.5" : "space-y-5 md:space-y-6"}`}>
              <CleanSectionEyebrow
                color={theme.accentColor}
                variant={isPreview ? "preview" : "full"}
                testId={`${testIdPrefix}-hero-badge`}
              >
                {heroBadgeText}
              </CleanSectionEyebrow>

              <h1
                className={`whitespace-normal font-black leading-[1.05] ${
                  isPreview ? "text-xl" : "text-4xl md:text-5xl lg:text-6xl"
                } ${clinicHeading(isDark)}`}
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
                className={`flex flex-wrap ${isPreview ? "gap-2" : "gap-3"}`}
                data-testid={`${testIdPrefix}-hero-cta-group`}
              >
                {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                  ? renderCtaButton({
                      previewButtons,
                      label: primaryCtaLabel,
                      href: primaryBookingHref,
                      className: `${presentation.primaryButtonClass} ${isPreview ? "" : "px-8"}`,
                      style: { backgroundColor: clinicCoralBg(theme) },
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
                        borderColor: clinicCoralBg(theme),
                        color: clinicCoralBg(theme),
                        backgroundColor: "transparent",
                      },
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

            <div className={`relative mx-auto w-full ${isPreview ? "max-w-[140px]" : "max-w-md lg:max-w-lg"}`}>
              {heroImage ? (
                <div
                  className={`overflow-hidden shadow-2xl ${
                    isPreview ? "rounded-full" : "rounded-full md:rounded-[3rem]"
                  }`}
                >
                  <MiniSiteSlotImage
                    media={heroImage}
                    testId={
                      templateImages?.heroImage
                        ? `${testIdPrefix}-template-heroImage`
                        : `${testIdPrefix}-template-doctorOrClinicImage`
                    }
                    className={`aspect-square w-full object-cover ${isPreview ? "max-h-36" : "max-h-[420px]"}`}
                  />
                </div>
              ) : (
                <div
                  className={`flex aspect-square items-center justify-center rounded-full font-black text-white shadow-xl ${
                    isPreview ? "h-28 w-28 text-2xl" : "h-64 w-64 text-5xl md:h-80 md:w-80"
                  }`}
                  style={{ backgroundColor: `${clinicCoralBg(theme)}cc` }}
                  data-testid={`${testIdPrefix}-logo-placeholder`}
                  aria-hidden
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}

              {trustStat ? (
                <div
                  className={`absolute rounded-2xl bg-white px-3 py-2 text-center shadow-lg ${
                    isPreview ? "bottom-1 right-0 text-[9px]" : "bottom-4 right-2 px-4 py-3 md:-right-4"
                  } ${isDark ? "bg-slate-900 ring-1 ring-slate-700" : ""}`}
                >
                  <p className="font-bold" style={{ color: clinicCoralBg(theme) }}>
                    {trustStat.title}
                  </p>
                  <p className={`${isPreview ? "text-[8px]" : "text-[10px]"} ${muted}`}>{trustStat.subtitle}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`mt-6 grid grid-cols-1 gap-3 ${isPreview ? "mt-3 gap-2" : "md:grid-cols-3 md:gap-5 lg:mt-8"}`}
          data-testid={`${testIdPrefix}-clinic-info-strip`}
        >
          {valueCards.map((card) => (
            <div
              key={card.key}
              className={`rounded-2xl bg-white px-4 py-4 shadow-md ring-1 ring-slate-100 ${
                isPreview ? "py-3" : "px-5 py-5 md:py-6"
              } ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}
            >
              <p
                className={`font-semibold uppercase tracking-wider ${isPreview ? "text-[9px]" : "text-[10px] md:text-xs"}`}
                style={{ color: clinicCoralBg(theme) }}
              >
                {card.label}
              </p>
              <p className={`mt-1 whitespace-normal font-bold ${isPreview ? "text-xs" : "text-base md:text-lg"} ${clinicHeading(isDark)}`}>
                {card.title}
              </p>
              {card.detail ? (
                <p className={`mt-0.5 ${isPreview ? "text-[10px]" : "text-xs"} ${muted}`}>{card.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CleanSectionEyebrow({
  children,
  color,
  variant,
  testId,
}: {
  children: ReactNode;
  color: string;
  variant: ClinicSectionVariant;
  testId?: string;
}) {
  return (
    <p
      className={`font-semibold uppercase tracking-[0.2em] ${
        variant === "preview" ? "text-[9px]" : "text-[10px] md:text-xs"
      }`}
      style={{ color }}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

/* ─── 2. ABOUT → doctor trust quote + card ─── */
export type ClinicAboutSectionProps = ClinicSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ClinicTheme;
  isDark: boolean;
  businessName: string;
  copy: MiniSiteCopy;
  introVideo?: MiniSiteVideoMedia | null;
  templateImages?: MiniSiteTemplateImages;
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
  introVideo = null,
  templateImages,
}: ClinicAboutSectionProps) {
  const muted = clinicMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";
  const doctorImage = templateImages?.doctorOrClinicImage ?? null;
  const quoteText = content ?? copy.benefitsItems.find(Boolean) ?? copy.trustCards[0]?.subtitle ?? null;

  if (!quoteText && !introVideo && !doctorImage) {
    return null;
  }

  return (
    <section
      className={`${clinicContainerClass(isPreview)} bg-white ${isDark ? "bg-slate-950" : ""} ${
        isPreview ? "py-4" : "py-12 lg:py-16"
      }`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div className={`grid items-center ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-12"}`}>
        <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-4"}`}>
          <span className={`font-serif leading-none ${isPreview ? "text-4xl" : "text-6xl md:text-7xl"}`} style={{ color: `${clinicCoralBg(theme)}40` }} aria-hidden>
            "
          </span>
          {quoteText ? (
            <p
              className={`whitespace-normal font-medium leading-relaxed ${
                isPreview ? "text-xs" : "text-lg md:text-xl lg:text-2xl"
              } ${clinicHeading(isDark)}`}
              data-testid={`${testIdPrefix}-about-body`}
            >
              {quoteText}
            </p>
          ) : null}
          <p
            className={`font-semibold uppercase tracking-wider ${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}
            data-testid={`${testIdPrefix}-about-title`}
          >
            {title}
          </p>
        </div>

        <div
          className={`overflow-hidden rounded-2xl bg-slate-50 shadow-lg ${
            isPreview ? "p-3" : "p-5 md:p-6"
          } ${isDark ? "bg-slate-900/80" : ""}`}
        >
          {doctorImage ? (
            <div className={`overflow-hidden rounded-xl ${isPreview ? "mb-2" : "mb-4"}`}>
              <MiniSiteSlotImage
                media={doctorImage}
                testId={`${testIdPrefix}-template-doctorOrClinicImage`}
                className={`w-full object-cover ${isPreview ? "h-28" : "h-48 md:h-56"}`}
              />
            </div>
          ) : null}
          <p className={`font-bold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${clinicHeading(isDark)}`}>
            {businessName}
          </p>
          <p className={`mt-0.5 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Care team</p>
        </div>
      </div>

      {introVideo ? (
        <ClinicIntroVideoCard
          media={introVideo}
          variant={variant}
          testId={`${testIdPrefix}-template-introVideo`}
          isDark={isDark}
          primaryColor={clinicCoralBg(theme)}
        />
      ) : null}
    </section>
  );
}

/* ─── 3. SERVICES: coral band + treatment cards ─── */
export type ClinicServicesSectionProps = ClinicSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: ClinicTheme;
  isDark: boolean;
  primaryCtaLabel: string;
  copy: MiniSiteCopy;
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
  copy,
  templateImages,
}: ClinicServicesSectionProps) {
  const muted = clinicMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Our Services";
  const servicesImage = templateImages?.servicesImage ?? null;
  const features = buildServiceFeatures(services, copy);
  const treatmentServices = services?.slice(0, 3) ?? [];
  const coral = clinicCoralBg(theme);

  return (
    <section
      className={isPreview ? "py-4" : "py-0"}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div
        className={`text-white ${isPreview ? "py-6" : "py-12 md:py-16 lg:py-20"}`}
        style={{ backgroundColor: coral }}
      >
        <div className={clinicContainerClass(isPreview)}>
          <div className={`text-center ${isPreview ? "mb-4" : "mb-10 md:mb-12"}`}>
            {badgeText ? (
              <p
                className={`font-semibold uppercase tracking-[0.2em] text-white/80 ${isPreview ? "text-[9px]" : "text-xs"}`}
                data-testid={`${testIdPrefix}-services-badge`}
              >
                {badgeText}
              </p>
            ) : null}
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-2 whitespace-normal font-black ${isPreview ? "text-lg" : "text-3xl md:text-4xl lg:text-5xl"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mx-auto mt-3 max-w-2xl whitespace-normal text-white/85 ${isPreview ? "text-[11px]" : "text-base md:text-lg"}`}>
              Expert-led treatments and appointments with our clinical care team.
            </p>
          </div>

          {features.length > 0 ? (
            <div className={`grid grid-cols-2 ${isPreview ? "gap-3" : "gap-6 md:grid-cols-4 md:gap-8"}`}>
              {features.map((feature) => (
                <div key={feature.key} className={`text-center ${isPreview ? "space-y-1.5" : "space-y-3"}`}>
                  <div
                    className={`mx-auto flex items-center justify-center rounded-full border-2 border-white/70 ${
                      isPreview ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl md:h-20 md:w-20"
                    }`}
                    aria-hidden
                  >
                    ✚
                  </div>
                  <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-sm md:text-base"}`}>
                    {feature.title}
                  </p>
                  <p className={`text-white/80 ${isPreview ? "text-[9px] leading-snug" : "text-xs md:text-sm"}`}>{feature.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}>
        <div className={`text-center ${isPreview ? "mb-4" : "mb-10"}`}>
          <h3 className={`whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-4xl"} ${clinicHeading(isDark)}`}>
            Quality and modern care
          </h3>
          <p className={`mx-auto mt-2 max-w-xl ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            Treatments tailored to your health goals.
          </p>
        </div>

        <div
          className={`grid gap-5 ${isPreview ? "" : "md:grid-cols-3 md:gap-8"}`}
          data-testid={`${testIdPrefix}-clinic-specialties`}
        >
          {treatmentServices.length > 0
            ? treatmentServices.map((service, index) => (
                <ClinicTreatmentCard
                  key={service.id}
                  slug={publicSlug}
                  service={service}
                  theme={theme}
                  isDark={isDark}
                  variant={variant}
                  primaryCtaLabel={primaryCtaLabel}
                  showcaseImage={index === 0 ? servicesImage : null}
                  imageTestId={index === 0 && servicesImage ? `${testIdPrefix}-template-servicesImage` : undefined}
                />
              ))
            : isPreview
              ? (
                  <ClinicTreatmentCard
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
                )
              : (
                  <p className={`text-base ${muted}`}>
                    Services will appear here.{" "}
                    <Link to={`/b/${publicSlug}/services`} className="font-semibold hover:underline" style={{ color: coral }}>
                      View services
                    </Link>
                  </p>
                )}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. TRUST: new patients welcome + stats/benefits ─── */
export type ClinicTrustSectionProps = ClinicSectionShell & {
  copy: MiniSiteCopy;
  theme: ClinicTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
  primaryCtaLabel?: string;
  primaryBookingHref?: string;
  showBookingCta?: boolean;
  templateImages?: MiniSiteTemplateImages;
};

export function ClinicTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
  primaryCtaLabel = "",
  primaryBookingHref = "",
  showBookingCta = false,
  templateImages,
}: ClinicTrustSectionProps) {
  const muted = clinicMutedText(isDark);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);
  const isPreview = variant === "preview";
  const appointmentImage = templateImages?.appointmentImage ?? templateImages?.doctorOrClinicImage ?? null;
  const welcomeBody =
    copy.benefitsItems.find(Boolean) ??
    copy.trustCards[0]?.subtitle ??
    "Our care team welcomes new patients with a calm, professional first visit.";
  const coral = clinicCoralBg(theme);
  const showNewPatients = hasMeaningfulText(welcomeBody) || appointmentImage != null;

  if (!showTrustStats && !hasBenefits && !showNewPatients) {
    return null;
  }

  return (
    <section
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      {showNewPatients ? (
        <div
          className={`mb-8 grid items-center bg-white ${isDark ? "bg-slate-950" : ""} ${
            isPreview ? "mb-4 gap-4" : "mb-12 gap-8 lg:grid-cols-2 lg:gap-12"
          }`}
        >
          {appointmentImage ? (
            <div className={`overflow-hidden ${isPreview ? "rounded-xl" : "rounded-[2rem] md:rounded-[3rem]"}`}>
              <MiniSiteSlotImage
                media={appointmentImage}
                testId={`${testIdPrefix}-template-appointmentImage`}
                className={`w-full object-cover ${isPreview ? "h-32" : "h-64 md:h-80 lg:h-96"}`}
              />
            </div>
          ) : null}

          <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-5"}`}>
            <h2 className={`whitespace-normal font-black ${isPreview ? "text-base" : "text-3xl md:text-4xl"} ${clinicHeading(isDark)}`}>
              New Patients Welcome
            </h2>
            <p className={`whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>{welcomeBody}</p>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
                  label: primaryCtaLabel,
                  href: primaryBookingHref,
                  className: `${isPreview ? "px-4 py-2 text-xs" : "px-8 py-3 text-sm"} inline-flex items-center justify-center rounded-full font-bold text-white transition hover:brightness-105`,
                  style: { backgroundColor: coral },
                  testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                })
              : null}
          </div>
        </div>
      ) : null}

      <div data-testid={`${testIdPrefix}-clinic-care`} className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-10"}`}>
        {hasBenefits ? (
          <div
            className={`flex flex-col rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 ${
              isPreview ? "p-4" : "min-h-[18rem] p-8 lg:p-10"
            } ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            <p className={`font-semibold uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Patient care
            </p>
            <h3 className={`mt-2 font-bold ${isPreview ? "text-sm" : "text-2xl md:text-3xl"} ${clinicHeading(isDark)}`}>What to expect</h3>
            <ol className={`mt-4 flex-1 space-y-4 ${isPreview ? "space-y-2" : "lg:space-y-5"}`}>
              {copy.benefitsItems.filter(Boolean).map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className={`shrink-0 font-bold tabular-nums ${isPreview ? "text-lg" : "text-2xl"}`} style={{ color: `${coral}55` }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className={`min-w-0 whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${clinicHeading(isDark)}`}>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div />
        )}

        {showTrustStats ? (
          <div
            className={`flex flex-col rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 ${
              isPreview ? "p-4" : "min-h-[18rem] p-8 lg:p-10"
            } ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-semibold uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Why patients choose us
            </p>
            <div className={`mt-4 flex flex-1 flex-col justify-center space-y-5 ${isPreview ? "space-y-3" : "lg:space-y-6"}`}>
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className={`border-b pb-4 last:border-0 last:pb-0 ${isDark ? "border-slate-700/60" : "border-slate-200/80"}`}>
                  <p className={`font-bold ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`} style={{ color: coral }}>
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>{stat.subtitle}</p>
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
  const coral = clinicCoralBg(theme);

  return (
    <section
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-10 lg:py-12"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 ${isPreview ? "p-4" : "p-8 lg:p-10"} ${isDark ? "bg-slate-900/80 ring-slate-700/50" : ""}`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-bold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${clinicHeading(isDark)}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <p className={`mt-1 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Common patient questions</p>
        <dl className={`mt-4 divide-y ${isDark ? "divide-slate-700/60" : "divide-slate-200/80"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-l-4 py-3 pl-4 ${isPreview ? "py-2 pl-3" : "lg:py-4 lg:pl-5"}`}
                style={{ borderLeftColor: coral }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-base md:text-lg"} ${clinicHeading(isDark)}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  {item.question}
                </dt>
                <dd
                  className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}
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
  templateImages?: MiniSiteTemplateImages;
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
  templateImages,
}: ClinicContactSectionProps) {
  const muted = clinicMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";
  const contactImage = templateImages?.appointmentImage ?? templateImages?.heroImage ?? null;
  const coral = clinicCoralBg(theme);

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  const contactCards: { key: string; label: string; value: string; detail: string }[] = [];
  if (hasPhone) {
    contactCards.push({ key: "phone", label: "Call us", value: contactPhone.trim(), detail: "Schedule by phone" });
  }
  if (hasAddress) {
    contactCards.push({ key: "address", label: "Location", value: contactAddress.trim(), detail: "Visit our clinic" });
  }
  if (entries.length > 0) {
    contactCards.push({
      key: "social",
      label: "Connect",
      value: entries.map((e) => e.label).join(" · "),
      detail: entries[0]?.value ?? "",
    });
  }

  return (
    <section
      className={`${clinicContainerClass(isPreview)} ${isPreview ? "py-4" : "py-12 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div className={`grid items-start ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-12"}`}>
        {contactImage ? (
          <div className={`overflow-hidden ${isPreview ? "rounded-full" : "rounded-full md:rounded-[3rem]"}`}>
            <MiniSiteSlotImage
              media={contactImage}
              testId={
                templateImages?.appointmentImage
                  ? `${testIdPrefix}-template-appointmentImage`
                  : `${testIdPrefix}-template-heroImage`
              }
              className={`aspect-square w-full object-cover ${isPreview ? "max-h-32" : "max-h-80"}`}
            />
          </div>
        ) : null}

        <div className={`min-w-0 ${isPreview ? "space-y-3" : "space-y-5"}`}>
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-3xl"} ${clinicHeading(isDark)}`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {title}
          </h2>
          <p className={`${isPreview ? "text-xs" : "text-base"} ${muted}`}>Appointment details and clinic location</p>

          {hasPhone ? (
            <a href={`tel:${contactPhone}`} className="block font-bold hover:underline" style={{ color: coral }}>
              {contactPhone}
            </a>
          ) : null}
          {hasAddress ? (
            <p className={`whitespace-normal font-medium ${isPreview ? "text-sm" : "text-lg"} ${clinicHeading(isDark)}`}>{contactAddress}</p>
          ) : null}

          {entries.length > 0 ? (
            <div className={`flex flex-wrap gap-3 ${isPreview ? "text-[10px]" : "text-sm"}`} data-testid={`${testIdPrefix}-social-links`}>
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

      {contactCards.length > 0 ? (
        <div className={`mt-6 grid grid-cols-1 gap-3 ${isPreview ? "mt-4" : "mt-8 md:grid-cols-3 md:gap-5"}`}>
          {contactCards.map((card) => (
            <div
              key={card.key}
              className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-white ${isPreview ? "px-3 py-3" : "px-5 py-5"}`}
              style={{ backgroundColor: coral }}
            >
              <span className={`shrink-0 rounded-full border border-white/60 ${isPreview ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"} flex items-center justify-center`} aria-hidden>
                {card.key === "phone" ? "☎" : card.key === "address" ? "◎" : "✉"}
              </span>
              <div className="min-w-0">
                <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"}`}>{card.label}</p>
                <p className={`mt-0.5 whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"}`}>{card.value}</p>
                <p className={`mt-0.5 text-white/80 ${isPreview ? "text-[9px]" : "text-xs"}`}>{card.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
}: ClinicBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;
  const coral = clinicCoralBg(theme);

  return (
    <section className={isPreview ? "py-4" : "py-0"} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`text-center text-white ${isPreview ? "px-4 py-8" : "px-6 py-14 md:py-20"}`}
        style={{ backgroundColor: coral }}
        data-testid={`${testIdPrefix}-booking-cta-panel`}
      >
        <div className={clinicContainerClass(isPreview)}>
          <p
            className={`whitespace-normal font-black leading-tight ${isPreview ? "text-base" : "text-3xl md:text-4xl lg:text-5xl"}`}
            data-testid={`${testIdPrefix}-booking-cta-heading`}
          >
            Schedule your visit
          </p>
          <p className={`mx-auto mt-4 max-w-2xl whitespace-normal text-white/90 ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
            Ready to book an appointment? Our care team will help you take the next step.
          </p>
          <div className={`mt-6 flex flex-wrap items-center justify-center gap-3 ${isPreview ? "mt-4" : "mt-8"}`}>
            {renderCtaButton({
              previewButtons,
              label: primaryLabel,
              href: primaryHref,
              className: `${presentation.primaryButtonClass} border-2 border-white bg-transparent text-white hover:bg-white/10 ${isPreview ? "" : "px-10"}`,
              style: { borderColor: "white", color: "white", backgroundColor: "transparent" },
              testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
            })}
            {showSecondaryCta
              ? renderCtaButton({
                  previewButtons,
                  label: secondaryLabel!,
                  href: secondaryHref!,
                  className: presentation.secondaryButtonClass,
                  style: { borderColor: "white", color: "white", backgroundColor: "transparent" },
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
      <h2 id={`${testIdPrefix}-gallery-heading`} className={`font-semibold ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${clinicHeading(isDark)}`}>
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-lg whitespace-normal ${isPreview ? "text-xs" : "text-base"} ${muted}`}>
        Photo gallery coming soon. Showcase your clinic here.
      </p>
    </section>
  );
}
