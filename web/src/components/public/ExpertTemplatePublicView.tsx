import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import { ServiceCardImageArea } from "@/components/ServiceImageDisplay";
import { TypeBadge } from "@/components/TypeBadge";
import { MiniSiteSectionAccentImage } from "@/components/public/MiniSiteSectionAccentImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import { getVisibleSocialLinks } from "@/lib/miniSiteConfig";
import { getTemplateImageSlots } from "@/lib/miniSiteMedia";
import { getTemplateVideoSlots, isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";
import {
  getEnabledExpertSections,
  orderExpertServices,
  resolveExpertPresetVisuals,
  getExpertTemplateContent,
  buildExpertTypographyCss,
  buildExpertTypographyCssVars,
  resolveExpertTypography,
  tokenTextClass,
} from "@/lib/expertTemplateConfig";
import { formatPublicLocationDisplay } from "@/lib/publicLocation";
import { formatDuration } from "@/utils/format";
import type {
  PublicBusiness,
  PublicReviewItem,
  PublicReviewSummary,
  PublicService,
} from "@/types/api";
import type { MiniSiteConfig } from "@/types/miniSite";
import type { ExpertArticleItem, ExpertCtaAction, ExpertWorkItem } from "@/types/expertTemplate";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";

export type ExpertPreviewDevice = "desktop" | "tablet" | "mobile";

export type ExpertTemplatePublicViewProps = {
  business: PublicBusiness;
  publicSlug: string;
  services?: PublicService[];
  config: MiniSiteConfig;
  reviews?: PublicReviewItem[];
  reviewSummary?: PublicReviewSummary | null;
  variant?: "full" | "preview";
  /** Admin live-preview device frame — overrides viewport breakpoints inside narrow frames. */
  previewDevice?: ExpertPreviewDevice;
  testIdPrefix?: string;
};

function buttonRadius(style: MiniSiteConfig["theme"]["buttonStyle"]) {
  return style === "pill" ? "rounded-full" : style === "square" ? "rounded-none" : "rounded-2xl";
}

function whatsappHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://wa.me/${value.replace(/\D/g, "")}`;
}

/** Pick grid classes for public page vs fixed admin preview frames. */
function deviceGrid(
  previewDevice: ExpertPreviewDevice | undefined,
  layouts: { mobile: string; tablet: string; desktop: string; responsive: string },
): string {
  if (previewDevice === "mobile") return layouts.mobile;
  if (previewDevice === "tablet") return layouts.tablet;
  if (previewDevice === "desktop") return layouts.desktop;
  return layouts.responsive;
}

function ExpertIntroVideoBlock({
  media,
  variant,
  testId,
  primaryColor,
  surfaceMode,
}: {
  media: MiniSiteVideoMedia;
  variant: "full" | "preview";
  testId: string;
  primaryColor: string;
  surfaceMode: "light" | "dark";
}) {
  const [playing, setPlaying] = useState(false);
  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) return null;

  if (playing) {
    return (
      <div className="mt-8 max-w-xl" data-testid={testId}>
        <MiniSiteVideoEmbed media={media} variant={variant} testId={`${testId}-embed`} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`mt-8 inline-flex max-w-full items-center gap-3 rounded-full border px-5 py-3.5 text-left text-sm font-semibold shadow-md transition ${
        surfaceMode === "dark"
          ? "border-white/25 bg-white/12 text-white hover:bg-white/20"
          : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50"
      }`}
      data-testid={testId}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      >
        ▶
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">
          Watch intro
        </span>
        <span className="block truncate">{media.title || "Play introduction video"}</span>
      </span>
    </button>
  );
}

function SimpleContentModal({
  open,
  title,
  onClose,
  children,
  testId,
  disabled,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId: string;
  disabled?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!disabled) onClose();
      }}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-200"
            onClick={() => {
              if (!disabled) onClose();
            }}
            disabled={disabled}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4 text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function ProfilePortraitFallback({
  name,
  primaryColor,
  accentColor,
  className = "",
  testId,
}: {
  name: string;
  primaryColor: string;
  accentColor: string;
  className?: string;
  testId?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.charAt(0) || "E";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(155deg, ${primaryColor}42 0%, ${accentColor}38 42%, ${primaryColor}22 100%)`,
      }}
      data-testid={testId}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `radial-gradient(circle at 22% 18%, ${accentColor}66, transparent 42%), radial-gradient(circle at 82% 78%, ${primaryColor}50, transparent 44%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-30"
        style={{ backgroundColor: accentColor }}
      />
      <span
        className="relative z-[1] flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-xl ring-4 ring-white/25 sm:h-28 sm:w-28 sm:text-4xl"
        style={{ backgroundColor: primaryColor }}
      >
        {initials}
      </span>
    </div>
  );
}

const ARTICLE_TYPE_LABELS: Record<ExpertArticleItem["type"], string> = {
  article: "Article",
  publication: "Publication",
  media: "Media",
  research: "Research",
  guide: "Guide",
};

function brandedCoverFallback({
  title,
  primaryColor,
  accentColor,
  aspectClass,
  testId,
  buttonTextClass,
}: {
  title: string;
  primaryColor: string;
  accentColor: string;
  aspectClass: string;
  testId: string;
  buttonTextClass: string;
}) {
  return (
    <div
      className={`relative flex ${aspectClass} w-full items-end overflow-hidden`}
      style={{
        background: `linear-gradient(145deg, ${primaryColor}32, ${accentColor}48 55%, ${primaryColor}1a)`,
      }}
      aria-hidden="true"
      data-testid={testId}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 20%, ${accentColor}55, transparent 40%), radial-gradient(circle at 88% 75%, ${primaryColor}40, transparent 45%)`,
        }}
      />
      <div className="relative z-[1] flex w-full items-center gap-3 p-4 sm:p-5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-md ${buttonTextClass}`}
          style={{ backgroundColor: primaryColor }}
        >
          {title.charAt(0)}
        </span>
        <span className="line-clamp-2 min-w-0 text-sm font-semibold text-white/95 drop-shadow-sm">
          {title}
        </span>
      </div>
    </div>
  );
}

export function ExpertTemplatePublicView({
  business,
  publicSlug,
  services,
  config,
  reviews = [],
  reviewSummary = null,
  variant = "full",
  previewDevice,
  testIdPrefix = "expert-site",
}: ExpertTemplatePublicViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [articleModal, setArticleModal] = useState<ExpertArticleItem | null>(null);
  const [workModal, setWorkModal] = useState<ExpertWorkItem | null>(null);

  const content = getExpertTemplateContent(config);
  const { theme, socialLinks } = config;
  const visuals = resolveExpertPresetVisuals(content.themePreset, theme.backgroundStyle);
  const typography = resolveExpertTypography(content.typography);
  const typographyRootId = `${testIdPrefix}-root`;
  const isDarkPage = visuals.surfaceMode === "dark";
  const images = getTemplateImageSlots(config.templateMedia, "expert");
  const videos = getTemplateVideoSlots(config.templateMedia, "expert");
  const introVideo = videos.introVideo ?? null;
  const visibleSections = getEnabledExpertSections(content);
  const orderedServices = orderExpertServices(services ?? [], content.services.selectedServiceIds);
  const isPreview = variant === "preview";
  const radius = buttonRadius(theme.buttonStyle);
  const heroIsLight = visuals.heroText.includes("slate-900") || visuals.heroText.includes("stone-900");
  const heroTextClass = tokenTextClass(typography.heroHeadingColor, visuals.heroText);
  const heroMutedClass = tokenTextClass(typography.heroBodyColor, visuals.heroMutedText);
  const bodyTextClass = tokenTextClass(typography.bodyColor, visuals.bodyText);
  const sectionHeadingClass = tokenTextClass(typography.headingColor, visuals.bodyText);
  const mutedTextClass = typography.mutedColor
    ? "service-typo-muted"
    : `${visuals.mutedText} service-typo-muted`;
  const cardTitleClass = typography.cardTextColor
    ? "min-w-0 break-words service-typo-card"
    : `${visuals.cardText} min-w-0 break-words service-typo-card`;
  const mutedStyle: CSSProperties | undefined = typography.mutedColor
    ? { color: typography.mutedColor }
    : undefined;
  const headingStyle: CSSProperties = {
    fontFamily: typography.headingFontFamily,
    fontWeight: typography.headingWeight,
    ...(typography.headingColor ? { color: typography.headingColor } : {}),
  };
  const cardTextStyle: CSSProperties | undefined = typography.cardTextColor
    ? { color: typography.cardTextColor }
    : undefined;
  const ghostButtonClass = visuals.secondaryButtonBg;
  const phone = business.contact_phone?.trim() || "";
  const location = formatPublicLocationDisplay(business);
  const whatsapp = getVisibleSocialLinks(socialLinks).find((entry) => entry.key === "whatsapp")?.value;
  const servicesHref = `/b/${publicSlug}/services`;
  const firstBooking =
    orderedServices.find((service) => service.type === "booking") ??
    services?.find((service) => service.type === "booking");
  const firstOrder =
    orderedServices.find((service) => service.type === "order") ??
    services?.find((service) => service.type === "order");

  const actionHref = (action: ExpertCtaAction) => {
    if (action === "booking") {
      return firstBooking ? `/b/${publicSlug}/services/${firstBooking.id}` : servicesHref;
    }
    if (action === "request") {
      return firstOrder ? `/b/${publicSlug}/services/${firstOrder.id}/request` : servicesHref;
    }
    if (action === "call") return phone ? `tel:${phone}` : servicesHref;
    if (action === "whatsapp") return whatsapp ? whatsappHref(whatsapp) : servicesHref;
    return servicesHref;
  };

  const isMobileFrame = previewDevice === "mobile";
  const ctaWidthClass = isMobileFrame || !previewDevice ? "w-full sm:w-auto" : "";

  const renderAction = (
    label: string,
    action: ExpertCtaAction,
    primary = true,
    testId?: string,
    secondaryClass = ghostButtonClass,
  ) => {
    if (!label.trim()) return null;
    const href = actionHref(action);
    const className = `${radius} ${ctaWidthClass} inline-flex min-h-[48px] items-center justify-center px-6 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      primary
        ? `${tokenTextClass(typography.buttonTextColor, visuals.primaryButtonText)} shadow-lg shadow-black/10 hover:brightness-110`
        : secondaryClass
    }`;
    const style: CSSProperties = {
      fontFamily: typography.buttonFontFamily,
      fontWeight: typography.buttonWeight,
      ...(primary
        ? {
            backgroundColor: theme.primaryColor,
            ...(typography.buttonTextColor ? { color: typography.buttonTextColor } : {}),
          }
        : typography.buttonTextColor
          ? { color: typography.buttonTextColor }
          : {}),
    };
    if (isPreview) {
      return (
        <button
          type="button"
          disabled
          className={className}
          style={style}
          data-testid={testId}
          data-service-button="true"
        >
          {label}
        </button>
      );
    }
    if (href.startsWith("tel:") || href.startsWith("http")) {
      return (
        <a
          href={href}
          className={className}
          style={style}
          data-testid={testId}
          data-service-button="true"
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        to={href}
        className={className}
        style={style}
        data-testid={testId}
        data-service-button="true"
      >
        {label}
      </Link>
    );
  };

  const visibleArticles = content.articles.items.filter((item) => item.visible !== false);
  const featuredArticles = visibleArticles.filter((item) => item.featured);
  const regularArticles = visibleArticles.filter((item) => !item.featured);
  const visibleWorks = content.works.items.filter((item) => item.visible !== false);
  const visibleExpertise = content.expertise.items.filter((item) => item.visible !== false);

  const approvedCards =
    content.testimonials.source === "manual"
      ? []
      : reviews
          .filter((review) => review.comment)
          .map((review) => ({
            kind: "approved" as const,
            id: review.id,
            name: review.customer_name,
            role: review.service_name || "",
            quote: review.comment || "",
            rating: review.rating,
            initials: review.customer_name.charAt(0).toUpperCase() || "C",
            avatarUrl: "",
            date: "",
          }));

  const manualCards =
    content.testimonials.source === "approved"
      ? []
      : content.testimonials.items
          .filter((item) => item.visible !== false && item.quote)
          .map((item) => ({
            kind: "manual" as const,
            id: item.id,
            name: item.name,
            role: item.role,
            quote: item.quote,
            rating: item.rating,
            initials: item.avatarInitials || item.name.charAt(0).toUpperCase() || "C",
            avatarUrl: item.avatarUrl?.trim() || "",
            date: item.date || "",
          }));

  const testimonialCards = [...approvedCards, ...manualCards].slice(
    0,
    content.testimonials.maxCount,
  );

  const averageRating = reviewSummary?.average_rating ?? business.average_rating ?? null;
  const sectionClass = isPreview
    ? "px-4 py-8"
    : "px-5 py-14 sm:px-6 md:px-10 md:py-20 lg:py-24";
  const maxClass = isPreview ? "mx-auto max-w-5xl" : "mx-auto max-w-6xl";
  const cardSurface = `${visuals.cardClass} shadow-sm ring-1 ring-black/[0.035]`;
  const elevatedCard = `${cardSurface} transition duration-300 hover:-translate-y-0.5 hover:shadow-md`;
  const chipClass = isDarkPage
    ? "rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
    : "rounded-full border border-black/[0.06] bg-black/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  const emptyStateClass = `mt-8 max-w-md rounded-2xl border border-dashed px-5 py-5 text-left sm:px-6 ${
    isDarkPage ? "border-slate-600/70 bg-white/[0.03]" : "border-slate-300/90 bg-slate-50/50"
  }`;
  const contentLinkClass = `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition hover:opacity-90 ${
    isDarkPage ? "border-white/15 bg-white/5" : "border-black/[0.08] bg-white/80"
  }`;

  const previewLink = (label: string, href: string, className = "") =>
    isPreview ? (
      <span className={className}>{label}</span>
    ) : (
      <a href={href} className={className}>
        {label}
      </a>
    );

  const navLinks = [
    { id: "about", label: "About" },
    { id: "services", label: "Services" },
    { id: "expertise", label: "Expertise" },
    { id: "process", label: "Process" },
    { id: "results", label: "Results" },
    { id: "articles", label: "Articles" },
    { id: "works", label: "Works" },
    { id: "testimonials", label: "Reviews" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact" },
  ].filter((link) => visibleSections.includes(link.id as (typeof visibleSections)[number]));

  const openArticle = (article: ExpertArticleItem) => {
    if (isPreview) return;
    if (article.externalUrl.trim()) return;
    setArticleModal(article);
  };

  const openWork = (work: ExpertWorkItem) => {
    if (isPreview) return;
    if (work.linkUrl.trim()) return;
    setWorkModal(work);
  };

  const renderSection = (id: (typeof visibleSections)[number]) => {
    switch (id) {
      case "hero":
        return (
          <header
            id="top"
            className={`relative overflow-hidden ${visuals.heroClass}`}
            data-testid={`${testIdPrefix}-hero`}
          >
            {images.heroImage ? (
              <>
                <div className="absolute inset-0 opacity-35">
                  <MiniSiteSectionAccentImage
                    media={images.heroImage}
                    variant={variant}
                    testId={`${testIdPrefix}-template-heroImage`}
                    tone="expert"
                    layout="banner"
                    className="h-full border-0 bg-transparent [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-center"
                  />
                </div>
                <div
                  className={`absolute inset-0 ${
                    heroIsLight
                      ? "bg-gradient-to-r from-white via-white/92 to-white/60"
                      : "bg-gradient-to-r from-slate-950/92 via-slate-950/75 to-slate-950/30"
                  }`}
                  data-testid={`${testIdPrefix}-hero-overlay`}
                  aria-hidden="true"
                />
              </>
            ) : null}
            <div
              className={`relative ${maxClass} ${
                isPreview
                  ? "p-5"
                  : "px-5 pb-16 pt-5 sm:px-6 sm:pb-20 md:px-10 md:pb-28 md:pt-7"
              }`}
            >
              <div
                className={`flex items-center justify-between gap-4 border-b pb-4 md:pb-5 ${
                  heroIsLight ? "border-slate-900/10" : "border-white/15"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt=""
                      className="h-11 w-11 rounded-xl object-cover shadow-sm"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${visuals.primaryButtonText}`}
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {business.name.charAt(0)}
                    </span>
                  )}
                  <span className={`truncate text-base font-bold md:text-lg ${heroTextClass}`}>
                    {business.name}
                  </span>
                </div>
                {!isPreview ? (
                  <nav
                    className={`hidden items-center gap-5 text-sm font-semibold xl:flex ${
                      heroIsLight ? "text-slate-700" : "text-white/80"
                    }`}
                    aria-label="Main navigation"
                  >
                    {navLinks.slice(0, 6).map((link) => (
                      <a key={link.id} href={`#${link.id}`} className="transition hover:opacity-70">
                        {link.label}
                      </a>
                    ))}
                  </nav>
                ) : null}
              </div>

              <div
                className={`mt-10 grid items-center gap-10 sm:mt-12 md:mt-14 md:gap-14 ${deviceGrid(
                  previewDevice,
                  {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-[1.1fr_0.9fr]",
                    desktop: "grid-cols-[1.15fr_0.85fr]",
                    responsive: "grid-cols-1 md:grid-cols-[1.15fr_0.85fr]",
                  },
                )}`}
              >
                <div className="min-w-0">
                  <p
                    className="text-xs font-bold uppercase tracking-[0.22em]"
                    style={{ color: theme.primaryColor }}
                    data-testid={`${testIdPrefix}-hero-badge`}
                  >
                    {content.hero.eyebrow || config.copy.heroBadgeText}
                  </p>
                  {content.hero.professionalTitle ? (
                    <p className={`mt-3 text-sm font-semibold ${heroMutedClass}`}>
                      {content.hero.professionalTitle}
                    </p>
                  ) : null}
                  <h1
                    className={`service-typo-heading mt-3 max-w-3xl text-[clamp(1.65rem,4.4vw,3.5rem)] font-black leading-[1.12] tracking-tight break-words ${heroTextClass}`}
                    data-testid={`${testIdPrefix}-hero-title`}
                    data-service-hero-heading="true"
                    style={{
                      fontFamily: typography.headingFontFamily,
                      fontWeight: typography.headingWeight,
                      ...(typography.heroHeadingColor
                        ? { color: typography.heroHeadingColor }
                        : {}),
                    }}
                  >
                    {content.hero.headline}{" "}
                    <span
                      className="service-typo-accent"
                      data-service-accent-text="true"
                      data-testid={`${testIdPrefix}-hero-accent`}
                      style={{
                        color: typography.accentTextColor ?? theme.primaryColor,
                      }}
                    >
                      {content.hero.headlineHighlight}
                    </span>
                  </h1>
                  <p
                    className={`mt-5 max-w-xl text-base leading-relaxed sm:mt-6 md:text-lg ${heroMutedClass}`}
                    data-testid={`${testIdPrefix}-hero-subtitle`}
                    data-service-hero-body="true"
                    style={
                      typography.heroBodyColor ? { color: typography.heroBodyColor } : undefined
                    }
                  >
                    {content.hero.subtitle}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-2 sm:mt-8">
                    {content.hero.trustBadges.map((badge) => (
                      <span
                        key={badge}
                        className={`${radius} inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-semibold shadow-sm backdrop-blur-md ${
                          typography.mutedColor || typography.bodyColor
                            ? heroIsLight
                              ? "border-slate-900/10 bg-white/90"
                              : "border-white/20 bg-white/12"
                            : heroIsLight
                              ? "border-slate-900/10 bg-white/90 text-slate-700"
                              : "border-white/20 bg-white/12 text-white"
                        }`}
                        style={
                          typography.mutedColor
                            ? { color: typography.mutedColor }
                            : typography.bodyColor
                              ? { color: typography.bodyColor }
                              : undefined
                        }
                        data-testid={`${testIdPrefix}-trust-badge`}
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black text-white"
                          style={{ backgroundColor: theme.primaryColor }}
                          aria-hidden
                        >
                          ✓
                        </span>
                        {badge}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
                    {renderAction(
                      content.hero.primaryCtaLabel,
                      content.hero.primaryCtaAction,
                      true,
                      `${testIdPrefix}-book-cta`,
                    )}
                    {renderAction(
                      content.hero.secondaryCtaLabel,
                      content.hero.secondaryCtaAction,
                      false,
                      `${testIdPrefix}-secondary-cta`,
                    )}
                    {content.hero.showCallButton && phone
                      ? renderAction("Call", "call", false)
                      : null}
                    {content.hero.showWhatsappButton && whatsapp
                      ? renderAction("WhatsApp", "whatsapp", false)
                      : null}
                  </div>
                  {averageRating ? (
                    <p className={`mt-6 text-sm sm:mt-7 ${heroMutedClass}`}>
                      ★ {averageRating.toFixed(1)} rating
                    </p>
                  ) : null}
                  {content.hero.stats.length ? (
                    <div
                      className={`mt-9 grid max-w-2xl gap-3 ${deviceGrid(previewDevice, {
                        mobile: "grid-cols-2",
                        tablet: "grid-cols-4",
                        desktop: "grid-cols-4",
                        responsive: "grid-cols-2 md:grid-cols-4",
                      })}`}
                    >
                      {content.hero.stats.map((stat) => (
                        <div
                          key={stat.id}
                          className={`border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${radius} ${visuals.statsClass} ${
                            heroIsLight || isDarkPage ? "" : "border-white/10 bg-white/8"
                          }`}
                          data-testid={`${testIdPrefix}-hero-stat`}
                        >
                          <p
                            className="text-xl font-black tracking-tight sm:text-2xl"
                            data-service-stat-value="true"
                            data-testid={`${testIdPrefix}-hero-stat-value`}
                            style={{
                              color: typography.statValueColor ?? theme.primaryColor,
                              fontFamily: typography.headingFontFamily,
                            }}
                          >
                            {stat.value}
                          </p>
                          <p
                            className={`mt-1.5 text-xs leading-snug ${
                              typography.statLabelColor ? "" : heroMutedClass
                            }`}
                            data-service-stat-label="true"
                            data-testid={`${testIdPrefix}-hero-stat-label`}
                            style={
                              typography.statLabelColor
                                ? { color: typography.statLabelColor }
                                : undefined
                            }
                          >
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {introVideo ? (
                    <ExpertIntroVideoBlock
                      media={introVideo}
                      variant={variant}
                      testId={`${testIdPrefix}-template-introVideo`}
                      primaryColor={theme.primaryColor}
                      surfaceMode={heroIsLight ? "light" : "dark"}
                    />
                  ) : null}
                </div>

                <div
                  className={`${cardSurface} ${radius} overflow-hidden p-1.5 shadow-lg ring-1 ring-black/[0.04] sm:p-2`}
                >
                  {images.profileImage ? (
                    <MiniSiteSectionAccentImage
                      media={images.profileImage}
                      variant={variant}
                      testId={`${testIdPrefix}-template-profileImage`}
                      tone="expert"
                      layout="banner"
                      className="aspect-[4/5] w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
                    />
                  ) : (
                    <ProfilePortraitFallback
                      name={business.name}
                      primaryColor={theme.primaryColor}
                      accentColor={theme.accentColor}
                      className="aspect-[4/5] w-full"
                      testId={`${testIdPrefix}-hero-portrait-fallback`}
                    />
                  )}
                </div>
              </div>
            </div>
          </header>
        );

      case "about":
        return (
          <section
            id="about"
            className={`${sectionClass} ${visuals.sectionMainClass}`}
            data-testid={`${testIdPrefix}-about`}
          >
            <div
              className={`${maxClass} grid items-center gap-10 sm:gap-12 lg:gap-16 ${deviceGrid(
                previewDevice,
                {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-2",
                  desktop: "grid-cols-2",
                  responsive: "grid-cols-1 md:grid-cols-2",
                },
              )}`}
            >
              <div className="min-w-0">
                <p
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.primaryColor }}
                >
                  {content.about.subtitle}
                </p>
                <h2
                  className={`service-typo-heading mt-3 text-[clamp(1.75rem,3.5vw,3rem)] font-black leading-tight ${sectionHeadingClass}`}
                  style={headingStyle}
                  data-testid={`${testIdPrefix}-about-title`}
                >
                  {content.about.title}
                </h2>
                <p
                  className={`mt-5 max-w-xl text-base leading-[1.75] md:text-lg ${mutedTextClass}`}
                  style={mutedStyle}
                  data-testid={`${testIdPrefix}-about-bio`}
                >
                  {content.about.bio}
                </p>
                <ul className="mt-8 flex flex-wrap gap-2.5">
                  {content.about.credentials.map((credential) => (
                    <li
                      key={credential.id}
                      className={`inline-flex max-w-full items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm font-medium leading-snug shadow-sm ${
                        isDarkPage
                          ? "border-white/10 bg-white/[0.06] text-slate-200"
                          : "border-slate-200/90 bg-white/90 text-slate-700"
                      }`}
                      data-testid={`${testIdPrefix}-credential`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${visuals.primaryButtonText}`}
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 break-words">{credential.text}</span>
                    </li>
                  ))}
                </ul>
                {content.about.showCta ? (
                  <div className="mt-9">
                    {renderAction(content.about.ctaLabel, content.about.ctaAction, true)}
                  </div>
                ) : null}
              </div>
              <div
                className={`${cardSurface} ${radius} overflow-hidden p-1.5 shadow-lg ring-1 ring-black/[0.04] sm:p-2`}
              >
                {images.profileImage ? (
                  <MiniSiteSectionAccentImage
                    media={images.profileImage}
                    variant={variant}
                    testId={`${testIdPrefix}-about-profileImage`}
                    tone="expert"
                    layout="banner"
                    className="aspect-[4/5] w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
                  />
                ) : (
                  <ProfilePortraitFallback
                    name={business.name}
                    primaryColor={theme.primaryColor}
                    accentColor={theme.accentColor}
                    className="aspect-[4/5] w-full"
                    testId={`${testIdPrefix}-about-fallback`}
                  />
                )}
              </div>
            </div>
          </section>
        );

      case "services":
        return (
          <section
            id="services"
            className={`${sectionClass} ${visuals.sectionAltClass}`}
            data-testid={`${testIdPrefix}-services`}
          >
            <div className={maxClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p
                    className="text-xs font-bold uppercase tracking-[0.22em]"
                    style={{ color: theme.primaryColor }}
                  >
                    Sessions
                  </p>
                  <h2
                    className={`service-typo-heading mt-3 text-[clamp(1.75rem,4vw,3rem)] font-black tracking-tight ${sectionHeadingClass}`}
                    style={headingStyle}
                    data-testid={`${testIdPrefix}-services-title`}
                  >
                    {content.services.title}
                  </h2>
                  <p
                    className={`mt-4 text-base leading-relaxed md:text-lg ${mutedTextClass}`}
                    style={mutedStyle}
                    data-testid={`${testIdPrefix}-services-subtitle`}
                  >
                    {content.services.subtitle}
                  </p>
                </div>
                {!isPreview && orderedServices.length > 0 ? (
                  <Link
                    to={servicesHref}
                    className={`shrink-0 text-sm font-semibold transition hover:opacity-80 ${mutedTextClass}`}
                    style={{ color: theme.primaryColor }}
                    data-testid={`${testIdPrefix}-services-view-all`}
                  >
                    View all services →
                  </Link>
                ) : null}
              </div>

              {images.servicesImage ? (
                <div
                  className={`mt-8 overflow-hidden ${cardSurface} ${radius}`}
                  data-testid={`${testIdPrefix}-template-servicesImage`}
                >
                  <MiniSiteSectionAccentImage
                    media={images.servicesImage}
                    variant={variant}
                    testId={`${testIdPrefix}-template-servicesImage-media`}
                    tone="expert"
                    layout="banner"
                    className="aspect-[21/9] w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
                  />
                </div>
              ) : null}

              {orderedServices.length ? (
                <div
                  className={`mt-10 grid items-stretch gap-5 sm:gap-6 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-3",
                    responsive: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  })}`}
                  data-testid={`${testIdPrefix}-services-grid`}
                >
                  {orderedServices.map((service) => {
                    const duration = formatDuration(service.duration_minutes);
                    const serviceHref =
                      service.type === "order"
                        ? `/b/${publicSlug}/services/${service.id}/request`
                        : `/b/${publicSlug}/services/${service.id}`;
                    return (
                      <article
                        key={service.id}
                        className={`group flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden ${elevatedCard} ${radius}`}
                        data-testid={`${testIdPrefix}-service-card`}
                      >
                        {content.services.showImage ? (
                          service.image ? (
                            <ServiceCardImageArea
                              image={service.image}
                              alt={service.name}
                              aspectClassName="aspect-[16/10] w-full shrink-0"
                            />
                          ) : (
                            <div
                              className="flex aspect-[16/10] w-full shrink-0 items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${theme.primaryColor}28, ${theme.accentColor}40)`,
                              }}
                              data-testid={`${testIdPrefix}-service-card-fallback`}
                              aria-hidden="true"
                            >
                              <span
                                className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black shadow-sm ${visuals.primaryButtonText}`}
                                style={{ backgroundColor: theme.primaryColor }}
                              >
                                {service.name.charAt(0)}
                              </span>
                            </div>
                          )
                        ) : null}
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5 sm:p-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-lg font-bold leading-snug ${cardTitleClass}`}
                              style={cardTextStyle}
                              data-service-card-text="true"
                            >
                              {service.name}
                            </h3>
                            {service.category || service.type ? (
                              <TypeBadge type={service.type} />
                            ) : null}
                          </div>
                          {content.services.showDescription && service.description ? (
                            <p
                              className={`mt-3 line-clamp-3 flex-1 text-sm leading-relaxed ${
                                typography.mutedColor ? "service-typo-muted" : visuals.cardMutedText
                              }`}
                              style={mutedStyle}
                            >
                              {service.description}
                            </p>
                          ) : (
                            <div className="flex-1" />
                          )}
                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                            {content.services.showPrice ? (
                              <span
                                className="text-base font-semibold"
                                style={
                                  typography.accentTextColor
                                    ? { color: typography.accentTextColor }
                                    : typography.cardTextColor
                                      ? { color: typography.cardTextColor }
                                      : undefined
                                }
                                data-testid={`${testIdPrefix}-service-price`}
                              >
                                <PriceLabel service={service} />
                              </span>
                            ) : null}
                            {content.services.showDuration && duration ? (
                              <span
                                className={`text-xs font-semibold ${
                                  typography.mutedColor
                                    ? "service-typo-muted"
                                    : visuals.cardMutedText
                                }`}
                                style={mutedStyle}
                              >
                                {duration}
                              </span>
                            ) : null}
                          </div>
                          {isPreview ? (
                            <button
                              disabled
                              className={`service-typo-button ${radius} ${tokenTextClass(
                                typography.buttonTextColor,
                                visuals.primaryButtonText,
                              )} mt-auto w-full px-3 py-3 text-sm font-bold`}
                              style={{
                                backgroundColor: theme.primaryColor,
                                fontFamily: typography.buttonFontFamily,
                                fontWeight: typography.buttonWeight,
                                ...(typography.buttonTextColor
                                  ? { color: typography.buttonTextColor }
                                  : {}),
                              }}
                              data-service-button="true"
                            >
                              {content.services.buttonLabel}
                            </button>
                          ) : (
                            <Link
                              to={serviceHref}
                              className={`service-typo-button ${radius} ${tokenTextClass(
                                typography.buttonTextColor,
                                visuals.primaryButtonText,
                              )} mt-auto block w-full px-3 py-3 text-center text-sm font-bold`}
                              style={{
                                backgroundColor: theme.primaryColor,
                                fontFamily: typography.buttonFontFamily,
                                fontWeight: typography.buttonWeight,
                                ...(typography.buttonTextColor
                                  ? { color: typography.buttonTextColor }
                                  : {}),
                              }}
                              data-service-button="true"
                            >
                              {content.services.buttonLabel}
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`mt-8 rounded-2xl border border-dashed px-5 py-8 text-left sm:px-6 ${
                    isDarkPage
                      ? "border-slate-600/70 bg-slate-900/30"
                      : "border-slate-300/90 bg-slate-50/50"
                  }`}
                  data-testid={`${testIdPrefix}-services-empty`}
                >
                  <p className={`text-sm font-semibold ${bodyTextClass}`}>
                    No services listed yet
                  </p>
                  <p className={`mt-1.5 max-w-md text-sm leading-relaxed ${mutedTextClass}`}>
                    Active services from Admin → Services will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </section>
        );

      case "expertise":
        return (
          <section
            id="expertise"
            className={`${sectionClass} ${visuals.sectionMainClass}`}
            data-testid={`${testIdPrefix}-expertise`}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                Focus areas
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-expertise-title`}
              >
                {content.expertise.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base leading-relaxed ${mutedTextClass}`} style={mutedStyle}>
                {content.expertise.subtitle}
              </p>
              <div
                className={`mt-10 grid gap-4 sm:gap-5 ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-2",
                  desktop: "grid-cols-3",
                  responsive: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                })}`}
              >
                {visibleExpertise.map((item) => (
                  <div
                    key={item.id}
                    className={`min-w-0 ${elevatedCard} ${radius} p-5 sm:p-6`}
                    data-testid={`${testIdPrefix}-expertise-card`}
                  >
                    <span
                      className="inline-flex rounded-full px-3 py-1.5 text-xs font-bold tracking-wide"
                      style={{
                        backgroundColor: `${theme.primaryColor}18`,
                        color: theme.primaryColor,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.description ? (
                      <p
                        className={`mt-4 text-sm leading-relaxed ${mutedTextClass}`}
                        style={mutedStyle}
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "process":
        return (
          <section
            id="process"
            className={`${sectionClass} ${visuals.sectionAltClass}`}
            data-testid={`${testIdPrefix}-process`}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                The process
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-process-title`}
              >
                {content.process.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.process.subtitle}
              </p>
              <div
                className={`mt-10 grid gap-4 sm:gap-5 ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-2",
                  desktop: "grid-cols-4",
                  responsive: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
                })}`}
              >
                {content.process.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`relative min-w-0 ${elevatedCard} ${radius} p-5 sm:p-6`}
                    data-testid={`${testIdPrefix}-process-step`}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black shadow-sm tabular-nums"
                      style={{
                        backgroundColor: `${theme.primaryColor}22`,
                        color: theme.primaryColor,
                      }}
                    >
                      {content.process.showNumbering
                        ? String(index + 1).padStart(2, "0")
                        : "✦"}
                    </span>
                    <h3
                      className={`mt-5 text-lg font-bold leading-snug break-words ${cardTitleClass}`}
                      style={cardTextStyle}
                      data-service-card-text="true"
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-2.5 text-sm leading-relaxed break-words ${mutedTextClass}`}
                      style={mutedStyle}
                    >
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "results":
        return (
          <section
            id="results"
            className={`${sectionClass} ${visuals.sectionMainClass}`}
            data-testid={`${testIdPrefix}-results`}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                Outcomes
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-results-title`}
              >
                {content.results.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.results.subtitle}
              </p>
              <div
                className={`mt-10 grid gap-4 sm:gap-5 ${deviceGrid(previewDevice, {
                  mobile: "grid-cols-1",
                  tablet: "grid-cols-3",
                  desktop: "grid-cols-3",
                  responsive: "grid-cols-1 sm:grid-cols-3",
                })}`}
              >
                {content.results.items.map((item) => (
                  <div
                    key={item.id}
                    className={`${elevatedCard} ${radius} p-6 text-center sm:p-7`}
                    data-testid={`${testIdPrefix}-result-card`}
                  >
                    <p
                      className="text-2xl font-black tracking-tight sm:text-3xl md:text-[2rem]"
                      data-service-stat-value="true"
                      style={{
                        color: typography.statValueColor ?? theme.primaryColor,
                        fontFamily: typography.headingFontFamily,
                      }}
                    >
                      {item.value}
                    </p>
                    <p
                      className={`mt-3 text-sm leading-snug ${mutedTextClass}`}
                      style={mutedStyle}
                      data-service-stat-label="true"
                    >
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "articles":
        return (
          <section
            id="articles"
            className={`${sectionClass} ${visuals.sectionAltClass}`}
            data-testid={`${testIdPrefix}-articles`}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                Writing
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-articles-title`}
              >
                {content.articles.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.articles.subtitle}
              </p>

              {visibleArticles.length ? (
                <div className="mt-10 space-y-6">
                  {featuredArticles.map((article) => {
                    const previewText =
                      article.excerpt?.trim() ||
                      (article.body ? article.body.trim().slice(0, 180) : "");
                    return (
                      <article
                        key={article.id}
                        className={`overflow-hidden ${elevatedCard} ${radius}`}
                        data-testid={`${testIdPrefix}-article-card`}
                        data-featured="true"
                      >
                        <div
                          className={`grid items-stretch ${deviceGrid(previewDevice, {
                            mobile: "grid-cols-1",
                            tablet: "grid-cols-[1.05fr_1fr]",
                            desktop: "grid-cols-[1.1fr_1fr]",
                            responsive: "grid-cols-1 md:grid-cols-[1.1fr_1fr]",
                          })}`}
                        >
                          <div className="min-h-0 min-w-0">
                            {article.coverImageUrl ? (
                              <img
                                src={article.coverImageUrl}
                                alt=""
                                className="h-full min-h-[180px] w-full object-cover md:min-h-[240px]"
                                data-testid={`${testIdPrefix}-article-cover`}
                              />
                            ) : (
                              brandedCoverFallback({
                                title: article.title,
                                primaryColor: theme.primaryColor,
                                accentColor: theme.accentColor,
                                aspectClass: "min-h-[180px] md:min-h-full md:aspect-auto aspect-[21/9]",
                                testId: `${testIdPrefix}-article-cover-fallback`,
                                buttonTextClass: visuals.primaryButtonText,
                              })
                            )}
                          </div>
                          <div className="flex flex-col p-6 sm:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={chipClass}
                                style={{ color: theme.primaryColor }}
                              >
                                {ARTICLE_TYPE_LABELS[article.type]}
                              </span>
                              {article.category ? (
                                <span className={chipClass} style={mutedStyle}>
                                  {article.category}
                                </span>
                              ) : null}
                              {article.date ? (
                                <span className={`text-xs font-medium ${mutedTextClass}`} style={mutedStyle}>
                                  {article.date}
                                </span>
                              ) : null}
                              {article.readingTime ? (
                                <span className={`text-xs font-medium ${mutedTextClass}`} style={mutedStyle}>
                                  {article.readingTime}
                                </span>
                              ) : null}
                            </div>
                            <h3
                              className={`mt-4 text-2xl font-black leading-snug ${cardTitleClass}`}
                              style={cardTextStyle}
                              data-service-card-text="true"
                            >
                              {article.title}
                            </h3>
                            {previewText ? (
                              <p
                                className={`mt-3 line-clamp-4 flex-1 text-base leading-relaxed ${mutedTextClass}`}
                                style={mutedStyle}
                              >
                                {previewText}
                              </p>
                            ) : (
                              <div className="flex-1" />
                            )}
                            <div className="mt-6">
                              {article.externalUrl.trim() ? (
                                isPreview ? (
                                  <button
                                    type="button"
                                    disabled
                                    className={contentLinkClass}
                                    style={{ color: theme.primaryColor }}
                                  >
                                    Read more →
                                  </button>
                                ) : (
                                  <a
                                    href={article.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={contentLinkClass}
                                    style={{ color: theme.primaryColor }}
                                  >
                                    Read more →
                                  </a>
                                )
                              ) : (
                                <button
                                  type="button"
                                  disabled={isPreview}
                                  onClick={() => openArticle(article)}
                                  className={`${contentLinkClass} disabled:opacity-60`}
                                  style={{ color: theme.primaryColor }}
                                >
                                  Read more →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {regularArticles.length ? (
                    <div
                      className={`grid items-stretch gap-5 ${deviceGrid(previewDevice, {
                        mobile: "grid-cols-1",
                        tablet: "grid-cols-2",
                        desktop: "grid-cols-3",
                        responsive: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                      })}`}
                    >
                      {regularArticles.map((article) => {
                        const previewText =
                          article.excerpt?.trim() ||
                          (article.body ? article.body.trim().slice(0, 120) : "");
                        return (
                          <article
                            key={article.id}
                            className={`flex h-full min-w-0 flex-col overflow-hidden ${elevatedCard} ${radius}`}
                            data-testid={`${testIdPrefix}-article-card`}
                          >
                            {article.coverImageUrl ? (
                              <img
                                src={article.coverImageUrl}
                                alt=""
                                className="aspect-[16/10] w-full object-cover"
                                data-testid={`${testIdPrefix}-article-cover`}
                              />
                            ) : (
                              brandedCoverFallback({
                                title: article.title,
                                primaryColor: theme.primaryColor,
                                accentColor: theme.accentColor,
                                aspectClass: "aspect-[16/10]",
                                testId: `${testIdPrefix}-article-cover-fallback`,
                                buttonTextClass: visuals.primaryButtonText,
                              })
                            )}
                            <div className="flex flex-1 flex-col p-5 sm:p-6">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={chipClass}
                                  style={{ color: theme.primaryColor }}
                                >
                                  {ARTICLE_TYPE_LABELS[article.type]}
                                </span>
                                {article.category ? (
                                  <span className={`text-xs font-semibold ${mutedTextClass}`} style={mutedStyle}>
                                    {article.category}
                                  </span>
                                ) : null}
                                {article.date ? (
                                  <span className={`text-xs ${mutedTextClass}`} style={mutedStyle}>
                                    {article.date}
                                  </span>
                                ) : null}
                                {article.readingTime ? (
                                  <span className={`text-xs ${mutedTextClass}`} style={mutedStyle}>
                                    {article.readingTime}
                                  </span>
                                ) : null}
                              </div>
                              <h3
                                className={`mt-3 text-lg font-bold leading-snug ${cardTitleClass}`}
                                style={cardTextStyle}
                                data-service-card-text="true"
                              >
                                {article.title}
                              </h3>
                              {previewText ? (
                                <p
                                  className={`mt-3 line-clamp-3 flex-1 text-sm leading-relaxed ${mutedTextClass}`}
                                  style={mutedStyle}
                                >
                                  {previewText}
                                </p>
                              ) : (
                                <div className="flex-1" />
                              )}
                              <div className="mt-5">
                                {article.externalUrl.trim() ? (
                                  isPreview ? (
                                    <button
                                      type="button"
                                      disabled
                                      className={contentLinkClass}
                                      style={{ color: theme.primaryColor }}
                                    >
                                      Read more →
                                    </button>
                                  ) : (
                                    <a
                                      href={article.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={contentLinkClass}
                                      style={{ color: theme.primaryColor }}
                                    >
                                      Read more →
                                    </a>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isPreview}
                                    onClick={() => openArticle(article)}
                                    className={`${contentLinkClass} disabled:opacity-60`}
                                    style={{ color: theme.primaryColor }}
                                  >
                                    Read more →
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={emptyStateClass} data-testid={`${testIdPrefix}-articles-empty`}>
                  <p className={`text-sm leading-relaxed ${mutedTextClass}`}>
                    Articles and publications will appear here soon.
                  </p>
                </div>
              )}
            </div>
          </section>
        );

      case "works":
        return (
          <section
            id="works"
            className={`${sectionClass} ${visuals.sectionMainClass}`}
            data-testid={`${testIdPrefix}-works`}
          >
            <div className={maxClass}>
              <p
                className="text-xs font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.primaryColor }}
              >
                Case studies
              </p>
              <h2
                className={`service-typo-heading mt-3 text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-works-title`}
              >
                {content.works.title}
              </h2>
              <p className={`mt-3 max-w-2xl text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.works.subtitle}
              </p>

              {visibleWorks.length ? (
                <div
                  className={`mt-10 grid items-stretch gap-5 sm:gap-6 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-3",
                    responsive: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  })}`}
                >
                  {visibleWorks.map((work) => (
                    <article
                      key={work.id}
                      className={`flex h-full min-w-0 flex-col overflow-hidden ${elevatedCard} ${radius}`}
                      data-testid={`${testIdPrefix}-work-card`}
                    >
                      {work.coverImageUrl ? (
                        <img
                          src={work.coverImageUrl}
                          alt=""
                          className="aspect-[16/10] w-full object-cover"
                          data-testid={`${testIdPrefix}-work-cover`}
                        />
                      ) : (
                        brandedCoverFallback({
                          title: work.title,
                          primaryColor: theme.primaryColor,
                          accentColor: theme.accentColor,
                          aspectClass: "aspect-[16/10]",
                          testId: `${testIdPrefix}-work-cover-fallback`,
                          buttonTextClass: visuals.primaryButtonText,
                        })
                      )}
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          {work.category ? (
                            <span className={chipClass} style={{ color: theme.primaryColor }}>
                              {work.category}
                            </span>
                          ) : null}
                          {work.year ? (
                            <span className={`text-xs font-medium ${mutedTextClass}`} style={mutedStyle}>
                              {work.year}
                            </span>
                          ) : null}
                          {work.clientName ? (
                            <span className={`text-xs font-medium ${mutedTextClass}`} style={mutedStyle}>
                              {work.clientName}
                            </span>
                          ) : null}
                        </div>
                        <h3
                          className={`mt-3 text-lg font-bold leading-snug ${cardTitleClass}`}
                          style={cardTextStyle}
                          data-service-card-text="true"
                        >
                          {work.title}
                        </h3>
                        {work.shortDescription ? (
                          <p
                            className={`mt-3 line-clamp-2 text-sm leading-relaxed ${mutedTextClass}`}
                            style={mutedStyle}
                          >
                            {work.shortDescription}
                          </p>
                        ) : null}
                        {work.challenge || work.result ? (
                          <div className={`mt-3 space-y-1.5 text-xs leading-relaxed ${mutedTextClass}`} style={mutedStyle}>
                            {work.challenge ? (
                              <p className="line-clamp-2">
                                <span className="font-semibold opacity-80">Challenge · </span>
                                {work.challenge}
                              </p>
                            ) : null}
                            {work.result ? (
                              <p className="line-clamp-2">
                                <span className="font-semibold opacity-80">Result · </span>
                                {work.result}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}
                        <div className="flex-1" />
                        {work.metrics.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {work.metrics.map((metric) => (
                              <span
                                key={metric}
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  isDarkPage
                                    ? "border-white/15 bg-white/5"
                                    : "border-slate-200 bg-slate-50"
                                }`}
                                style={{ color: theme.primaryColor }}
                              >
                                {metric}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-5">
                          {work.linkUrl.trim() ? (
                            isPreview ? (
                              <button
                                type="button"
                                disabled
                                className={contentLinkClass}
                                style={{ color: theme.primaryColor }}
                              >
                                View case →
                              </button>
                            ) : (
                              <a
                                href={work.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={contentLinkClass}
                                style={{ color: theme.primaryColor }}
                              >
                                View case →
                              </a>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={isPreview}
                              onClick={() => openWork(work)}
                              className={`${contentLinkClass} disabled:opacity-60`}
                              style={{ color: theme.primaryColor }}
                            >
                              View case →
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={emptyStateClass} data-testid={`${testIdPrefix}-works-empty`}>
                  <p className={`text-sm leading-relaxed ${mutedTextClass}`}>
                    Works and case studies will appear here soon.
                  </p>
                </div>
              )}
            </div>
          </section>
        );

      case "testimonials":
        return (
          <section
            id="testimonials"
            className={`${sectionClass} ${visuals.sectionAltClass}`}
            data-testid={`${testIdPrefix}-testimonials`}
          >
            <div className={maxClass}>
              <h2
                className={`service-typo-heading text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-testimonials-title`}
              >
                {content.testimonials.title}
              </h2>
              <p className={`mt-3 text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.testimonials.subtitle}
              </p>
              {content.testimonials.showRating && averageRating ? (
                <p className={`mt-5 text-lg font-bold ${bodyTextClass}`}>
                  ★ {averageRating.toFixed(1)}{" "}
                  <span className={`text-sm font-normal ${mutedTextClass}`}>
                    from {reviewSummary?.review_count ?? business.review_count ?? 0} reviews
                  </span>
                </p>
              ) : null}

              {testimonialCards.length ? (
                <div
                  className={`mt-10 grid items-stretch gap-5 sm:gap-6 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-3",
                    responsive: "grid-cols-1 md:grid-cols-3",
                  })}`}
                >
                  {testimonialCards.map((review) => (
                    <figure
                      key={`${review.kind}-${review.id}`}
                      className={`relative flex h-full min-w-0 flex-col ${elevatedCard} ${radius} p-5 sm:p-6`}
                      data-testid={
                        review.kind === "manual"
                          ? `${testIdPrefix}-testimonial-card`
                          : `${testIdPrefix}-review-card`
                      }
                    >
                      <span
                        className="pointer-events-none absolute right-4 top-3 text-4xl font-black leading-none opacity-[0.12]"
                        style={{ color: theme.primaryColor }}
                        aria-hidden
                      >
                        “
                      </span>
                      <div className="flex items-center gap-3">
                        {review.avatarUrl ? (
                          <img
                            src={review.avatarUrl}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-black/[0.04]"
                            data-testid={`${testIdPrefix}-testimonial-avatar`}
                          />
                        ) : (
                          <span
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-sm ${visuals.primaryButtonText}`}
                            style={{ backgroundColor: theme.primaryColor }}
                            data-testid={`${testIdPrefix}-testimonial-initials`}
                          >
                            {review.initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <figcaption className={`truncate font-bold ${bodyTextClass}`}>
                            {review.name}
                          </figcaption>
                          {review.role ? (
                            <p className={`truncate text-xs ${mutedTextClass}`} style={mutedStyle}>
                              {review.role}
                            </p>
                          ) : null}
                          {review.date ? (
                            <p className={`mt-0.5 text-[11px] ${mutedTextClass}`} style={mutedStyle}>
                              {review.date}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {content.testimonials.showRating ? (
                        <p
                          className="mt-4 text-sm tracking-wide"
                          style={{ color: theme.primaryColor }}
                          aria-label={`${review.rating} out of 5 stars`}
                        >
                          {"★".repeat(Math.max(0, Math.min(5, review.rating)))}
                          <span className={mutedTextClass}>
                            {"☆".repeat(Math.max(0, 5 - Math.min(5, review.rating)))}
                          </span>
                        </p>
                      ) : null}
                      <blockquote
                        className={`mt-3 flex-1 text-sm leading-relaxed ${bodyTextClass}`}
                      >
                        <span className={mutedTextClass} style={mutedStyle}>
                          “{review.quote}”
                        </span>
                      </blockquote>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className={emptyStateClass} data-testid={`${testIdPrefix}-testimonials-empty`}>
                  <p className={`text-sm leading-relaxed ${mutedTextClass}`}>
                    Reviews will appear here after clients leave feedback.
                  </p>
                </div>
              )}
            </div>
          </section>
        );

      case "faq":
        return (
          <section
            id="faq"
            className={`${sectionClass} ${visuals.sectionMainClass}`}
            data-testid={`${testIdPrefix}-faq`}
          >
            <div className={`${maxClass} max-w-3xl`}>
              <h2
                className={`service-typo-heading text-3xl font-black md:text-4xl ${sectionHeadingClass}`}
                style={headingStyle}
                data-testid={`${testIdPrefix}-faq-title`}
              >
                {content.faq.title}
              </h2>
              <p className={`mt-3 text-base ${mutedTextClass}`} style={mutedStyle}>
                {content.faq.subtitle}
              </p>
              <div
                className={`mt-8 w-full divide-y shadow-sm ring-1 ring-black/[0.04] ${
                  isDarkPage ? "divide-slate-700/80" : "divide-slate-200/90"
                } ${visuals.cardClass} ${radius} px-4 sm:px-5 md:px-6`}
              >
                {content.faq.items.map((item) => (
                  <div key={item.id} className="min-w-0">
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-bold leading-snug sm:text-base ${visuals.faqText}`}
                      onClick={() => setOpenFaqId(openFaqId === item.id ? null : item.id)}
                      aria-expanded={openFaqId === item.id}
                      disabled={isPreview}
                    >
                      <span className="min-w-0 flex-1 break-words pr-2">{item.question}</span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold leading-none ${
                          isDarkPage ? "bg-white/10" : "bg-slate-100"
                        }`}
                        style={{ color: theme.primaryColor }}
                        aria-hidden
                      >
                        {openFaqId === item.id ? "−" : "+"}
                      </span>
                    </button>
                    {openFaqId === item.id ? (
                      <p
                        className={`pb-5 pr-8 text-sm leading-relaxed md:pr-12 md:text-base ${visuals.faqMutedText}`}
                      >
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "contact": {
        const contactBg =
          content.contactCta.backgroundStyle === "primary"
            ? undefined
            : content.contactCta.backgroundStyle === "soft"
              ? visuals.sectionAltClass
              : visuals.ctaBg;
        const contactIsSoft = content.contactCta.backgroundStyle === "soft";
        const contactText = contactIsSoft ? visuals.bodyText : visuals.ctaText;
        const contactMuted = contactIsSoft ? visuals.mutedText : visuals.ctaMutedText;
        const hasBookingImage = Boolean(images.bookingImage);
        return (
          <section
            id="contact"
            className={`${sectionClass} ${contactBg ?? visuals.ctaBg}`}
            data-testid={`${testIdPrefix}-contact`}
            style={
              content.contactCta.backgroundStyle === "primary"
                ? { backgroundColor: theme.primaryColor }
                : undefined
            }
          >
            <div
              className={`${maxClass} grid items-center gap-10 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: hasBookingImage ? "grid-cols-[1fr_240px]" : "grid-cols-1",
                desktop: hasBookingImage ? "grid-cols-[1fr_320px]" : "grid-cols-1",
                responsive: hasBookingImage
                  ? "grid-cols-1 lg:grid-cols-[1fr_320px]"
                  : "grid-cols-1",
              })}`}
            >
              <div className="min-w-0">
                <h2
                  className={`text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-tight ${contactText}`}
                >
                  {content.contactCta.headline}
                </h2>
                <p className={`mt-4 max-w-2xl text-base leading-relaxed md:text-lg ${contactMuted}`}>
                  {content.contactCta.subtitle}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {renderAction(
                    content.contactCta.primaryCtaLabel,
                    content.contactCta.primaryCtaAction,
                    true,
                  )}
                  {renderAction(
                    content.contactCta.secondaryCtaLabel,
                    content.contactCta.secondaryCtaAction,
                    false,
                    undefined,
                    contactIsSoft
                      ? ghostButtonClass
                      : "border border-white/35 bg-white/10 text-white hover:bg-white/20",
                  )}
                </div>
                <div
                  className={`mt-10 grid gap-3 sm:gap-4 ${deviceGrid(previewDevice, {
                    mobile: "grid-cols-1",
                    tablet: "grid-cols-2",
                    desktop: "grid-cols-2",
                    responsive: "grid-cols-1 sm:grid-cols-2",
                  })}`}
                >
                  {content.contactCta.showPhone && phone ? (
                    isPreview ? (
                      <div
                        className={`${radius} border p-5 text-sm leading-relaxed shadow-sm ${
                          contactIsSoft
                            ? "border-black/5 bg-black/[0.04]"
                            : "border-white/15 bg-white/10 text-white"
                        }`}
                      >
                        <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                          Call
                        </b>
                        <span className="mt-1.5 block text-base font-semibold">{phone}</span>
                      </div>
                    ) : (
                      <a
                        href={`tel:${phone}`}
                        className={`${radius} border p-5 text-sm leading-relaxed shadow-sm transition hover:opacity-90 ${
                          contactIsSoft
                            ? "border-black/5 bg-black/[0.04]"
                            : "border-white/15 bg-white/10 text-white"
                        }`}
                      >
                        <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                          Call
                        </b>
                        <span className="mt-1.5 block text-base font-semibold">{phone}</span>
                      </a>
                    )
                  ) : null}
                  {content.contactCta.showLocation && location ? (
                    <div
                      className={`${radius} border p-5 text-sm leading-relaxed shadow-sm ${
                        contactIsSoft
                          ? "border-black/5 bg-black/[0.04]"
                          : "border-white/15 bg-white/10 text-white"
                      }`}
                    >
                      <b className="block text-xs font-bold uppercase tracking-wide opacity-80">
                        Location
                      </b>
                      <span className="mt-1.5 block text-base font-semibold">{location}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              {images.bookingImage ? (
                <div
                  className={`${radius} overflow-hidden border shadow-lg ${
                    contactIsSoft ? "border-slate-200 bg-white" : "border-white/20 bg-white/10"
                  }`}
                  data-testid={`${testIdPrefix}-template-bookingImage`}
                >
                  <MiniSiteSectionAccentImage
                    media={images.bookingImage}
                    variant={variant}
                    testId={`${testIdPrefix}-template-bookingImage-media`}
                    tone="expert"
                    layout="banner"
                  />
                </div>
              ) : null}
            </div>
          </section>
        );
      }

      case "footer":
        return (
          <footer
            className={`${visuals.footerClass} px-5 py-12 sm:px-6 md:px-10 md:py-14`}
            data-testid={`${testIdPrefix}-footer`}
          >
            <div
              className={`${maxClass} grid gap-10 sm:gap-12 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-4",
                responsive: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
              })}`}
            >
              <div className="md:col-span-1">
                <p className="text-lg font-black tracking-tight">{business.name}</p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-80">
                  {content.footer.description}
                </p>
              </div>
              {content.footer.showQuickLinks ? (
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide opacity-90">Quick links</p>
                  <div className="mt-4 grid gap-3 text-sm opacity-80">
                    {navLinks.map((link) => (
                      <span key={link.id}>
                        {previewLink(link.label, `#${link.id}`, "transition hover:opacity-100")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {content.footer.showServicesLinks ? (
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide opacity-90">Services</p>
                  <div className="mt-4 grid gap-3 text-sm opacity-80">
                    {orderedServices.slice(0, 5).map((service) =>
                      isPreview ? (
                        <span key={service.id}>{service.name}</span>
                      ) : (
                        <Link
                          key={service.id}
                          to={`/b/${publicSlug}/services/${service.id}`}
                          className="hover:opacity-100"
                        >
                          {service.name}
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              <div>
                {content.footer.showSocialLinks ? (
                  <>
                    <p className="text-sm font-bold uppercase tracking-wide opacity-90">Connect</p>
                    <div className="mt-4 grid gap-3 text-sm opacity-80">
                      {getVisibleSocialLinks(socialLinks).map((entry) => (
                        <span key={entry.key}>
                          {previewLink(
                            entry.label,
                            entry.key === "whatsapp" ? whatsappHref(entry.value) : entry.value,
                            "hover:opacity-100",
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
                {content.footer.showContactInfo && phone ? (
                  <p className="mt-6 text-sm font-medium opacity-80">{phone}</p>
                ) : null}
              </div>
            </div>
            <p className="mx-auto mt-12 max-w-6xl border-t border-current/15 pt-6 text-xs leading-relaxed opacity-60">
              {content.footer.copyrightText ||
                `© ${new Date().getFullYear()} ${business.name}. All rights reserved.`}
            </p>
          </footer>
        );
    }
  };

  return (
    <main
      data-testid={`${testIdPrefix}-layout`}
      data-service-root={typographyRootId}
      data-template="expert"
      data-template-presentation="expert"
      data-preset={visuals.id}
      data-mood={visuals.mood}
      data-background-style={visuals.resolvedBackgroundStyle}
      data-surface-mode={visuals.surfaceMode}
      data-preview-device={previewDevice ?? "full"}
      data-heading-font={typography.presets.headingFontPreset}
      data-body-font={typography.presets.bodyFontPreset}
      data-button-font={typography.presets.buttonFontPreset}
      data-has-heading-color={typography.headingColor ? "true" : "false"}
      data-has-hero-heading-color={typography.heroHeadingColor ? "true" : "false"}
      data-has-accent-text-color={typography.accentTextColor ? "true" : "false"}
      className={`template-expert overflow-hidden ${visuals.pageShellClass}`}
      style={{
        backgroundColor: visuals.pageBg || visuals.backgroundColor,
        fontFamily: typography.bodyFontFamily,
        fontWeight: typography.bodyWeight,
        ...(typography.bodyColor ? { color: typography.bodyColor } : {}),
        ...(buildExpertTypographyCssVars(typography) as CSSProperties),
      }}
    >
      <style
        data-testid={`${testIdPrefix}-typography-style`}
        dangerouslySetInnerHTML={{
          __html: buildExpertTypographyCss(typographyRootId, typography),
        }}
      />
      {visibleSections.map((section) => (
        <div key={section}>{renderSection(section)}</div>
      ))}

      <SimpleContentModal
        open={Boolean(articleModal) && !isPreview}
        title={articleModal?.title || ""}
        onClose={() => setArticleModal(null)}
        testId={`${testIdPrefix}-article-modal`}
        disabled={isPreview}
      >
        {articleModal?.body ? (
          <p className="whitespace-pre-wrap">{articleModal.body}</p>
        ) : articleModal?.excerpt ? (
          <p>{articleModal.excerpt}</p>
        ) : (
          <p>No additional content available.</p>
        )}
      </SimpleContentModal>

      <SimpleContentModal
        open={Boolean(workModal) && !isPreview}
        title={workModal?.title || ""}
        onClose={() => setWorkModal(null)}
        testId={`${testIdPrefix}-work-modal`}
        disabled={isPreview}
      >
        {workModal?.challenge ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Challenge</p>
              <p className="mt-1 whitespace-pre-wrap">{workModal.challenge}</p>
            </div>
            {workModal.result ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Result</p>
                <p className="mt-1 whitespace-pre-wrap">{workModal.result}</p>
              </div>
            ) : null}
          </div>
        ) : workModal?.result ? (
          <p className="whitespace-pre-wrap">{workModal.result}</p>
        ) : workModal?.shortDescription ? (
          <p>{workModal.shortDescription}</p>
        ) : (
          <p>No additional content available.</p>
        )}
      </SimpleContentModal>
    </main>
  );
}
