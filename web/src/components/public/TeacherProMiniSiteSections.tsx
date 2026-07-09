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

export type TeacherSectionVariant = "full" | "preview";

type TeacherSectionShell = {
  variant?: TeacherSectionVariant;
  testIdPrefix?: string;
  previewButtons?: boolean;
};

type TeacherTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
};

const TEACHER_CONTAINER = "mx-auto w-full max-w-[75rem] px-5 sm:px-6 md:px-8 lg:px-10";

function teacherMutedText(isDark: boolean): string {
  return isDark ? "text-slate-300" : "text-slate-600";
}

function teacherPanel(isDark: boolean): string {
  return isDark ? "bg-slate-900/75 text-slate-100" : "bg-white text-slate-900";
}

function buttonRadiusClass(buttonStyle: MiniSiteButtonStyle): string {
  switch (buttonStyle) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-2xl";
  }
}

function heroIntro(mode: OperatingMode): string {
  switch (mode) {
    case "booking_only":
      return "Book a lesson and learn with clear guidance tailored to your goals.";
    case "orders_only":
      return "Send a message to discuss your learning goals and find the right lesson format.";
    default:
      return "Personal lessons and courses designed to help you learn with confidence.";
  }
}

function lessonTypeLabel(service: PublicService): string {
  return service.type === "booking" ? "Bookable lesson" : "Course inquiry";
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

type HighlightCard = {
  key: string;
  label: string;
  title: string;
  detail?: string;
};

function buildHighlightCards({
  copy,
  serviceCount,
}: {
  copy: MiniSiteCopy;
  serviceCount: number | null;
}): HighlightCard[] {
  const benefits = copy.benefitsItems.filter(Boolean);
  const trust = copy.trustCards;

  return [
    {
      key: "lessons",
      label: "Lessons",
      title:
        serviceCount != null && serviceCount > 0
          ? `${serviceCount} option${serviceCount === 1 ? "" : "s"} available`
          : (trust[0]?.title ?? "Flexible scheduling"),
      detail: trust[0]?.subtitle ?? benefits[0],
    },
    {
      key: "approach",
      label: "Learning approach",
      title: benefits[1] ?? trust[1]?.title ?? copy.benefitsSectionTitle,
      detail: trust[1]?.subtitle ?? benefits[2],
    },
    {
      key: "support",
      label: "Student support",
      title: benefits[2] ?? trust[2]?.title ?? "Clear guidance",
      detail: trust[2]?.subtitle ?? trust[0]?.subtitle,
    },
  ];
}

function TeacherLessonCard({
  slug,
  service,
  theme,
  isDark,
  variant,
  index,
}: {
  slug: string;
  service: PublicService;
  theme: TeacherTheme;
  isDark: boolean;
  variant: TeacherSectionVariant;
  index: number;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const descriptionPreview = service.description
    ? service.description.length > (variant === "preview" ? 75 : 130)
      ? `${service.description.slice(0, variant === "preview" ? 75 : 130).trim()}…`
      : service.description
    : null;
  const muted = teacherMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden ${isPreview ? "rounded-xl" : "rounded-2xl lg:rounded-3xl"} ${teacherPanel(isDark)} ${
        isDark ? "ring-1 ring-slate-700/50" : "shadow-md ring-1 ring-slate-200/70"
      }`}
      data-testid="service-card"
    >
      <div className={`flex flex-1 flex-col ${isPreview ? "p-4" : "p-6 md:p-7 lg:p-8"}`}>
        <div className="flex items-start gap-4">
          <div
            className={`flex shrink-0 items-center justify-center font-semibold ${
              isPreview ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg"
            } ${buttonRadiusClass(theme.buttonStyle)}`}
            style={{ backgroundColor: `${theme.primaryColor}12`, color: theme.primaryColor }}
            aria-hidden
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              {lessonTypeLabel(service)}
            </p>
            <h3 className={`mt-1 whitespace-normal font-semibold leading-snug ${isPreview ? "text-sm" : "text-xl md:text-2xl"}`}>
              {service.name}
            </h3>
            {descriptionPreview ? (
              <p className={`mt-2 whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
                {descriptionPreview}
              </p>
            ) : null}
            <div className={`mt-3 flex flex-wrap items-center gap-3 ${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
              <PriceLabel service={service} />
              {duration ? <span>{duration}</span> : null}
            </div>
          </div>
        </div>
        <Link
          to={`/b/${slug}/services/${service.id}`}
          className={`inline-flex w-full items-center justify-center font-semibold text-white transition hover:brightness-105 ${
            isPreview ? "mt-4 rounded-lg py-2 text-xs" : "mt-6 rounded-xl py-3.5 text-sm md:text-base"
          }`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          {serviceActionLabel(service.type)}
        </Link>
      </div>
    </article>
  );
}

export type TeacherHeroSectionProps = TeacherSectionShell & {
  business: PublicBusiness;
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  heroBadgeText: string;
  copy: MiniSiteCopy;
  theme: TeacherTheme;
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
};

export function TeacherHeroSection({
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
}: TeacherHeroSectionProps) {
  const isDark = theme.backgroundStyle === "dark";
  const muted = teacherMutedText(isDark);
  const isPreview = variant === "preview";
  const monogram = business.name.charAt(0).toUpperCase();
  const highlightCards = buildHighlightCards({ copy, serviceCount });
  const previewLessons = (services ?? []).slice(0, 3);
  const outcomeChips = copy.benefitsItems.filter(Boolean).slice(0, 3);

  return (
    <div className={TEACHER_CONTAINER}>
      <header className={isPreview ? "pb-4" : "pb-10 md:pb-12 lg:pb-14"} data-testid={`${testIdPrefix}-hero`}>
        <div
          className={`overflow-hidden ${isPreview ? "rounded-2xl" : "rounded-[1.75rem] lg:rounded-[2rem]"} ${teacherPanel(isDark)} ${
            isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
          }`}
          style={{
            background: isDark
              ? undefined
              : `linear-gradient(145deg, #ffffff 0%, #fffbeb 35%, ${theme.primaryColor}06 100%)`,
          }}
          data-testid={`${testIdPrefix}-teacher-hero`}
        >
          <div
            className={`grid items-center ${isPreview ? "gap-4 p-4" : "gap-8 p-8 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:p-10 lg:p-12"}`}
            data-testid={`${testIdPrefix}-hero-content`}
          >
            <div className={`min-w-0 ${isPreview ? "space-y-2" : "space-y-5 md:space-y-6"}`}>
              <p
                className={`inline-flex w-fit rounded-full px-3 py-1 font-medium ${
                  isPreview ? "text-[10px]" : "text-xs md:text-sm"
                } ${isDark ? "bg-slate-800/80 text-slate-200" : "bg-amber-50 text-amber-900"}`}
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
                  className={`max-w-xl whitespace-normal font-medium leading-relaxed ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}
                  data-testid={`${testIdPrefix}-hero-subtitle`}
                >
                  {heroSubtitle}
                </p>
              ) : (
                <p className={`max-w-xl whitespace-normal ${isPreview ? "text-xs" : "text-lg md:text-xl"} ${muted}`}>
                  {heroIntro(operatingMode)}
                </p>
              )}

              {heroBody ? (
                <p
                  className={`max-w-xl whitespace-normal leading-relaxed ${isPreview ? "text-[11px]" : "text-sm md:text-base lg:text-lg"} ${muted}`}
                  data-testid={`${testIdPrefix}-hero-body`}
                >
                  {heroBody}
                </p>
              ) : null}

              {outcomeChips.length > 0 ? (
                <ul className={`flex flex-wrap gap-2 ${isPreview ? "" : "pt-1"}`}>
                  {outcomeChips.map((chip) => (
                    <li
                      key={chip}
                      className={`rounded-full px-3 py-1 font-medium ${
                        isPreview ? "text-[10px]" : "text-sm"
                      } ${isDark ? "bg-slate-800/70 text-slate-200" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80"}`}
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
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
                      style: { borderColor: theme.accentColor, color: theme.accentColor },
                      testId: previewButtons ? `${testIdPrefix}-secondary-button` : `${testIdPrefix}-request-cta`,
                    })
                  : null}
              </div>
            </div>

            <aside
              className={`${isPreview ? "rounded-xl" : "rounded-2xl lg:rounded-3xl"} ${
                isDark ? "bg-slate-950/90 ring-1 ring-slate-700/60" : "bg-white shadow-md ring-1 ring-slate-200/70"
              }`}
              data-testid={`${testIdPrefix}-teacher-lesson-panel`}
            >
              <div
                className={`border-b ${isDark ? "border-slate-700/60" : "border-slate-100"} ${
                  isPreview ? "px-4 py-3" : "px-6 py-5 lg:px-7 lg:py-6"
                }`}
                style={{
                  background: isDark
                    ? `linear-gradient(90deg, ${theme.primaryColor}18 0%, rgba(15,23,42,0.95) 100%)`
                    : `linear-gradient(90deg, ${theme.primaryColor}08 0%, #fffbeb 100%)`,
                }}
              >
                <p className={`font-semibold ${isPreview ? "text-xs" : "text-lg md:text-xl"}`}>Lesson overview</p>
                <p className={`${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>Courses and sessions from this teacher</p>
              </div>

              <div className={isPreview ? "space-y-3 p-4" : "space-y-4 p-6 lg:p-7"}>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex shrink-0 items-center justify-center font-bold text-white ${
                      isPreview ? "h-12 w-12 text-lg" : "h-16 w-16 text-2xl"
                    } ${buttonRadiusClass(theme.buttonStyle)}`}
                    style={{ backgroundColor: theme.primaryColor }}
                    data-testid={`${testIdPrefix}-logo-placeholder`}
                  >
                    {monogram}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>{business.name}</p>
                    <p className={`${isPreview ? "text-[10px]" : "text-sm"} ${muted}`}>
                      {serviceCount != null && serviceCount > 0
                        ? `${serviceCount} lesson${serviceCount === 1 ? "" : "s"} offered`
                        : "Personal instruction"}
                    </p>
                  </div>
                </div>

                {previewLessons.length > 0 ? (
                  <ul className={`space-y-2 ${isPreview ? "text-[11px]" : "text-sm md:text-base"}`}>
                    {previewLessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className={`rounded-xl px-3 py-2 ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}
                      >
                        <p className={`font-medium ${muted}`}>{lessonTypeLabel(lesson)}</p>
                        <p className="whitespace-normal font-semibold">{lesson.name}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`rounded-xl px-3 py-2 ${isPreview ? "text-[10px]" : "text-sm"} ${muted} ${
                    isDark ? "bg-slate-900/80" : "bg-slate-50"
                  }`}>
                    Lesson details appear here when services are added.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div
          className={`mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 ${isPreview ? "mt-3 gap-2" : "lg:mt-8 lg:gap-5"}`}
          data-testid={`${testIdPrefix}-teacher-highlights`}
        >
          {highlightCards.map((card) => (
            <div
              key={card.key}
              className={`${isPreview ? "rounded-xl p-3" : "rounded-2xl p-5 md:p-6"} ${
                isDark ? "bg-slate-900/70 ring-1 ring-slate-700/50" : "bg-white shadow-sm ring-1 ring-slate-200/70"
              }`}
            >
              <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
                {card.label}
              </p>
              <p className={`mt-1 whitespace-normal font-semibold leading-snug ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>
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

export type TeacherAboutSectionProps = TeacherSectionShell & {
  title: string;
  body: string | null;
  fallbackBody: string | null;
  theme: TeacherTheme;
  isDark: boolean;
};

export function TeacherAboutSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  body,
  fallbackBody,
  theme,
  isDark,
}: TeacherAboutSectionProps) {
  const muted = teacherMutedText(isDark);
  const content = body || fallbackBody;
  const isPreview = variant === "preview";

  return (
    <section className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`} data-testid={`${testIdPrefix}-about`}>
      <div
        className={`${isPreview ? "rounded-xl p-4" : "rounded-[1.75rem] p-8 md:p-10 lg:p-12"} ${
          isDark ? "bg-slate-900/70 ring-1 ring-slate-700/50" : "shadow-md ring-1 ring-slate-200/70"
        }`}
        style={{
          background: isDark
            ? undefined
            : `linear-gradient(135deg, #ffffff 0%, ${theme.primaryColor}05 55%, #fffbeb 100%)`,
        }}
      >
        <p
          className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`}
          style={{ color: theme.accentColor }}
          data-testid={`${testIdPrefix}-about-title`}
        >
          About the lessons
        </p>
        <h2 className={`mt-2 whitespace-normal font-semibold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}>
          {title}
        </h2>
        {content ? (
          <p
            className={`mt-4 max-w-3xl whitespace-normal leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg lg:text-xl"} ${muted}`}
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

export type TeacherLessonsSectionProps = TeacherSectionShell & {
  title: string;
  badgeText: string | null;
  services: PublicService[] | undefined;
  publicSlug: string;
  theme: TeacherTheme;
  isDark: boolean;
};

export function TeacherLessonsSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  badgeText,
  services,
  publicSlug,
  theme,
  isDark,
}: TeacherLessonsSectionProps) {
  const muted = teacherMutedText(isDark);
  const isPreview = variant === "preview";
  const sectionTitle = title || "Lessons & courses";

  return (
    <section
      className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-services-heading`}
      data-testid={`${testIdPrefix}-services`}
    >
      <div data-testid={`${testIdPrefix}-teacher-lessons`}>
        <div className={`flex flex-wrap items-end justify-between gap-4 ${isPreview ? "mb-4" : "mb-8"}`}>
          <div>
            <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Lessons & courses
            </p>
            <h2
              id={`${testIdPrefix}-services-heading`}
              className={`mt-2 whitespace-normal font-semibold leading-tight ${isPreview ? "text-lg" : "text-3xl md:text-4xl"}`}
              data-testid={`${testIdPrefix}-services-title`}
            >
              {sectionTitle}
            </h2>
            <p className={`mt-2 max-w-2xl whitespace-normal ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
              Choose a lesson or course and book your next session.
            </p>
          </div>
          {badgeText ? (
            <span
              className={`rounded-full px-3 py-1 font-medium ${isPreview ? "text-[10px]" : "text-sm"} ${
                isDark ? "bg-slate-800/70 text-slate-200" : "bg-amber-50 text-amber-900"
              }`}
              data-testid={`${testIdPrefix}-services-badge`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>

        {services && services.length > 0 ? (
          <div className={`grid gap-4 ${isPreview ? "" : "md:grid-cols-2 md:gap-6 lg:gap-8"}`}>
            {services.map((service, index) => (
              <TeacherLessonCard
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
          <TeacherLessonCard
            slug=""
            service={{
              id: "preview-sample",
              name: "Intro lesson",
              description: "Your lessons and courses appear here on the live page.",
              type: "booking",
              price_cents: 4500,
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
            Lessons will appear here.{" "}
            <Link to={`/b/${publicSlug}/services`} className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
              View lessons
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export type TeacherLearningSectionProps = TeacherSectionShell & {
  copy: MiniSiteCopy;
  theme: TeacherTheme;
  isDark: boolean;
  showTrustStats: boolean;
  showBenefitsStrip: boolean;
  benefitsSectionEnabled: boolean;
};

export function TeacherLearningSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  copy,
  theme,
  isDark,
  showTrustStats,
  showBenefitsStrip,
  benefitsSectionEnabled,
}: TeacherLearningSectionProps) {
  const muted = teacherMutedText(isDark);
  const benefits = showBenefitsStrip && !benefitsSectionEnabled ? copy.benefitsItems.filter(Boolean) : [];
  const isPreview = variant === "preview";

  if (benefits.length === 0 && !showTrustStats) {
    return null;
  }

  return (
    <section className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`} data-testid={`${testIdPrefix}-trust`}>
      <div data-testid={`${testIdPrefix}-teacher-learning`} className={`grid ${isPreview ? "gap-4" : "gap-8 lg:grid-cols-2 lg:gap-10"}`}>
        {benefits.length > 0 ? (
          <div
            className={`${isPreview ? "rounded-xl p-4" : "rounded-2xl p-6 md:p-8 lg:p-10"} ${teacherPanel(isDark)} ${
              isDark ? "ring-1 ring-slate-700/50" : "shadow-sm ring-1 ring-slate-200/70"
            }`}
            data-testid={`${testIdPrefix}-benefits-strip`}
          >
            <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Learning outcomes
            </p>
            <h2 className={`mt-2 font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl"}`}>How learning works</h2>
            <ol className={`mt-5 space-y-4 ${isPreview ? "mt-3 space-y-3" : "lg:mt-6 lg:space-y-5"}`}>
              {benefits.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                      isPreview ? "h-7 w-7 text-xs" : "h-9 w-9"
                    }`}
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {index + 1}
                  </span>
                  <p className={`min-w-0 whitespace-normal pt-1 leading-relaxed ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>
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
            className={`${isPreview ? "rounded-xl p-4" : "rounded-2xl p-6 md:p-8 lg:p-10"} ${teacherPanel(isDark)} ${
              isDark ? "ring-1 ring-slate-700/50" : "shadow-sm ring-1 ring-slate-200/70"
            }`}
            data-testid={`${testIdPrefix}-trust-stats`}
          >
            <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
              Why students choose these lessons
            </p>
            <div className={`mt-5 grid gap-4 ${isPreview ? "mt-3" : "md:mt-6"}`}>
              {copy.trustCards.map((stat) => (
                <div
                  key={stat.subtitle}
                  className={`rounded-xl ${isPreview ? "p-3" : "p-4 md:p-5"} ${
                    isDark ? "bg-slate-950/60" : "bg-slate-50"
                  }`}
                >
                  <p className={`font-semibold ${isPreview ? "text-base" : "text-xl md:text-2xl"}`} style={{ color: theme.primaryColor }}>
                    {stat.title}
                  </p>
                  <p className={`mt-1 whitespace-normal ${isPreview ? "text-[10px]" : "text-sm md:text-base"} ${muted}`}>
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

export type TeacherFaqSectionProps = TeacherSectionShell & {
  title: string;
  faqItems: MiniSiteCopy["faqItems"];
  theme: TeacherTheme;
  isDark: boolean;
};

export function TeacherFaqSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  faqItems,
  theme,
  isDark,
}: TeacherFaqSectionProps) {
  const muted = teacherMutedText(isDark);
  const items = faqItems ?? [];
  const isPreview = variant === "preview";

  return (
    <section
      className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-faq-heading`}
      data-testid={`${testIdPrefix}-faq`}
    >
      <div className={`${isPreview ? "rounded-xl p-4" : "rounded-2xl p-6 md:p-8 lg:p-10"} ${teacherPanel(isDark)} ${
        isDark ? "ring-1 ring-slate-700/50" : "shadow-sm ring-1 ring-slate-200/70"
      }`}>
        <h2
          id={`${testIdPrefix}-faq-heading`}
          className={`whitespace-normal font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl"}`}
          data-testid={`${testIdPrefix}-faq-title`}
        >
          {title}
        </h2>
        <p className={`mt-2 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>Common student questions</p>
        <dl className={`mt-5 divide-y ${isDark ? "divide-slate-700/60" : "divide-slate-200/80"} ${isPreview ? "mt-3" : "lg:mt-6"}`}>
          {items.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={`py-4 ${isPreview ? "py-3" : "lg:py-5"}`}
                data-testid={`${testIdPrefix}-faq-item-${index}`}
              >
                <dt
                  className={`flex gap-3 whitespace-normal font-semibold ${isPreview ? "text-xs" : "text-base md:text-lg"}`}
                  data-testid={`${testIdPrefix}-faq-item-${index}-question`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                      isPreview ? "h-5 w-5 text-[10px]" : ""
                    }`}
                    style={{ backgroundColor: theme.accentColor }}
                    aria-hidden
                  >
                    ?
                  </span>
                  {item.question}
                </dt>
                <dd
                  className={`mt-2 whitespace-normal leading-relaxed pl-9 ${isPreview ? "text-[11px] pl-8" : "text-sm md:text-base"} ${muted}`}
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

export type TeacherContactSectionProps = TeacherSectionShell & {
  title: string;
  contactAddress: string;
  contactPhone: string;
  socialLinks: MiniSiteSocialLinks;
  theme: TeacherTheme;
  isDark: boolean;
};

export function TeacherContactSection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  title,
  contactAddress,
  contactPhone,
  socialLinks,
  theme,
  isDark,
}: TeacherContactSectionProps) {
  const muted = teacherMutedText(isDark);
  const entries = getVisibleSocialLinks(socialLinks);
  const hasAddress = hasMeaningfulText(contactAddress);
  const hasPhone = hasMeaningfulText(contactPhone);
  const isPreview = variant === "preview";

  if (!hasAddress && !hasPhone && entries.length === 0) {
    return null;
  }

  return (
    <section
      className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`}
      aria-labelledby={`${testIdPrefix}-contact-heading`}
      data-testid={`${testIdPrefix}-contact`}
    >
      <div
        className={`grid ${isPreview ? "gap-4 rounded-xl p-4" : "gap-8 rounded-2xl p-6 md:grid-cols-2 md:p-10 lg:gap-10"} ${teacherPanel(isDark)} ${
          isDark ? "ring-1 ring-slate-700/50" : "shadow-md ring-1 ring-slate-200/70"
        }`}
      >
        <div>
          <p className={`font-medium ${isPreview ? "text-[10px]" : "text-xs md:text-sm"}`} style={{ color: theme.accentColor }}>
            Get in touch
          </p>
          <h2
            id={`${testIdPrefix}-contact-heading`}
            className={`mt-2 whitespace-normal font-semibold leading-tight ${isPreview ? "text-base" : "text-3xl md:text-4xl"}`}
            data-testid={`${testIdPrefix}-contact-title`}
          >
            {title}
          </h2>
          <p className={`mt-3 ${isPreview ? "text-[11px]" : "text-sm md:text-base"} ${muted}`}>
            Questions about lessons, scheduling, or course fit? Reach out to start learning.
          </p>
        </div>

        <div className={`space-y-4 ${isPreview ? "space-y-2" : ""}`}>
          {hasPhone ? (
            <div className={`rounded-xl ${isPreview ? "p-3" : "p-4 md:p-5"} ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Phone</p>
              <a
                href={`tel:${contactPhone}`}
                className={`mt-1 inline-block font-semibold hover:underline ${isPreview ? "text-lg" : "text-2xl md:text-3xl"}`}
                style={{ color: theme.primaryColor }}
              >
                {contactPhone}
              </a>
            </div>
          ) : null}
          {hasAddress ? (
            <div className={`rounded-xl ${isPreview ? "p-3" : "p-4 md:p-5"} ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Location</p>
              <p className={`mt-1 whitespace-normal font-medium ${isPreview ? "text-xs" : "text-base md:text-lg"}`}>{contactAddress}</p>
            </div>
          ) : null}
          {entries.length > 0 ? (
            <div
              className={`flex flex-wrap gap-x-5 gap-y-2 ${isPreview ? "text-[10px]" : "text-sm md:text-base"}`}
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

export type TeacherBookingCtaSectionProps = TeacherSectionShell & {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
  theme: TeacherTheme;
  presentation: MiniSiteTemplatePresentation;
};

export function TeacherBookingCtaSection({
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
}: TeacherBookingCtaSectionProps) {
  const isPreview = variant === "preview";
  const isDark = theme.backgroundStyle === "dark";
  const showSecondaryCta = showSecondary && hasMeaningfulText(secondaryLabel ?? "") && secondaryHref;

  return (
    <section className={`${TEACHER_CONTAINER} ${isPreview ? "py-4" : "py-10 md:py-14 lg:py-16"}`} data-testid={`${testIdPrefix}-booking-cta-section`}>
      <div
        className={`flex flex-col justify-between gap-6 ${isPreview ? "rounded-xl p-4" : "rounded-2xl p-8 md:flex-row md:items-center md:p-10 lg:p-12"} ${
          isDark ? "ring-1 ring-slate-700/50" : "shadow-lg ring-1 ring-slate-200/60"
        }`}
        style={{
          background: isDark
            ? `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, ${theme.primaryColor}18 100%)`
            : `linear-gradient(135deg, #ffffff 0%, ${theme.primaryColor}08 50%, #fffbeb 100%)`,
        }}
      >
        <div className="min-w-0">
          <p className={`font-semibold ${isPreview ? "text-base" : "text-2xl md:text-3xl lg:text-4xl"}`}>Ready to start learning?</p>
          <p className={`mt-2 max-w-xl ${isPreview ? "text-[11px]" : "text-sm md:text-base lg:text-lg"} ${teacherMutedText(isDark)}`}>
            Book your first lesson or send a question — learning starts with a simple next step.
          </p>
        </div>
        <div className={`flex w-full shrink-0 flex-col ${isPreview ? "gap-2" : "gap-3 sm:min-w-[16rem] sm:flex-row md:w-auto"}`}>
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

export type TeacherGallerySectionProps = TeacherSectionShell & {
  theme: TeacherTheme;
  isDark: boolean;
};

export function TeacherGallerySection({
  variant = "full",
  testIdPrefix = "pro-mini-site",
  theme,
  isDark,
}: TeacherGallerySectionProps) {
  const muted = teacherMutedText(isDark);
  const isPreview = variant === "preview";

  return (
    <section
      className={`${TEACHER_CONTAINER} text-center ${isPreview ? "py-4" : "py-8 md:py-10"}`}
      aria-labelledby={`${testIdPrefix}-gallery-heading`}
      data-testid={`${testIdPrefix}-gallery-placeholder`}
    >
      <div
        className={`border-2 border-dashed ${isPreview ? "rounded-xl p-4" : "rounded-2xl p-8 md:p-10"}`}
        style={{ borderColor: `${theme.primaryColor}40`, backgroundColor: `${theme.primaryColor}06` }}
      >
        <h2 id={`${testIdPrefix}-gallery-heading`} className={`font-semibold ${isPreview ? "text-sm" : "text-lg md:text-xl"}`}>
          Gallery
        </h2>
        <p className={`mx-auto mt-2 max-w-lg whitespace-normal ${isPreview ? "text-xs" : "text-base"} ${muted}`}>
          Photo gallery coming soon. Showcase your teaching space or materials here.
        </p>
      </div>
    </section>
  );
}
