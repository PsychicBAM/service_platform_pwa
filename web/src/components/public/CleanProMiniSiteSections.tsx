import { Link } from "react-router-dom";
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
import type { MiniSiteBackgroundStyle, MiniSiteCopy, MiniSiteSocialLinks } from "@/types/miniSite";
import { formatDuration, serviceActionLabel } from "@/utils/format";

export type CleanSectionVariant = "full" | "preview";

type CleanSectionShell = {
  variant?: CleanSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type CleanTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
};

function cleanMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function cleanBorder(isDark: boolean): string {
  return isDark ? "border-slate-700/60" : "border-slate-200/60";
}

function cleanDivider(isDark: boolean): string {
  return isDark ? "divide-slate-700/60" : "divide-slate-200/60";
}

function variantSpacing(variant: CleanSectionVariant): string {
  return variant === "preview" ? "py-4" : "py-12 md:py-16";
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book appointments and manage your visits.";
    case "orders_only":
      return "Browse services and submit requests online.";
    default:
      return "Book appointments or submit service requests in one place.";
  }
}

function CleanServiceRow({
  slug,
  service,
  primaryColor,
  isDark,
  variant,
}: {
  slug: string;
  service: PublicService;
  primaryColor: string;
  isDark: boolean;
  variant: CleanSectionVariant;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 80 : 140)
      ? `${service.description.slice(0, variant === "preview" ? 80 : 140).trim()}…`
      : service.description
    : null;
  const muted = cleanMutedText(isDark);

  return (
    <article
      className={`flex flex-col gap-3 ${
        variant === "preview" ? "px-3 py-2.5" : "px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6 md:py-6"
      }`}
      data-testid="service-card"
    >
      <div className="min-w-0 flex-1">
        <h3
          className={`whitespace-normal font-medium tracking-tight ${
            variant === "preview" ? "text-xs" : "text-base md:text-lg"
          } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        >
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p className={`mt-1 whitespace-normal leading-relaxed ${variant === "preview" ? "text-[11px]" : "text-sm"} ${muted}`}>
            {descriptionPreview}
          </p>
        ) : null}
        <div className={`mt-2 flex flex-wrap items-center gap-3 ${variant === "preview" ? "text-[10px]" : "text-sm"} ${muted}`}>
          <PriceLabel service={service} />
          {duration ? <span>{duration}</span> : null}
        </div>
      </div>
      <Link
        to={`/b/${slug}/services/${service.id}`}
        className={`inline-flex shrink-0 items-center gap-1 font-medium whitespace-normal hover:underline ${
          variant === "preview" ? "text-[11px]" : "text-sm"
        }`}
        style={{ color: primaryColor }}
      >
        {serviceActionLabel(service.type)}
        {variant === "full" ? <span aria-hidden>→</span> : null}
      </Link>
    </article>
  );
}

export type CleanHeroSectionProps = CleanSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: CleanTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  showHeroTrustStrip: boolean;
  operatingMode: OperatingMode;
  templateImages?: MiniSiteTemplateImages;
};

export function CleanHeroSection({
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
  showHeroTrustStrip,
  operatingMode,
  templateImages,
}: CleanHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = cleanMutedText(isDark);
  const isPreview = variant === "preview";
  const heroImage = templateImages?.heroImage ?? null;

  return (
    <header
      className={`relative isolate overflow-hidden border-b ${cleanBorder(isDark)} ${
        isPreview ? "pb-4 pt-3" : "pb-14 pt-10 md:pb-20 md:pt-14"
      }`}
      data-testid={`${testIdPrefix}-hero`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 80% 60% at 50% -10%, ${theme.primaryColor}18, transparent 65%)`
            : `radial-gradient(ellipse 90% 70% at 50% -20%, ${theme.primaryColor}10, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 0%, ${theme.accentColor}08, transparent 55%)`,
        }}
        aria-hidden
      />

      <div
        className={`mx-auto flex flex-col items-center text-center ${
          isPreview ? "max-w-full gap-2 px-1" : "max-w-3xl gap-4 md:gap-5"
        }`}
        data-testid={`${testIdPrefix}-hero-content`}
      >
        {heroImage ? (
          <MiniSiteSlotImage
            media={heroImage}
            className={`w-full max-w-md ${isPreview ? "h-24 rounded-lg" : "h-36 rounded-xl md:h-44"}`}
            testId={`${testIdPrefix}-template-heroImage`}
          />
        ) : null}

        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt=""
            className={`shrink-0 object-cover ${
              isPreview ? "h-9 w-9 rounded-lg" : "h-14 w-14 rounded-xl shadow-sm ring-2 ring-white/80 md:h-16 md:w-16"
            }`}
          />
        ) : (
          <div
            className={`flex shrink-0 items-center justify-center font-semibold ${
              isPreview ? "h-9 w-9 rounded-lg text-sm" : "h-14 w-14 rounded-xl text-xl shadow-sm ring-2 ring-white/70 md:h-16 md:w-16 md:text-2xl"
            }`}
            style={{ backgroundColor: `${theme.primaryColor}16`, color: theme.primaryColor }}
            aria-hidden
            data-testid={`${testIdPrefix}-logo-placeholder`}
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}

        <p
          className={`${presentation.heroBadgeClass} whitespace-normal`}
          style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}10` }}
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
            className={`max-w-2xl whitespace-normal font-medium ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
            data-testid={`${testIdPrefix}-hero-subtitle`}
          >
            {heroSubtitle}
          </p>
        ) : (
          <p className={`max-w-2xl whitespace-normal ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}>
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

        <div
          className={`flex w-full flex-col ${isPreview ? "mt-2 gap-1.5" : "mt-4 gap-3 sm:flex-row sm:justify-center md:mt-6 md:gap-4"}`}
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

      {showHeroTrustStrip ? (
        <div
          className={`mx-auto grid grid-cols-3 ${cleanDivider(isDark)} ${
            isPreview ? "mt-3 max-w-full gap-2 border-t pt-3" : "mt-12 max-w-4xl gap-6 border-t pt-8 md:divide-x md:divide-slate-200/60"
          }`}
          data-testid={`${testIdPrefix}-hero-trust-strip`}
        >
          {copy.trustCards.map((stat) => (
            <div key={stat.subtitle} className={`min-w-0 text-center ${isPreview ? "px-1" : "px-4 md:px-6"}`}>
              <p
                className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}
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

export type CleanAboutSectionProps = CleanSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: CleanTheme;
  isDark: boolean;
};

export function CleanAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: CleanAboutSectionProps) {
  const muted = cleanMutedText(isDark);
  const content = body || fallbackBody;

  return (
    <section
      className={`border-b ${cleanBorder(isDark)} ${variantSpacing(variant)} ${variant === "preview" ? "px-1" : ""}`}
      data-testid={`${testIdPrefix}-about`}
    >
      <p
        className={`text-center font-medium uppercase tracking-[0.18em] ${
          variant === "preview" ? "mb-1.5 text-[10px]" : "mb-4 text-xs"
        }`}
        style={{ color: theme.accentColor }}
        data-testid={`${testIdPrefix}-about-title`}
      >
        {title}
      </p>
      {content ? (
        <p
          className={`mx-auto max-w-2xl text-center whitespace-normal leading-relaxed ${
            variant === "preview" ? "text-xs" : "text-lg md:text-xl"
          } ${muted}`}
          data-testid={`${testIdPrefix}-about-body`}
        >
          {content}
        </p>
      ) : (
        <p className={`text-center text-sm italic ${muted}`}>About text will appear here.</p>
      )}
    </section>
  );
}

export type CleanServicesSectionProps = CleanSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: CleanTheme;
  isDark: boolean;
  templateImages?: MiniSiteTemplateImages;
};

export function CleanServicesSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
  templateImages,
}: CleanServicesSectionProps) {
  const muted = cleanMutedText(isDark);
  const panelClass = isDark
    ? "border-slate-700/60 bg-slate-900/25"
    : "border-slate-200/55 bg-white/75 shadow-sm shadow-slate-900/[0.03] backdrop-blur-sm";
  const servicesImage = templateImages?.servicesImage ?? null;

  return (
    <section
      className={`${variantSpacing(variant)} ${variant === "preview" ? "px-1" : ""}`}
      aria-labelledby="pro-mini-site-services-heading"
      data-testid={`${testIdPrefix}-services`}
    >
      <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${variant === "preview" ? "mb-2" : "md:mb-8"}`}>
        <div>
          <p
            className={`font-medium uppercase tracking-[0.16em] ${variant === "preview" ? "mb-1 text-[10px]" : "mb-2 text-xs"}`}
            style={{ color: theme.primaryColor }}
          >
            Offerings
          </p>
          <h2
            id="pro-mini-site-services-heading"
            className={`whitespace-normal font-medium tracking-tight ${
              variant === "preview" ? "text-sm" : "text-2xl md:text-3xl"
            } ${isDark ? "text-slate-100" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-services-title`}
          >
            {title}
          </h2>
        </div>
        {badgeText ? (
          <span
            className={`rounded-full px-3 py-1 font-medium ${variant === "preview" ? "text-[10px]" : "text-xs"}`}
            style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}12` }}
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
        <div className={`divide-y ${cleanDivider(isDark)} overflow-hidden rounded-2xl border ${panelClass}`}>
          {services.map((service) => (
            <CleanServiceRow
              key={service.id}
              slug={publicSlug}
              service={service}
              primaryColor={theme.primaryColor}
              isDark={isDark}
              variant={variant}
            />
          ))}
        </div>
      ) : variant === "preview" ? (
        <div className={`divide-y ${cleanDivider(isDark)} overflow-hidden rounded-2xl border ${panelClass}`}>
          <article className="flex flex-col gap-2 px-3 py-2.5">
            <p className={`text-xs font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>Sample service</p>
            <p className={`text-[11px] leading-relaxed ${muted}`}>
              Your services will appear here on the live page.
            </p>
            <span className="text-[11px] font-medium" style={{ color: theme.primaryColor }}>
              View service
            </span>
          </article>
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

export type CleanTrustSectionProps = CleanSectionShell & {
  copy: MiniSiteCopy;
  theme: CleanTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function CleanTrustSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: CleanTrustSectionProps) {
  const muted = cleanMutedText(isDark);
  const hasBenefits = showBenefitsStrip && !benefitsSectionEnabled && copy.benefitsItems.some(Boolean);

  if (!showTrustStats && !hasBenefits) {
    return null;
  }

  return (
    <section
      className={`border-y ${cleanBorder(isDark)} ${variant === "preview" ? "py-3" : "py-10 md:py-12"}`}
      data-testid={`${testIdPrefix}-trust`}
    >
      {showTrustStats ? (
        <div
          className={`grid ${variant === "preview" ? "grid-cols-3 gap-2" : "gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-200/60"}`}
          data-testid={`${testIdPrefix}-trust-stats`}
        >
          {copy.trustCards.map((stat) => (
            <div
              key={stat.subtitle}
              className={`min-w-0 text-center ${variant === "preview" ? "px-1" : "px-4 md:px-8"}`}
            >
              <p
                className={`whitespace-normal font-semibold ${variant === "preview" ? "text-xs" : "text-2xl md:text-3xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {stat.title}
              </p>
              <p className={`mt-1 whitespace-normal ${variant === "preview" ? "text-[10px]" : "text-sm"} ${muted}`}>
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {hasBenefits ? (
        <div className={showTrustStats ? (variant === "preview" ? "mt-3 border-t pt-3" : "mt-10 border-t pt-10") : ""}>
          <p
            className={`text-center font-medium uppercase tracking-[0.16em] ${variant === "preview" ? "mb-2 text-[10px]" : "mb-6 text-xs"} ${muted}`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            {copy.benefitsSectionTitle}
          </p>
          <ul
            className={`grid ${variant === "preview" ? "gap-1.5" : "gap-4 sm:grid-cols-3 sm:gap-6"}`}
          >
            {copy.benefitsItems.filter(Boolean).map((benefit) => (
              <li
                key={benefit}
                className={`flex items-start gap-2 whitespace-normal ${variant === "preview" ? "text-xs" : "text-sm"} ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full text-white ${
                    variant === "preview" ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
                  }`}
                  style={{ backgroundColor: theme.primaryColor }}
                  aria-hidden
                >
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export type CleanFaqSectionProps = CleanSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  isDark: boolean;
};

export function CleanFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  isDark,
}: CleanFaqSectionProps) {
  const muted = cleanMutedText(isDark);
  const items = faqItems ?? [];

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)} ${variant === "preview" ? "px-1" : ""}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <h2
        id={`${testIdPrefix}-faq-heading`}
        className={`whitespace-normal font-medium tracking-tight ${
          variant === "preview" ? "text-sm" : "text-2xl md:text-3xl"
        } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        data-testid={`${testIdPrefix}-faq-title`}
      >
        {title}
      </h2>
      <dl className={`${cleanDivider(isDark)} divide-y ${variant === "preview" ? "mt-2" : "mt-8"}`}>
        {items.map((item, index) => {
          if (!isFaqItemFilled(item)) {
            return null;
          }

          return (
            <div
              key={`${index}-${item.question}`}
              className={variant === "preview" ? "py-2" : "py-5 md:py-6"}
              data-testid={`${testIdPrefix}-faq-item-${index}`}
            >
              <dt
                className={`whitespace-normal font-medium ${variant === "preview" ? "text-xs" : "text-base"} ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
                data-testid={`${testIdPrefix}-faq-item-${index}-question`}
              >
                {item.question}
              </dt>
              <dd
                className={`mt-1 whitespace-normal leading-relaxed ${variant === "preview" ? "text-xs" : "text-sm"} ${muted}`}
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

export type CleanContactSectionProps = CleanSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: CleanTheme;
  isDark: boolean;
};

export function CleanContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: CleanContactSectionProps) {
  const muted = cleanMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`border-t ${cleanBorder(isDark)} ${variantSpacing(variant)} ${
        isDark ? "bg-slate-900/20" : "bg-slate-50/40"
      } ${variant === "preview" ? "px-1" : ""}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <h2
        id={`${testIdPrefix}-contact-heading`}
        className={`whitespace-normal font-medium tracking-tight ${
          variant === "preview" ? "text-sm" : "text-xl md:text-2xl"
        } ${isDark ? "text-slate-100" : "text-slate-900"}`}
        data-testid={`${testIdPrefix}-contact-title`}
      >
        {title}
      </h2>

      <div className={`mt-4 grid gap-4 ${variant === "preview" ? "text-xs" : "text-sm md:grid-cols-2 md:gap-8"}`}>
        {hasAddress ? (
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Address</p>
            <p className={`mt-1 whitespace-normal ${isDark ? "text-slate-200" : "text-slate-800"}`}>{contactAddress}</p>
          </div>
        ) : null}
        {hasPhone ? (
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
            <p className="mt-1">
              <a href={`tel:${contactPhone}`} className="font-medium hover:underline" style={{ color: theme.primaryColor }}>
                {contactPhone}
              </a>
            </p>
          </div>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <div
          className={`flex flex-wrap gap-x-6 gap-y-2 ${variant === "preview" ? "mt-2 text-xs" : "mt-6 text-sm"}`}
          data-testid={`${testIdPrefix}-social-links`}
        >
          {entries.map((entry) => (
            <div key={entry.key} className="min-w-0" data-testid={`${testIdPrefix}-${entry.key}`}>
              <span className={`text-xs font-medium uppercase tracking-wide ${muted}`}>{entry.label}: </span>
              <span className={`whitespace-normal ${muted}`}>{entry.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export type CleanBookingCtaSectionProps = CleanSectionShell & {
  label: string;
  href: string;
  theme: CleanTheme;
  presentation: MiniSiteTemplatePresentation;
  templateImages?: MiniSiteTemplateImages;
};

export function CleanBookingCtaSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  label,
  href,
  theme,
  presentation,
  templateImages,
}: CleanBookingCtaSectionProps) {
  const ctaImage = templateImages?.ctaImage ?? null;

  return (
    <section
      className={`border-t border-slate-200/60 py-10 text-center ${variant === "preview" ? "py-4" : "md:py-14"}`}
      data-testid="pro-mini-site-booking-cta-section"
      style={{ backgroundColor: `${theme.primaryColor}06` }}
    >
      {ctaImage ? (
        <div className={`mx-auto max-w-xl ${variant === "preview" ? "mb-2 px-1" : "mb-4 px-4"}`}>
          <MiniSiteSectionAccentImage
            media={ctaImage}
            variant={variant}
            testId={`${testIdPrefix}-template-ctaImage`}
          />
        </div>
      ) : null}
      <Link
        to={href}
        className={presentation.primaryButtonClass}
        data-testid="pro-mini-site-booking-cta-link"
        style={{ backgroundColor: theme.primaryColor }}
      >
        {label}
      </Link>
    </section>
  );
}

export type CleanGallerySectionProps = CleanSectionShell & {
  theme: CleanTheme;
  isDark: boolean;
};

export function CleanGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: CleanGallerySectionProps) {
  const muted = cleanMutedText(isDark);

  return (
    <section
      className={`border-t border-dashed ${cleanBorder(isDark)} text-center ${variant === "preview" ? "py-4" : "py-12 md:py-16"}`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`mx-auto mb-3 flex items-center justify-center rounded-full font-medium ${
          variant === "preview" ? "h-8 w-8 text-sm" : "h-12 w-12 text-lg"
        }`}
        style={{ backgroundColor: `${theme.accentColor}14`, color: theme.accentColor }}
        aria-hidden
      >
        +
      </div>
      <h2
        id="pro-mini-site-gallery-heading"
        className={`font-medium ${variant === "preview" ? "text-sm" : "text-xl"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md whitespace-normal ${variant === "preview" ? "text-xs" : "text-sm"} ${muted}`}>
        Photo gallery coming soon. Showcase your work here.
      </p>
    </section>
  );
}
