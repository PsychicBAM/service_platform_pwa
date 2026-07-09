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

export type CoachSectionVariant = "full" | "preview";

type CoachSectionShell = {
  variant?: CoachSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type CoachTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

const COACH_CONTAINER = "mx-auto w-full max-w-[75rem] px-5 sm:px-6 md:px-8 lg:px-10";

function coachMutedText(isDark: boolean): string {
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
      return "Book a coaching session and move forward with clarity, structure, and momentum.";
    case "orders_only":
      return "Send an inquiry to explore the right coaching program for your next chapter.";
    default:
      return "Personal coaching designed to help you gain clarity, build momentum, and follow through.";
  }
}

function programTypeLabel(service: PublicService): string {
  return service.type === "booking" ? "Coaching session" : "Program inquiry";
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

type OutcomeCard = {
  key: string;
  label: string;
  title: string;
  detail?: string;
};

function buildOutcomeCards({
  copy,
  serviceCount,
}: {
  copy: MiniSiteCopy;
  serviceCount: number | null;
}): OutcomeCard[] {
  const benefits = copy.benefitsItems.filter(Boolean);
  const trust = copy.trustCards;

  return [
    {
      key: "programs",
      label: "Programs",
      title:
        serviceCount != null && serviceCount > 0
          ? `${serviceCount} coaching option${serviceCount === 1 ? "" : "s"}`
          : (trust[0]?.title ?? "Structured coaching"),
      detail: trust[0]?.subtitle ?? benefits[0],
    },
    {
      key: "process",
      label: "Your path",
      title: benefits[0] ?? trust[1]?.title ?? copy.benefitsSectionTitle,
      detail: benefits[1] ?? trust[1]?.subtitle,
    },
    {
      key: "results",
      label: "Focus",
      title: benefits[1] ?? trust[2]?.title ?? "Clear next steps",
      detail: benefits[2] ?? trust[2]?.subtitle ?? trust[0]?.subtitle,
    },
  ];
}

function CoachProgramCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  index,
}: {
  slug: string;
  service: PublicService;
  theme: CoachTheme;
  isDark: boolean;
  variant: CoachSectionVariant;
  index: number;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 75 : 130)
      ? `${service.description.slice(0, variant === "preview" ? 75 : 130).trim()}…`
      : service.description
    : null;
  const muted = coachMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <article
      className={`relative overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl"} ${
        isDark ? "bg-slate-900/80 ring-1 ring-slate-700/60" : "bg-white shadow-lg ring-1 ring-slate-900/5"
      }`}
      data-testid="service-card"
    >
      <div
        className={`absolute inset-y-0 left-0 w-1.5 ${isPreview ? "w-1" : "md:w-2"}`}
        style={{ backgroundColor: index % 2 === 0 ? theme.primaryColor : theme.accentColor }}
        aria-hidden
      />
      <div className={`flex flex-col ${isPreview ? "p-4 pl-5" : "p-6 pl-7 md:p-8 md:pl-9"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className={`font-semibold tracking-wide ${isPreview ? "text-[10px]" : "text-xs uppercase"}`} style={{ color: theme.accentColor }}>
            {programTypeLabel(service)}
          </p>
          <span className={`font-bold tabular-nums ${isPreview ? "text-sm" : "text-lg"}`} style={{ color: `${theme.primaryColor}50` }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <h3 className={`mt-2 whitespace-normal font-bold leading-snug ${isPreview ? "text-base" : "text-xl md:text-2xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          {service.name}
        </h3>
        {descriptionPreview ? (
          <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            {descriptionPreview}
          </p>
        ) : null}
        <div className={`mt-3 flex flex-wrap items-center gap-3 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
          <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            <PriceLabel service={service} />
          </span>
          {duration ? <span>{duration}</span> : null}
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`inline-flex w-full items-center justify-center font-semibold text-white transition hover:brightness-110 ${
            isPreview ? "mt-4 rounded-lg py-2 text-xs" : "mt-5 rounded-xl py-3.5 text-sm md:text-base"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

export type CoachHeroSectionProps = CoachSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: CoachTheme;
  presentation: MiniSiteTemplatePresentation;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryBookingHref: string;
  secondaryOrderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
  operatingMode: OperatingMode;
  services: PublicService[] | undefined;
  serviceCount: number | null;
  templateImages?: MiniSiteTemplateImages;
};

export function CoachHeroSection({
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
  services,
  serviceCount,
  templateImages,
}: CoachHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = coachMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const heroImage = templateImages?.heroImage ?? null;
  const programImage = templateImages?.programImage ?? null;
  const outcomeCards = buildOutcomeCards({ copy, serviceCount });
  const programPreview = (services ?? []).slice(0, 3);
  const focusChips = copy.benefitsItems.filter(Boolean).slice(0, 3);

  return (
    <div className={COACH_CONTAINER}>
      <header className={isPreview ? "pb-4" : "pb-10 md:pb-12"} data-testid={`${testIdPrefix}-hero`}>
        <div
          className={`relative overflow-hidden ${isPreview ? "rounded-2xl" : "rounded-[1.5rem] lg:rounded-[2rem]"} ${
            isDark ? "bg-slate-950/90 ring-1 ring-slate-700/60" : "bg-slate-900 text-white shadow-2xl"
          }`}
          data-testid={`${testIdPrefix}-coach-hero`}
        >
          <div
            className={`absolute inset-0 opacity-40`}
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}55 0%, transparent 45%, ${theme.accentColor}33 100%)`,
            }}
            aria-hidden
          />
          <div
            className={`relative grid items-center ${isPreview ? "gap-4 p-4" : "gap-8 p-8 md:grid-cols-[1.08fr_0.92fr] md:gap-10 md:p-10 lg:p-12"}`}
            data-testid={`${testIdPrefix}-hero-content`}
          >
            <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-5 md:space-y-6"}`}>
              {heroImage ? (
                <MiniSiteSlotImage
                  media={heroImage}
                  className={`w-full max-w-md ${isPreview ? "h-20 rounded-lg" : "h-32 rounded-xl md:h-40"}`}
                  testId={`${testIdPrefix}-template-heroImage`}
                />
              ) : null}

              <p
                className={`inline-flex font-semibold tracking-[0.14em] uppercase ${isPreview ? "text-[9px]" : "text-xs"}`}
                style={{ color: theme.accentColor }}
                data-testid={`${testIdPrefix}-hero-badge`}
              >
                {heroBadgeText}
              </p>

              <h1
                className={`${presentation.heroTitleClass} whitespace-normal text-white`}
                data-testid={`${testIdPrefix}-hero-title`}
              >
                {heroTitle}
              </h1>

              {heroSubtitle ? (
                <p
                  className={`max-w-xl whitespace-normal font-medium leading-relaxed text-slate-200 ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}
                  data-testid={`${testIdPrefix}-hero-subtitle`}
                >
                  {heroSubtitle}
                </p>
              ) : (
                <p className={`max-w-xl whitespace-normal text-slate-200 ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>
                  {heroIntro(operatingMode)}
                </p>
              )}

              {heroBody ? (
                <p
                  className={`max-w-xl whitespace-normal leading-relaxed text-slate-300 ${isPreview ? "text-[11px]" : "text-sm md:text-base"}`}
                  data-testid={`${testIdPrefix}-hero-body`}
                >
                  {heroBody}
                </p>
              ) : null}

              {focusChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {focusChips.map((chip) => (
                    <span
                      key={chip}
                      className={`border border-white/20 bg-white/10 px-3 py-1 font-medium text-slate-100 ${
                        isPreview ? "rounded-md text-[10px]" : "rounded-lg text-sm"
                      }`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
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
                      style: { borderColor: theme.accentColor, color: theme.accentColor, backgroundColor: "rgba(255,255,255,0.06)" },
                      testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                    })
                  : null}
              </div>
            </div>

            <aside
              className={`${isPreview ? "rounded-xl" : "rounded-2xl"} ${
                isDark ? "bg-slate-950/80 ring-1 ring-slate-700/50" : "bg-white text-slate-900 shadow-xl ring-1 ring-white/10"
              }`}
              data-testid={`${testIdPrefix}-coach-program-panel`}
            >
              <div
                className={`border-b ${isDark ? "border-slate-700/60" : "border-slate-100"} ${
                  isPreview ? "px-4 py-3" : "px-6 py-5"
                }`}
                style={{
                  background: isDark
                    ? `linear-gradient(90deg, ${theme.primaryColor}22 0%, transparent 100%)`
                    : `linear-gradient(90deg, ${theme.primaryColor}10 0%, #f8fafc 100%)`,
                }}
              >
                <p className={`font-bold ${isPreview ? "text-xs" : "text-lg"}`}>Your coaching path</p>
                <p className={`${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? muted : "text-slate-600"}`}>
                  Programs and sessions available now
                </p>
              </div>

              <div className={isPreview ? "space-y-3 p-4" : "space-y-4 p-6"}>
                <div className="flex items-center gap-4">
                  {programImage ? (
                    <MiniSiteSlotImage
                      media={programImage}
                      className={`shrink-0 ${isPreview ? "h-11 w-11" : "h-14 w-14"} ${buttonRadiusClass(theme.buttonStyle)}`}
                      testId={`${testIdPrefix}-template-programImage`}
                    />
                  ) : (
                    <div
                      className={`flex shrink-0 items-center justify-center font-bold text-white ${
                        isPreview ? "h-11 w-11 text-base" : "h-14 w-14 text-xl"
                      } ${buttonRadiusClass(theme.buttonStyle)}`}
                      style={{ backgroundColor: theme.primaryColor }}
                      data-testid={`${testIdPrefix}-logo-placeholder`}
                    >
                      {monogram}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-bold ${isPreview ? "text-sm" : "text-lg"}`}>{business.name}</p>
                    <p className={`${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? muted : "text-slate-600"}`}>
                      {serviceCount != null && serviceCount > 0
                        ? `${serviceCount} program${serviceCount === 1 ? "" : "s"} open`
                        : "Coaching & mentorship"}
                    </p>
                  </div>
                </div>

                {programPreview.length > 0 ? (
                  <ul className="space-y-2">
                    {programPreview.map((service) => (
                      <li
                        key={service.id}
                        className={`rounded-lg border-l-4 px-3 py-2 ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}
                        style={{ borderLeftColor: theme.primaryColor }}
                      >
                        <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs"} ${isDark ? muted : "text-slate-500"}`}>
                          {programTypeLabel(service)}
                        </p>
                        <p className={`whitespace-normal font-semibold ${isPreview ? "text-[11px]" : "text-sm"}`}>{service.name}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`rounded-lg px-3 py-2 ${isPreview ? "text-[10px]" : "text-sm"} ${isDark ? muted : "text-slate-600"} ${
                    isDark ? "bg-slate-900/80" : "bg-slate-50"
                  }`}>
                    Coaching programs appear here when services are added.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div
          className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 ${isPreview ? "mt-3 gap-2" : "lg:mt-8 lg:gap-5"}`}
          data-testid={`${testIdPrefix}-coach-outcomes`}
        >
          {outcomeCards.map((card) => (
            <div
              key={card.key}
              className={`${isPreview ? "rounded-xl p-3" : "rounded-2xl p-5 md:p-6"} ${
                isDark ? "bg-slate-900/70 ring-1 ring-slate-700/50" : "bg-white shadow-md ring-1 ring-slate-200/70"
              }`}
            >
              <p className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[9px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
                {card.label}
              </p>
              <p className={`mt-1 whitespace-normal font-bold leading-snug ${isPreview ? "text-sm" : "text-lg md:text-xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                {card.title}
              </p>
              {card.detail ? (
                <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>{card.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export type CoachAboutSectionProps = CoachSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: CoachTheme;
  isDark: boolean;
};

export function CoachAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: CoachAboutSectionProps) {
  const muted = coachMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`} data-testid={`${testIdPrefix}-about`}>
      <div
        className={`border-l-4 ${isPreview ? "rounded-r-xl p-4 pl-5" : "rounded-r-2xl p-8 pl-8 md:p-10 md:pl-10"} ${
          isDark ? "bg-slate-900/70 ring-1 ring-slate-700/50" : "bg-slate-50 shadow-sm ring-1 ring-slate-200/60"
        }`}
        style={{ borderLeftColor: theme.primaryColor }}
      >
        <p
          className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`}
          style={{ color: theme.accentColor }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          Coaching philosophy
        </p>
        <h2 className={`mt-2 whitespace-normal font-bold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          {title}
        </h2>
        {content ? (
          <p
            className={`mt-4 max-w-3xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${muted}`}
            data-testid={`${testIdPrefix}-about-body`}
          >
            {content}
          </p>
        ) : (
          <p className={`mt-4 text-sm italic ${muted}`}>Coaching philosophy will appear here.</p>
        )}
      </div>
    </section>
  );
}

export type CoachProgramsSectionProps = CoachSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: CoachTheme;
  isDark: boolean;
};

export function CoachProgramsSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
}: CoachProgramsSectionProps) {
  const muted = coachMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Coaching programs";

  return (
    <section
      className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div data-testid={`${testIdPrefix}-coach-programs`}>
        <div className={`flex flex-wrap items-end justify-between gap-4 ${isPreview ? "mb-4" : "mb-8"}`}>
          <div>
            <p className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Programs & sessions
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-2 whitespace-normal font-bold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-2 max-w-2xl whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
              Choose a coaching program or session and take the next step forward.
            </p>
          </div>
          {badgeText ? (
            <span
              className={`font-semibold ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {services && services.length > 0 ? (
          <div className={`grid gap-4 ${isPreview ? "" : "md:grid-cols-2 md:gap-6"}`}>
            {services.map((service, index) => (
              <CoachProgramCard
                key={service.id}
                slug={publicSlug}
                service={service}
                theme={theme}
                isDark={isDark}
                variant={variant}
                index={index}
              />
            ))}
          </div>
        ) : isPreview ? (
          <CoachProgramCard
            slug=""
            service={{
              id: "preview-sample",
              name: "Clarity coaching session",
              description: "Your coaching programs appear here on the live page.",
              type: "booking",
              price_cents: 15000,
              duration_minutes: 60,
              currency: "USD",
              price_type: "fixed",
              require_payment: false,
              sort_order: 0,
            }}
            theme={theme}
            isDark={isDark}
            variant={variant}
            index={0}
          />
        ) : (
          <p className={`text-base ${muted}`}>
            Programs will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
              View programs
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export type CoachTransformationSectionProps = CoachSectionShell & {
  copy: MiniSiteCopy;
  theme: CoachTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function CoachTransformationSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: CoachTransformationSectionProps) {
  const steps = showBenefitsStrip && !benefitsSectionEnabled ? copy.benefitsItems.filter(Boolean) : [];
  const isPreview = variant === "preview";

  if (steps.length === 0 && !showTrustStats) {
    return null;
  }

  return (
    <section className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`} data-testid={`${testIdPrefix}-trust`}>
      <div data-testid={`${testIdPrefix}-coach-process`} className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10"}`}>
        {steps.length > 0 ? (
          <div data-testid={`${testIdPrefix}-benefits-strip`}>
            <p className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Transformation process
            </p>
            <h2 className={`mt-2 font-bold ${isPreview ? "text-base" : "text-2xl md:text-3xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              How coaching works
            </h2>
            <ol className={`mt-5 space-y-0 ${isPreview ? "mt-3" : "lg:mt-6"}`}>
              {steps.map((item, index) => (
                <li key={item} className={`relative flex gap-4 pb-6 last:pb-0 ${isPreview ? "pb-4" : ""}`}>
                  {index < steps.length - 1 ? (
                    <span
                      className={`absolute left-[1.125rem] top-10 w-0.5 ${isPreview ? "left-4 top-8" : ""} ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                      isPreview ? "h-8 w-8 text-xs" : ""
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {index + 1}
                  </span>
                  <p className={`min-w-0 whitespace-normal pt-1.5 font-medium leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"} ${isDark ? "text-slate-100" : "text-slate-800"}`}>
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
            className={`${isPreview ? "rounded-xl p-4" : "rounded-2xl p-6 md:p-8"} ${
              isDark ? "bg-slate-900/80 ring-1 ring-slate-700/60" : "bg-slate-900 text-white shadow-xl"
            }`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
              Credibility & focus
            </p>
            <div className={`mt-5 space-y-4 ${isPreview ? "mt-3 space-y-3" : ""}`}>
              {copy.trustCards.map((stat) => (
                <div key={stat.subtitle} className={`border-b border-white/10 pb-4 last:border-0 last:pb-0`}>
                  <p className={`font-bold ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`} style={{ color: theme.primaryColor }}>
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm md:text-base"} text-slate-300`}>
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

export type CoachFaqSectionProps = CoachSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: CoachTheme;
  isDark: boolean;
};

export function CoachFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  isDark,
}: CoachFaqSectionProps) {
  const muted = coachMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";

  return (
    <section
      className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <h2
        id={`${testIdPrefix}-faq-heading`}
        className={`whitespace-normal font-bold ${isPreview ? "text-base" : "text-2xl md:text-3xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}
        data-testid={`${testIdPrefix}-faq-title`}
      >
        {title}
      </h2>
      <p className={`mt-1 ${isPreview ? "text-[11px]" : "text-sm"} ${muted}`}>Common coaching questions</p>
      <dl className={`mt-5 space-y-4 ${isPreview ? "mt-3 space-y-3" : "md:mt-6"}`}>
        {items.map((item, index) => {
          if (!isFaqItemFilled(item)) {
            return null;
          }

          return (
            <div
              key={`${index}-${item.question}`}
              className={`${isPreview ? "rounded-lg p-3" : "rounded-xl p-5"} ${
                isDark ? "bg-slate-900/70 ring-1 ring-slate-700/50" : "bg-white shadow-sm ring-1 ring-slate-200/70"
              }`}
              data-testid={`${testIdPrefix}-faq-item-${index}`}
            >
              <dt
                className={`whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-base md:text-lg"} ${isDark ? "text-slate-100" : "text-slate-900"}`}
                data-testid={`${testIdPrefix}-faq-item-${index}-question`}
              >
                {item.question}
              </dt>
              <dd
                className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}
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

export type CoachContactSectionProps = CoachSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: CoachTheme;
  isDark: boolean;
};

export function CoachContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: CoachContactSectionProps) {
  const muted = coachMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`grid ${isPreview ? "gap-4 rounded-xl p-4" : "gap-8 rounded-2xl p-6 md:grid-cols-2 md:p-10"} ${
          isDark ? "bg-slate-900/80 ring-1 ring-slate-700/60" : "bg-slate-50 ring-1 ring-slate-200/70"
        }`}
      >
        <div>
          <p className={`font-semibold uppercase tracking-wide ${isPreview ? "text-[10px]" : "text-xs"}`} style={{ color: theme.accentColor }}>
            Connect
          </p>
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`mt-2 whitespace-normal font-bold leading-tight ${isPreview ? "text-base" : "text-2xl md:text-3xl"} ${isDark ? "text-slate-50" : "text-slate-900"}`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {title}
          </h2>
          <p className={`mt-3 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            Ready to begin? Reach out to discuss coaching fit, scheduling, or your goals.
          </p>
        </div>

        <div className="space-y-4">
          {hasPhone ? (
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
              <a
                href={`tel:${contactPhone}`}
                className={`mt-1 inline-block font-bold hover:underline ${isPreview ? "text-lg" : "text-2xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {contactPhone}
              </a>
            </div>
          ) : null}
          {hasAddress ? (
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Location</p>
              <p className={`mt-1 whitespace-normal font-medium ${isPreview ? "text-xs" : "text-base"}`}>{contactAddress}</p>
            </div>
          ) : null}
          {entries.length > 0 ? (
            <div
              className={`flex flex-wrap gap-x-5 gap-y-2 ${isPreview ? "text-[10px]" : "text-sm"}`}
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

export type CoachBookingCtaSectionProps = CoachSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: CoachTheme;
  presentation: MiniSiteTemplatePresentation;
};

export function CoachBookingCtaSection({
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
}: CoachBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;

  return (
    <section className={`${COACH_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`flex flex-col justify-between gap-6 ${isPreview ? "rounded-xl p-4" : "rounded-2xl p-8 md:flex-row md:items-center md:p-10"} ${
          isDark ? "ring-1 ring-slate-700/60" : "shadow-xl ring-1 ring-slate-900/10"
        }`}
        style={{
          background: isDark
            ? `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, ${theme.primaryColor}25 100%)`
            : `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor}dd 100%)`,
        }}
      >
        <div className="min-w-0 text-white">
          <p className={`font-bold leading-tight ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}>
            Start your coaching journey
          </p>
          <p className={`mt-2 max-w-xl ${isPreview ? "text-[11px]" : "text-sm md:text-base"} text-white/85`}>
            Book a session or send an inquiry — your next step is one conversation away.
          </p>
        </div>
        <div className={`flex w-full shrink-0 flex-col ${isPreview ? "gap-2" : "gap-3 sm:min-w-[16rem] sm:flex-row md:w-auto"}`}>
          {renderCtaButton({
            previewButtons,
            label: primaryLabel,
            href: primaryHref,
            className: `${presentation.primaryButtonClass} !bg-white !text-slate-900 hover:!brightness-95`,
            style: {},
            testId: previewButtons ? `${testIdPrefix}-primary-button` : `${testIdPrefix}-booking-cta-link`,
          })}
          {showSecondaryCta
            ? renderCtaButton({
                previewButtons,
                label: secondaryLabel!,
                href: secondaryHref!,
                className: `${presentation.secondaryButtonClass} !border-white/40 !text-white hover:!bg-white/10`,
                style: { backgroundColor: "transparent" },
                testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
              })
            : null}
        </div>
      </div>
    </section>
  );
}

export type CoachGallerySectionProps = CoachSectionShell & {
  theme: CoachTheme;
  isDark: boolean;
};

export function CoachGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: CoachGallerySectionProps) {
  const muted = coachMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`${COACH_CONTAINER} text-center ${isPreview ? "py-4" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`border-2 border-dashed ${isPreview ? "rounded-xl p-4" : "rounded-2xl p-8"}`}
        style={{ borderColor: `${theme.primaryColor}45`, backgroundColor: `${theme.primaryColor}06` }}
      >
        <h2 id={`${testIdPrefix}-gallery-heading`} className={`font-bold ${isPreview ? "text-sm" : "text-lg"}`}>
          Gallery
        </h2>
        <p className={`mx-auto mt-2 max-w-lg whitespace-normal ${isPreview ? "text-xs" : "text-base"} ${muted}`}>
          Photo gallery coming soon. Showcase your coaching environment here.
        </p>
      </div>
    </section>
  );
}
