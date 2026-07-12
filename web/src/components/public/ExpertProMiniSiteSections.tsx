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
import type { MiniSiteTemplateImages } from "@/lib/miniSiteMedia";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { ServiceCardImageArea } from "@/components/ServiceImageDisplay";
import { normalizeServiceImageMedia } from "@/lib/serviceImage";
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

export type ExpertSectionVariant = "full" | "preview";

type ExpertSectionShell = {
  variant?: ExpertSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type ExpertTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

const EXPERT_CONTAINER = "mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8";

function expertContainerClass(isPreview: boolean): string {
  return isPreview ? "mx-auto w-full max-w-none px-3" : EXPERT_CONTAINER;
}

function expertMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function expertAccent(theme: ExpertTheme): string {
  return theme.primaryColor;
}

function buttonRadiusClass(buttonStyle: MiniSiteButtonStyle): string {
  switch (buttonStyle) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-lg";
  }
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book a focused session and get clear, personal guidance tailored to your goals.";
    case "orders_only":
      return "Request a consultation or advisory session — thoughtful expertise when you need direction.";
    default:
      return "Work one-on-one with an expert — book a session or send a request to get started.";
  }
}

const DEFAULT_EXPERTISE_LABELS = ["Advisory", "Strategy", "Expertise", "Support"];
const DEFAULT_PROCESS_LABELS = ["Quality", "Strategy", "Planning"];

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

type ExpertiseItem = { key: string; label: string };

function buildExpertiseItems(services: PublicService[] | undefined, copy: MiniSiteCopy): ExpertiseItem[] {
  if (services && services.length > 0) {
    return services.slice(0, 4).map((s) => ({ key: s.id, label: s.name }));
  }
  const benefits = copy.benefitsItems.filter(Boolean).slice(0, 4);
  if (benefits.length > 0) {
    return benefits.map((label, i) => ({ key: `benefit-${i}`, label }));
  }
  const trust = copy.trustCards.slice(0, 4);
  if (trust.length > 0) {
    return trust.map((card, i) => ({ key: `trust-${i}`, label: card.title }));
  }
  return DEFAULT_EXPERTISE_LABELS.map((label, i) => ({ key: `default-${i}`, label }));
}

type ProcessItem = { key: string; label: string; detail: string };

function buildProcessItems(copy: MiniSiteCopy): ProcessItem[] {
  const benefits = copy.benefitsItems.filter(Boolean).slice(0, 3);
  if (benefits.length >= 3) {
    return benefits.map((label, i) => ({
      key: `benefit-${i}`,
      label,
      detail: copy.trustCards[i]?.subtitle ?? "Focused expert guidance for your goals.",
    }));
  }
  return DEFAULT_PROCESS_LABELS.map((label, i) => ({
    key: `process-${i}`,
    label,
    detail: copy.benefitsItems[i] ?? copy.trustCards[i]?.subtitle ?? "Practical business solutions.",
  }));
}

function ExpertIntroVideoCard({
  media,
  variant,
  testId,
  accent,
}: {
  media: MiniSiteVideoMedia;
  variant: ExpertSectionVariant;
  testId: string;
  accent: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPreview = variant === "preview";

  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) {
    return null;
  }

  return (
    <div className={isPreview ? "mt-3" : "mt-6"}>
      {isPlaying ? (
        <div className="max-w-md">
          <p className={`mb-2 font-semibold uppercase tracking-wider ${isPreview ? "text-[10px]" : "text-xs"} ${expertMutedText(false)}`}>
            Expert introduction
          </p>
          <MiniSiteVideoEmbed media={media} variant={variant} testId={testId} className="overflow-hidden rounded-lg" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className={`inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg ${
            isPreview ? "text-[10px]" : "text-xs"
          }`}
          data-testid={testId}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px]"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            ▶
          </span>
          <span className="font-semibold text-slate-900">Watch expert intro</span>
        </button>
      )}
    </div>
  );
}

function ExpertOfferCard({
  slug,
  service,
  theme,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  theme: ExpertTheme;
  isDark: boolean;
  variant: ExpertSectionVariant;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 70 : 130)
      ? `${service.description.slice(0, variant === "preview" ? 70 : 130).trim()}…`
      : service.description
    : null;
  const muted = expertMutedText(isDark);
  const radius = buttonRadiusClass(theme.buttonStyle);
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);
  const hasPerServiceImage = Boolean(normalizeServiceImageMedia(service.image));

  return (
    <article
      className={`flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm ${
        isPreview ? "rounded-lg" : "rounded-xl"
      } ${isDark ? "border-slate-700 bg-slate-900/50" : ""}`}
      data-testid="service-card"
    >
      {hasPerServiceImage ? (
        <ServiceCardImageArea
          image={service.image}
          alt={service.name}
          aspectClassName={isPreview ? "aspect-[16/10]" : "aspect-[16/10]"}
        />
      ) : null}
      <div className={isPreview ? "p-3" : "p-5 md:p-6"}>
        <p
          className={`font-semibold uppercase tracking-[0.14em] ${isPreview ? "text-[9px]" : "text-[11px]"}`}
          style={{ color: theme.accentColor }}
        >
          {service.type === "booking" ? "Session" : "Consultation"}
        </p>
        <h3 className={`mt-1 whitespace-normal font-bold ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>{descriptionPreview}</p>
        ) : null}
        <div className={`mt-3 flex flex-wrap items-center gap-3 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
          <PriceLabel service={service} />
          {duration ? <span>{duration}</span> : null}
        </div>
      </div>
      <div className={`mt-auto border-t ${isDark ? "border-slate-700" : "border-slate-200"} ${isPreview ? "p-3 pt-2" : "p-5 pt-4"}`}>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`block w-full border-2 px-4 py-2.5 text-center font-bold text-white transition hover:brightness-105 ${radius} ${
            isPreview ? "text-[11px]" : "text-sm"
          }`}
          style={{ backgroundColor: accent, borderColor: accent }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

/* ─── 1. HERO + expertise cards ─── */
export type ExpertHeroSectionProps = ExpertSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: ExpertTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  operatingMode: OperatingMode;
  showHeroCredibility: boolean;
  services?: PublicService[] | undefined;
  templateImages?: MiniSiteTemplateImages;
};

export function ExpertHeroSection({
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
  showHeroCredibility,
  services,
  templateImages,
}: ExpertHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const profileImage = templateImages?.profileImage ?? templateImages?.heroImage ?? null;
  const accent = expertAccent(theme);
  const eyebrow = hasMeaningfulText(heroBadgeText) ? heroBadgeText : "We are experts";
  const expertiseItems = buildExpertiseItems(services, copy);
  const radius = buttonRadiusClass(theme.buttonStyle);

  return (
    <header
      className={`${isDark ? "bg-slate-900" : "bg-slate-100"} ${isPreview ? "pb-4 pt-2" : "pb-10 pt-6 md:pb-14 md:pt-10"}`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div className={expertContainerClass(isPreview)}>
        <div
          className={`grid items-center text-center md:text-left ${
            isPreview ? "gap-4" : "gap-8 md:grid-cols-2 md:gap-12"
          }`}
          data-testid={`${testIdPrefix}-hero-content`}
        >
          <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-4 md:space-y-5"}`}>
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <span className="h-1 w-8 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
              <p
                className={`font-semibold uppercase tracking-[0.2em] ${isPreview ? "text-[9px]" : "text-[10px] md:text-xs"} ${muted}`}
                data-testid={`${testIdPrefix}-hero-badge`}
              >
                {eyebrow}
              </p>
            </div>

            <h1
              className={`whitespace-normal font-black leading-[1.05] ${isPreview ? "text-xl" : "text-4xl md:text-5xl lg:text-6xl"}`}
              style={{ color: accent }}
              data-testid={`${testIdPrefix}-hero-title`}
            >
              {heroTitle}
            </h1>

            {heroSubtitle ? (
              <p
                className={`max-w-xl whitespace-normal font-medium ${isPreview ? "text-xs" : "text-base md:text-lg"} ${isDark ? "text-slate-200" : "text-slate-800"}`}
                data-testid={`${testIdPrefix}-hero-subtitle`}
              >
                {heroSubtitle}
              </p>
            ) : (
              <p className={`max-w-xl whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>{heroIntro(operatingMode)}</p>
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
              className={`flex flex-col sm:flex-row sm:flex-wrap sm:justify-center md:justify-start ${isPreview ? "gap-2 pt-1" : "gap-3 pt-2"}`}
              data-testid={`${testIdPrefix}-hero-cta-group`}
            >
              {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                ? renderCtaButton({
                    previewButtons,
                    label: primaryCtaLabel,
                    href: primaryBookingHref,
                    className: `${presentation.primaryButtonClass} ${radius} ${isPreview ? "" : "px-8"}`,
                    style: { backgroundColor: accent },
                    testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-book-cta`,
                  })
                : null}
              {showRequestCta && hasMeaningfulText(secondaryCtaLabel)
                ? renderCtaButton({
                    previewButtons,
                    label: secondaryCtaLabel,
                    href: secondaryOrderHref,
                    className: `${presentation.secondaryButtonClass} ${radius}`,
                    style: { borderColor: accent, color: accent, backgroundColor: "transparent" },
                    testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                  })
                : null}
            </div>

            {business.logo_url && !profileImage ? (
              <div className="sr-only" data-testid={`${testIdPrefix}-logo-placeholder`} aria-hidden>
                {monogram}
              </div>
            ) : null}
          </div>

          <div className={`relative mx-auto w-full ${isPreview ? "max-w-[10rem]" : "max-w-sm md:max-w-md"}`}>
            {profileImage ? (
              <MiniSiteSlotImage
                media={profileImage}
                testId={
                  templateImages?.profileImage
                    ? `${testIdPrefix}-template-profileImage`
                    : `${testIdPrefix}-template-heroImage`
                }
                className={`w-full object-cover shadow-lg ${isPreview ? "aspect-[3/4] rounded-lg" : "aspect-[4/5] rounded-xl md:rounded-2xl"}`}
              />
            ) : business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className={`mx-auto object-cover ${isPreview ? "h-24 w-24 rounded-lg" : "h-48 w-48 rounded-xl md:h-64 md:w-64 md:rounded-2xl"}`}
              />
            ) : (
              <div
                className={`mx-auto flex items-center justify-center font-black text-white shadow-lg ${
                  isPreview ? "h-24 w-24 rounded-lg text-2xl" : "h-48 w-48 rounded-xl text-5xl md:h-64 md:w-64 md:rounded-2xl"
                }`}
                style={{ backgroundColor: accent }}
                data-testid={`${testIdPrefix}-logo-placeholder`}
                aria-hidden
              >
                {monogram}
              </div>
            )}

            <div
              className={`absolute border border-slate-200 bg-white shadow-md ${
                isPreview ? "-bottom-2 -left-1 rounded-lg px-2 py-1.5" : "-bottom-3 -left-2 rounded-xl px-4 py-3 md:-left-4"
              } ${isDark ? "border-slate-700 bg-slate-900" : ""}`}
            >
              <p className={`font-bold ${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>{business.name}</p>
              <p className={`${isPreview ? "text-[9px]" : "text-xs"} ${muted}`}>Business consultant</p>
              {showHeroCredibility ? (
                <div
                  className={`mt-2 grid grid-cols-3 gap-1 border-t pt-2 ${isDark ? "border-slate-700" : "border-slate-200"}`}
                  data-testid={`${testIdPrefix}-hero-trust-row`}
                >
                  {copy.trustCards.map((stat) => (
                    <div key={stat.subtitle} className="min-w-0 text-center">
                      <p className={`font-bold ${isPreview ? "text-[9px]" : "text-xs"}`} style={{ color: accent }}>
                        {stat.title}
                      </p>
                      <p className={`${isPreview ? "text-[8px]" : "text-[10px]"} ${muted}`}>{stat.subtitle}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`mt-6 grid grid-cols-2 md:grid-cols-4 ${isPreview ? "mt-4 gap-2" : "mt-10 gap-4 md:gap-5"}`}
          data-testid={`${testIdPrefix}-expertise-cards`}
        >
          {expertiseItems.map((item) => (
            <div
              key={item.key}
              className={`border border-slate-200 bg-white text-center shadow-sm ${
                isPreview ? "rounded-lg px-2 py-3" : "rounded-xl px-4 py-5 md:py-6"
              } ${isDark ? "border-slate-700 bg-slate-900/80" : ""}`}
            >
              <div
                className={`mx-auto flex items-center justify-center rounded-full border-2 ${
                  isPreview ? "mb-1.5 h-8 w-8 text-xs" : "mb-3 h-12 w-12 text-sm"
                }`}
                style={{ borderColor: `${accent}44`, color: accent }}
                aria-hidden
              >
                ✦
              </div>
              <p className={`font-bold ${isPreview ? "text-[10px]" : "text-sm md:text-base"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ─── 2. ABOUT → authority band + intro video ─── */
export type ExpertAboutSectionProps = ExpertSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ExpertTheme;
  isDark: boolean;
  introVideo?: MiniSiteVideoMedia | null;
  primaryCtaLabel?: string;
  primaryBookingHref?: string;
  showBookingCta?: boolean;
};

export function ExpertAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  title,
  body,
  fallbackBody,
  theme,
  isDark,
  introVideo = null,
  primaryCtaLabel = "",
  primaryBookingHref = "",
  showBookingCta = false,
}: ExpertAboutSectionProps) {
  const content = body || fallbackBody;
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);
  const authorityStatement = title || "Deep knowledge";
  const authorityBody =
    content ??
    "Years of experience and market insight — practical guidance you can act on.";

  return (
    <>
      <section
        className={`text-white ${isPreview ? "py-6" : "py-12 md:py-16"}`}
        style={{ backgroundColor: accent }}
        data-testid={`${testIdPrefix}-about`}
      >
        <div className={expertContainerClass(isPreview)}>
          <div className={`grid items-center ${isPreview ? "gap-4" : "gap-8 md:grid-cols-2 md:gap-12"}`}>
            <div className="min-w-0">
              <p className={`font-semibold uppercase tracking-[0.2em] text-white/80 ${isPreview ? "text-[9px]" : "text-xs"}`}>
                Solutions for your business
              </p>
              <h2
                className={`mt-2 whitespace-normal font-black leading-tight ${isPreview ? "text-base" : "text-2xl md:text-4xl"}`}
                data-testid={`${testIdPrefix}-about-title`}
              >
                {authorityStatement}
              </h2>
            </div>
            <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-4"}`}>
              <p
                className={`whitespace-normal leading-relaxed text-white/90 ${isPreview ? "text-xs" : "text-sm md:text-base"}`}
                data-testid={`${testIdPrefix}-about-body`}
              >
                {authorityBody}
              </p>
              {showBookingCta && hasMeaningfulText(primaryCtaLabel)
                ? renderCtaButton({
                    previewButtons,
                    label: primaryCtaLabel,
                    href: primaryBookingHref,
                    className: `inline-flex items-center justify-center border-2 border-white bg-transparent font-bold text-white transition hover:bg-white/10 ${buttonRadiusClass(theme.buttonStyle)} ${
                      isPreview ? "px-4 py-2 text-xs" : "px-6 py-3 text-sm"
                    }`,
                    style: { borderColor: "white", color: "white", backgroundColor: "transparent" },
                    testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-expert-authority-cta`,
                  })
                : null}
            </div>
          </div>
        </div>
      </section>

      {introVideo ? (
        <div className={`${expertContainerClass(isPreview)} ${isPreview ? "py-3" : "py-6"} ${isDark ? "" : "bg-white"}`}>
          <ExpertIntroVideoCard
            media={introVideo}
            variant={variant}
            testId={`${testIdPrefix}-template-introVideo`}
            accent={accent}
          />
        </div>
      ) : null}
    </>
  );
}

/* ─── 3. SERVICES → split + process cards + grid ─── */
export type ExpertServicesSectionProps = ExpertSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: ExpertTheme;
  isDark: boolean;
  copy: MiniSiteCopy;
  bodyText?: string | null;
  templateImages?: MiniSiteTemplateImages;
  primaryCtaLabel?: string;
  primaryBookingHref?: string;
  showBookingCta?: boolean;
};

export function ExpertServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  previewButtons = false,
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
  copy,
  bodyText,
  templateImages,
  primaryCtaLabel = "",
  primaryBookingHref = "",
  showBookingCta = false,
}: ExpertServicesSectionProps) {
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);
  const sectionTitle = title || "Our Services";
  const servicesImage = templateImages?.servicesImage ?? templateImages?.heroImage ?? null;
  const splitBody = bodyText ?? "Sessions and consultations designed for focused, personal business guidance.";
  const processItems = buildProcessItems(copy);

  return (
    <section
      className={`${isDark ? "bg-slate-900" : "bg-blue-50/60"} ${isPreview ? "py-4" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={expertContainerClass(isPreview)}>
        <div className={`grid items-center ${isPreview ? "gap-4" : "gap-8 md:grid-cols-2 md:gap-10"}`}>
          <div
            className={`border border-slate-200 bg-white shadow-sm ${isPreview ? "rounded-lg p-4" : "rounded-xl p-6 md:p-8"} ${
              isDark ? "border-slate-700 bg-slate-900/80" : ""
            }`}
          >
            {badgeText ? (
              <p
                className={`font-semibold uppercase tracking-[0.16em] ${isPreview ? "text-[9px]" : "text-xs"}`}
                style={{ color: theme.accentColor }}
                data-testid={`${testIdPrefix}-services-badge`}
              >
                {badgeText}
              </p>
            ) : null}
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-2 whitespace-normal font-black ${isPreview ? "text-sm" : "text-2xl md:text-3xl"} ${
                isDark ? "text-slate-100" : "text-slate-950"
              }`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-3 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>{splitBody}</p>
            {showBookingCta && hasMeaningfulText(primaryCtaLabel)
              ? renderCtaButton({
                  previewButtons,
                  label: primaryCtaLabel,
                  href: primaryBookingHref,
                  className: `mt-4 inline-flex items-center justify-center font-bold text-white transition hover:brightness-105 ${buttonRadiusClass(theme.buttonStyle)} ${
                    isPreview ? "px-4 py-2 text-xs" : "px-6 py-3 text-sm"
                  }`,
                  style: { backgroundColor: accent },
                  testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-expert-services-cta`,
                })
              : null}
          </div>

          {servicesImage ? (
            <div className={`overflow-hidden shadow-md ${isPreview ? "rounded-lg" : "rounded-xl"}`}>
              <MiniSiteSlotImage
                media={servicesImage}
                testId={
                  templateImages?.servicesImage
                    ? `${testIdPrefix}-template-servicesImage`
                    : `${testIdPrefix}-template-heroImage`
                }
                className={`w-full object-cover ${isPreview ? "aspect-[4/3]" : "aspect-[4/3] md:aspect-[5/4]"}`}
              />
            </div>
          ) : null}
        </div>

        <div
          className={`mt-6 grid md:grid-cols-3 ${isPreview ? "mt-4 gap-2" : "mt-10 gap-4 md:gap-5"}`}
          data-testid={`${testIdPrefix}-expert-process`}
          style={{ backgroundColor: accent }}
        >
          {processItems.map((item, index) => (
            <div
              key={item.key}
              className={`border border-white/25 text-white ${isPreview ? "px-3 py-4" : "px-5 py-6 md:py-8"} ${
                index < processItems.length - 1 ? "md:border-r" : ""
              }`}
            >
              <p className={`font-black leading-none ${isPreview ? "text-2xl" : "text-4xl md:text-5xl"}`} style={{ color: "rgba(255,255,255,0.35)" }}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className={`mt-2 font-bold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>{item.label}</h3>
              <p className={`mt-2 whitespace-normal text-white/85 ${isPreview ? "text-[10px]" : "text-sm"}`}>{item.detail}</p>
            </div>
          ))}
        </div>

        {services && services.length > 0 ? (
          <div className={`mt-6 grid gap-4 ${isPreview ? "mt-4" : "mt-10 sm:grid-cols-2 md:gap-6"}`}>
            {services.map((service) => (
              <ExpertOfferCard key={service.id} slug={publicSlug} service={service} theme={theme} isDark={isDark} variant={variant} />
            ))}
          </div>
        ) : isPreview ? (
          <div className={`mt-4 max-w-sm`}>
            <ExpertOfferCard
              slug=""
              service={{
                id: "preview-sample",
                name: "Sample session",
                description: "Your sessions and offers will appear here on the live page.",
                type: "booking",
                price_cents: 8000,
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
          </div>
        ) : (
          <p className={`mt-8 text-center text-sm ${muted}`}>
            Services will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-bold hover:underline" style={{ color: accent }}>
              View services
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

/* ─── 4. TRUST → problem solving + about proof ─── */
export type ExpertTrustSectionProps = ExpertSectionShell & {
  copy: MiniSiteCopy;
  theme: ExpertTheme;
  isDark: boolean;
  showTrustStats: boolean;
  benefitsSectionEnabled: boolean;
  aboutTitle?: string;
  aboutBody?: string | null;
  services?: PublicService[] | undefined;
  businessName?: string;
  templateImages?: MiniSiteTemplateImages;
};

export function ExpertTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  benefitsSectionEnabled,
  aboutTitle = "",
  aboutBody = null,
  services,
  businessName = "",
  templateImages,
}: ExpertTrustSectionProps) {
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);
  const problemItems =
    services && services.length > 0
      ? services.slice(0, 4).map((s) => ({ key: s.id, title: s.name, detail: s.description?.slice(0, 120) ?? "Expert guidance for your business." }))
      : copy.benefitsItems.filter(Boolean).slice(0, 4).map((item, i) => ({
          key: `benefit-${i}`,
          title: item,
          detail: copy.trustCards[i]?.subtitle ?? "Practical solutions tailored to your goals.",
        }));

  const proofImage = templateImages?.bookingImage ?? templateImages?.profileImage ?? templateImages?.heroImage ?? null;
  const hasAboutProof = hasMeaningfulText(aboutBody) || hasMeaningfulText(aboutTitle) || proofImage != null;
  const showProblem = problemItems.length > 0;
  const hasBenefits = !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);

  if (!showTrustStats && !hasBenefits && !showProblem && !hasAboutProof) {
    return null;
  }

  return (
    <section className={`${isPreview ? "py-4" : "py-10 md:py-14"} ${isDark ? "bg-slate-950" : "bg-white"}`} data-testid={`${testIdPrefix}-trust`}>
      <div className={expertContainerClass(isPreview)}>
        {showProblem ? (
          <div className={isPreview ? "mb-4" : "mb-10"}>
            <div className="flex items-center gap-3">
              <span className="h-1 w-12 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
              <h2 className={`whitespace-normal font-black ${isPreview ? "text-sm" : "text-xl md:text-3xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>
                We help solve your business problem
              </h2>
            </div>
            <div className={`mt-4 space-y-3 ${isPreview ? "space-y-2" : "md:space-y-4"}`} data-testid={`${testIdPrefix}-expert-problems`}>
              {problemItems.map((item) => (
                <div
                  key={item.key}
                  className={`border-l-4 bg-slate-50 ${isPreview ? "px-3 py-2" : "px-5 py-4"} ${isDark ? "bg-slate-900/50" : ""}`}
                  style={{ borderLeftColor: accent }}
                >
                  <p className={`font-bold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>
                    {item.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(hasAboutProof || showTrustStats) ? (
          <div className={`grid items-start ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-10"}`}>
            {proofImage ? (
              <div className={`overflow-hidden ${isPreview ? "rounded-lg" : "rounded-xl"}`}>
                <MiniSiteSlotImage
                  media={proofImage}
                  testId={
                    templateImages?.bookingImage
                      ? `${testIdPrefix}-template-bookingImage`
                      : templateImages?.profileImage
                        ? `${testIdPrefix}-template-profileImage`
                        : `${testIdPrefix}-template-heroImage`
                  }
                  className={`w-full object-cover ${isPreview ? "aspect-[16/9]" : "aspect-[16/10]"}`}
                />
              </div>
            ) : null}

            <div className="min-w-0">
              {hasMeaningfulText(aboutTitle) ? (
                <h3 className={`font-black ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}>
                  {aboutTitle}
                </h3>
              ) : null}
              {hasMeaningfulText(aboutBody) ? (
                <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-sm md:text-base"} ${muted}`}>{aboutBody}</p>
              ) : null}

              {hasBenefits ? (
                <div className={`mt-4 ${isPreview ? "mt-2" : ""}`} data-testid={`${testIdPrefix}-benefits-strip`}>
                  <ul className={`space-y-2 ${isPreview ? "text-xs" : "text-sm"}`}>
                    {copy.benefitsItems.filter(Boolean).map((item) => (
                      <li key={item} className={`flex items-start gap-2 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showTrustStats ? (
                <div
                  className={`mt-4 grid grid-cols-3 gap-3 ${isPreview ? "mt-2" : "mt-6"}`}
                  data-testid={`${testIdPrefix}-trust-stats`}
                >
                  {copy.trustCards.map((stat) => (
                    <div
                      key={stat.subtitle}
                      className={`text-center text-white ${isPreview ? "rounded-lg px-2 py-3" : "rounded-xl px-3 py-5"}`}
                      style={{ backgroundColor: accent }}
                    >
                      <p className={`font-black ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>{stat.title}</p>
                      <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[9px]" : "text-xs"} text-white/85`}>{stat.subtitle}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {businessName ? (
                <p className={`mt-3 font-semibold ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>{businessName}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type ExpertFaqSectionProps = ExpertSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: ExpertTheme;
  isDark: boolean;
};

export function ExpertFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  theme,
  isDark,
}: ExpertFaqSectionProps) {
  const muted = expertMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);

  return (
    <section
      className={`${expertContainerClass(isPreview)} ${isPreview ? "py-3" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`border border-slate-200 bg-white ${isPreview ? "rounded-lg p-4" : "rounded-xl p-6 md:p-8"} ${isDark ? "border-slate-700 bg-slate-900/80" : ""}`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-bold ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <dl className={`mt-4 divide-y ${isDark ? "divide-slate-700" : "divide-slate-200"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`border-l-4 py-3 pl-4 ${isPreview ? "py-2 pl-3" : ""}`}
                style={{ borderLeftColor: accent }}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-sm md:text-base"} ${isDark ? "text-slate-100" : "text-slate-950"}`}
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
      </div>
    </section>
  );
}

export type ExpertContactSectionProps = ExpertSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: ExpertTheme;
  isDark: boolean;
};

export function ExpertContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: ExpertContactSectionProps) {
  const muted = expertMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`${expertContainerClass(isPreview)} ${isPreview ? "py-3" : "py-10 md:py-12"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`border border-slate-200 bg-white text-center md:text-left ${isPreview ? "rounded-lg p-4" : "rounded-xl p-6 md:p-8"} ${
          isDark ? "border-slate-700 bg-slate-900/80" : ""
        }`}
      >
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`whitespace-normal font-bold ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>

        <div className={`mt-4 space-y-2 ${isPreview ? "text-xs" : "text-sm md:text-base"}`}>
          {hasPhone ? (
            <p>
              <a href={`tel:${contactPhone}`} className="font-bold hover:underline" style={{ color: accent }}>
                {contactPhone}
              </a>
            </p>
          ) : null}
          {hasAddress ? (
            <p className={`whitespace-normal ${muted}`}>{contactAddress}</p>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div
            className={`mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start ${isPreview ? "text-xs" : "text-sm"}`}
            data-testid={`${testIdPrefix}-social-links`}
          >
            {entries.map((entry) => (
              <div key={entry.key} className="min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
                <span className={`font-medium ${muted}`}>{entry.label}: </span>
                <span className={isDark ? "text-slate-200" : "text-slate-700"}>{entry.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─── 5. BOOKING CTA ─── */
export type ExpertBookingCtaSectionProps = ExpertSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: ExpertTheme;
  presentation: MiniSiteTemplatePresentation;
  templateImages?: MiniSiteTemplateImages;
};

export function ExpertBookingCtaSection({
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
}: ExpertBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;
  const accent = expertAccent(theme);
  const bookingImage = templateImages?.bookingImage ?? null;
  const radius = buttonRadiusClass(theme.buttonStyle);

  return (
    <section
      className={`${isPreview ? "py-4" : "py-12 md:py-16"} ${isDark ? "bg-slate-900" : "bg-slate-100"}`}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <div className={expertContainerClass(isPreview)}>
        <div
          className={`grid items-center border border-slate-200 bg-white shadow-sm ${isPreview ? "gap-4 rounded-lg p-4" : "gap-8 rounded-xl p-6 md:grid-cols-[1fr_auto] md:p-10"} ${
            isDark ? "border-slate-700 bg-slate-900/80" : ""
          }`}
          data-testid={`${testIdPrefix}-booking-cta-panel`}
        >
          <div className="min-w-0 text-center md:text-left">
            <p
              className={`whitespace-normal font-black ${isPreview ? "text-base" : "text-2xl md:text-3xl"} ${isDark ? "text-slate-100" : "text-slate-950"}`}
              data-testid={`${testIdPrefix}-booking-cta-heading`}
            >
              Ready for a session?
            </p>
            <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${expertMutedText(isDark)}`}>
              Book time or send a request — personal guidance starts here.
            </p>
            <div className={`mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start ${isPreview ? "gap-2" : ""}`}>
              {renderCtaButton({
                previewButtons,
                label: primaryLabel,
                href: primaryHref,
                className: `${presentation.primaryButtonClass} ${radius}`,
                style: { backgroundColor: accent },
                testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
              })}
              {showSecondaryCta
                ? renderCtaButton({
                    previewButtons,
                    label: secondaryLabel!,
                    href: secondaryHref!,
                    className: `${presentation.secondaryButtonClass} ${radius}`,
                    style: { borderColor: accent, color: accent, backgroundColor: "transparent" },
                    testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-expert-booking-request-cta`,
                  })
                : null}
            </div>
          </div>

          {bookingImage ? (
            <div className={`mx-auto overflow-hidden ${isPreview ? "max-w-[6rem] rounded-lg" : "max-w-[10rem] rounded-xl md:max-w-xs"}`}>
              <MiniSiteSlotImage
                media={bookingImage}
                testId={`${testIdPrefix}-template-bookingImage`}
                className="aspect-square w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type ExpertGallerySectionProps = ExpertSectionShell & {
  theme: ExpertTheme;
  isDark: boolean;
};

export function ExpertGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: ExpertGallerySectionProps) {
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";
  const accent = expertAccent(theme);

  return (
    <section
      className={`${expertContainerClass(isPreview)} border-t text-center ${isDark ? "border-slate-700" : "border-slate-200"} ${
        isPreview ? "py-4" : "py-10 md:py-12"
      }`}
      style={{ borderTopColor: `${accent}40` }}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <h2
        id={`${testIdPrefix}-gallery-heading`}
        className={`font-bold ${isPreview ? "text-sm" : "text-lg"} ${isDark ? "text-slate-100" : "text-slate-950"}`}
      >
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md whitespace-normal ${isPreview ? "text-xs" : "text-sm"} ${muted}`}>
        Photo gallery coming soon. Showcase your work here.
      </p>
    </section>
  );
}
