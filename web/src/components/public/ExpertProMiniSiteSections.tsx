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

function expertMutedText(isDark: boolean): string {
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
      return "Book a focused session and get clear, personal guidance tailored to your goals.";
    case "orders_only":
      return "Request a consultation or advisory session — thoughtful expertise when you need direction.";
    default:
      return "Work one-on-one with an expert — book a session or send a request to get started.";
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

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden ${
        isPreview ? "rounded-xl" : "rounded-2xl"
      } ${isDark ? "bg-slate-900/50 ring-1 ring-slate-700/70" : "bg-white/90 ring-1 ring-slate-200/70 shadow-sm"}`}
      data-testid="service-card"
    >
      <div
        className={`${isPreview ? "p-3" : "p-5 md:p-6"}`}
        style={{
          background: isDark
            ? `linear-gradient(160deg, ${theme.primaryColor}14 0%, transparent 70%)`
            : `linear-gradient(160deg, ${theme.primaryColor}08 0%, transparent 65%)`,
        }}
      >
        <p
          className={`font-medium uppercase tracking-[0.14em] ${isPreview ? "text-[9px]" : "text-[11px]"}`}
          style={{ color: theme.accentColor }}
        >
          {service.type === "booking" ? "Session" : "Consultation"}
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
      <div className={`mt-auto border-t ${isDark ? "border-slate-700/60" : "border-slate-200/70"} ${isPreview ? "p-3 pt-2" : "p-5 pt-4"}`}>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`block w-full border px-4 py-2.5 text-center font-medium transition hover:brightness-105 ${radius} ${
            isPreview ? "text-[11px]" : "text-sm"
          }`}
          style={{
            borderColor: theme.primaryColor,
            color: theme.primaryColor,
            backgroundColor: isDark ? "transparent" : `${theme.primaryColor}06`,
          }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

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
  templateImages,
}: ExpertHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const heroImage = templateImages?.heroImage ?? null;
  const profileImage = templateImages?.profileImage ?? null;

  return (
    <header
      className={`relative ${isPreview ? "pb-4 pt-2" : "pb-12 pt-8 md:pb-16 md:pt-12"}`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div
        className={`mx-auto grid max-w-4xl items-center text-center ${
          isPreview ? "gap-3" : "gap-8 md:grid-cols-[1fr_0.72fr] md:gap-10 md:text-left lg:gap-14"
        }`}
        data-testid={`${testIdPrefix}-hero-content`}
      >
        <div className={`min-w-0 ${isPreview ? "space-y-1.5" : "space-y-4 md:space-y-5"}`}>
          <p
            className={`inline-flex rounded-full px-3 py-1 font-medium uppercase tracking-[0.16em] ${
              isPreview ? "text-[10px]" : "text-xs"
            }`}
            style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}12` }}
            data-testid={`${testIdPrefix}-hero-badge`}
          >
            {heroBadgeText}
          </p>

          {heroImage ? (
            <MiniSiteSlotImage
              media={heroImage}
              className={`mx-auto w-full max-w-xs ${isPreview ? "h-16 rounded-lg md:mx-0" : "h-24 rounded-xl md:mx-0 md:h-32"}`}
              testId={`${testIdPrefix}-template-heroImage`}
            />
          ) : null}

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

          <div
            className={`flex flex-col ${isPreview ? "gap-1.5 pt-1" : "gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start"}`}
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

        <aside
          className={`relative mx-auto flex w-full max-w-xs flex-col items-center justify-center ${
            isPreview ? "rounded-2xl p-4" : "rounded-[2rem] p-6 md:p-8"
          } ${isDark ? "bg-slate-900/60 ring-1 ring-slate-700/70" : "bg-white/80 ring-1 ring-slate-200/70 shadow-lg"}`}
          aria-hidden={false}
        >
          {profileImage ? (
            <MiniSiteSlotImage
              media={profileImage}
              className={`object-cover ${isPreview ? "h-16 w-16 rounded-full" : "h-24 w-24 rounded-full md:h-28 md:w-28"}`}
              testId={`${testIdPrefix}-template-profileImage`}
            />
          ) : business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className={`object-cover ${isPreview ? "h-16 w-16 rounded-full" : "h-24 w-24 rounded-full md:h-28 md:w-28"}`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-full font-semibold ${
                isPreview ? "h-16 w-16 text-2xl" : "h-24 w-24 text-4xl md:h-28 md:w-28 md:text-5xl"
              }`}
              style={{
                background: `radial-gradient(circle at 30% 20%, ${theme.primaryColor}30, ${theme.accentColor}18)`,
                color: theme.primaryColor,
              }}
              data-testid={`${testIdPrefix}-logo-placeholder`}
            >
              {monogram}
            </div>
          )}
          <p className={`mt-3 text-center font-medium ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>
            {business.name}
          </p>
          {showHeroCredibility ? (
            <div
              className={`mt-4 grid w-full grid-cols-3 gap-2 border-t pt-4 ${
                isDark ? "border-slate-700/60" : "border-slate-200/70"
              }`}
              data-testid={`${testIdPrefix}-hero-trust-row`}
            >
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className="min-w-0 text-center">
                  <p className={`font-semibold ${isPreview ? "text-[10px]" : "text-sm"}`} style={{ color: theme.primaryColor }}>
                    {stat.title}
                  </p>
                  <p className={`mt-0.5 whitespace-normal ${isPreview ? "text-[9px]" : "text-[11px]"} ${muted}`}>
                    {stat.subtitle}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </header>
  );
}

export type ExpertAboutSectionProps = ExpertSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: ExpertTheme;
  isDark: boolean;
};

export function ExpertAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: ExpertAboutSectionProps) {
  const muted = expertMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-14"}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <div className={`mx-auto max-w-3xl ${isPreview ? "text-center" : "text-center md:text-left"}`}>
        <p
          className={`font-medium uppercase tracking-[0.18em] ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          About the expert
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
            className={`mt-4 whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"} ${muted}`}
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

export type ExpertServicesSectionProps = ExpertSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: ExpertTheme;
  isDark: boolean;
};

export function ExpertServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
}: ExpertServicesSectionProps) {
  const muted = expertMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`${isPreview ? "py-3" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={`mx-auto max-w-4xl ${isPreview ? "space-y-2" : "mb-8 space-y-3 md:mb-10"}`}>
        <p
          className={`text-center font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
        >
          What I offer
        </p>
        <div className="flex flex-wrap items-end justify-center gap-3 text-center md:justify-between md:text-left">
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
              style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}12` }}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>
        <p className={`text-center whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted} md:text-left`}>
          Sessions and consultations designed for focused, personal guidance.
        </p>
      </div>

      {services && services.length > 0 ? (
        <div className={`mx-auto grid max-w-4xl gap-4 ${isPreview ? "" : "sm:grid-cols-2 lg:gap-6"}`}>
          {services.map((service) => (
            <ExpertOfferCard
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
        <p className={`text-center text-sm ${muted}`}>
          Services will appear here.{" "}
          <Link to={`/b/${publicSlug}/services`} className="font-medium hover:underline" style={{ color: theme.primaryColor }}>
            View services
          </Link>
        </p>
      )}
    </section>
  );
}

export type ExpertTrustSectionProps = ExpertSectionShell & {
  copy: MiniSiteCopy;
  theme: ExpertTheme;
  isDark: boolean;
  showTrustStats: boolean;
  benefitsSectionEnabled: boolean;
};

export function ExpertTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  benefitsSectionEnabled,
}: ExpertTrustSectionProps) {
  const muted = expertMutedText(isDark);
  const hasBenefits = !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);
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
        className={`mx-auto max-w-4xl overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl md:rounded-3xl"} ${
          isDark ? "bg-slate-900/45 ring-1 ring-slate-700/60" : "bg-slate-50/90 ring-1 ring-slate-200/70"
        }`}
      >
        {hasBenefits ? (
          <div className={isPreview ? "p-3" : "p-6 md:p-8"} data-testid={`${testIdPrefix}-benefits-strip`}>
            <p className={`font-medium uppercase tracking-[0.16em] ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              My approach
            </p>
            <p className={`mt-1 font-semibold ${isPreview ? "text-sm" : "text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {copy.benefitsSectionTitle}
            </p>
            <ul className={`mt-3 space-y-2 ${isPreview ? "" : "md:mt-4 md:space-y-3"}`}>
              {copy.benefitsItems.filter(Boolean).map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-2 whitespace-normal ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showTrustStats ? (
          <div
            className={`grid grid-cols-3 divide-x ${
              isDark ? "divide-slate-700/60 border-t border-slate-700/60" : "divide-slate-200/80 border-t border-slate-200/70"
            } ${hasBenefits ? "" : ""} ${isPreview ? "py-3" : "py-6 md:py-8"}`}
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
      </div>
    </section>
  );
}

export type ExpertFaqSectionProps = ExpertSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  isDark: boolean;
};

export function ExpertFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  isDark,
}: ExpertFaqSectionProps) {
  const muted = expertMutedText(isDark);
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
        <dl className={`mt-4 space-y-4 ${isPreview ? "" : "md:mt-6 md:space-y-5"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div key={`${index}-${item.question}`} data-testid={`${testIdPrefix}-faq-item-${index}`}>
                <dt
                  className={`whitespace-normal font-medium ${isPreview ? "text-xs" : "text-sm md:text-base"} ${
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
        className={`mx-auto max-w-3xl text-center ${isPreview ? "rounded-xl p-3" : "rounded-2xl p-6 md:p-8"} ${
          isDark ? "bg-slate-900/50 ring-1 ring-slate-700/60" : "bg-white/80 ring-1 ring-slate-200/70 shadow-sm"
        }`}
      >
        <h2
          id={`${testIdPrefix}-contact-heading`}
          className={`whitespace-normal font-semibold tracking-tight ${isPreview ? "text-sm" : "text-xl md:text-2xl"} ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          data-testid={`${testIdPrefix}-contact-title`}
        >
          {title}
        </h2>

        <div className={`mt-4 space-y-3 ${isPreview ? "text-xs" : "text-sm md:text-base"}`}>
          {hasPhone ? (
            <p>
              <a href={`tel:${contactPhone}`} className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
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
            className={`mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 ${isPreview ? "text-xs" : "text-sm"}`}
            data-testid={`${testIdPrefix}-social-links`}
          >
            {entries.map((entry) => (
              <div key={entry.key} className="min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
                <span className={`font-medium ${muted}`}>{entry.label}: </span>
                <span className={`whitespace-normal ${isDark ? "text-slate-200" : "text-slate-700"}`}>{entry.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type ExpertBookingCtaSectionProps = ExpertSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: ExpertTheme;
  presentation: MiniSiteTemplatePresentation;
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
}: ExpertBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;

  return (
    <section
      className={`${isPreview ? "py-4" : "py-12 md:py-16"}`}
      data-testid={`${testIdPrefix}-booking-cta-section`}
    >
      <div
        className={`mx-auto max-w-3xl text-center ${isPreview ? "rounded-xl px-3 py-4" : "rounded-2xl px-6 py-10 md:px-10 md:py-12"} ${
          isDark ? "bg-slate-900/60 ring-1 ring-slate-700/60" : "bg-slate-900/[0.03] ring-1 ring-slate-200/80"
        }`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.primaryColor}18 0%, rgba(15,23,42,0.6) 100%)`
            : `linear-gradient(180deg, ${theme.primaryColor}08 0%, ${theme.accentColor}06 100%)`,
        }}
      >
        <p className={`font-semibold tracking-tight ${isPreview ? "text-sm" : "text-2xl md:text-3xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          Ready for a session?
        </p>
        <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${expertMutedText(isDark)}`}>
          Book time or send a request — personal guidance starts here.
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

  return (
    <section
      className={`border-t text-center ${isDark ? "border-slate-700/60" : "border-slate-200/70"} ${
        isPreview ? "py-4" : "py-10 md:py-12"
      }`}
      style={{ borderTopColor: `${theme.accentColor}40` }}
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
        Photo gallery coming soon. Showcase your work here.
      </p>
    </section>
  );
}
