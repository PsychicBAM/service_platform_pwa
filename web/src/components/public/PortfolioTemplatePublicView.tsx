import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { PriceLabel } from "@/components/PriceLabel";
import { ServiceCardImageArea } from "@/components/ServiceImageDisplay";
import { TypeBadge } from "@/components/TypeBadge";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import { getVisibleSocialLinks } from "@/lib/miniSiteConfig";
import { getTemplateImageSlots } from "@/lib/miniSiteMedia";
import { getTemplateVideoSlots, isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";
import {
  buildPortfolioTypographyCss,
  buildPortfolioTypographyCssVars,
  getEnabledPortfolioSections,
  getPortfolioTemplateContent,
  orderPortfolioServices,
  resolvePortfolioPresetVisuals,
  resolvePortfolioTypography,
  tokenTextClass,
} from "@/lib/portfolioTemplateConfig";
import type { PublicBusiness, PublicReviewItem, PublicReviewSummary, PublicService } from "@/types/api";
import type { MiniSiteConfig } from "@/types/miniSite";
import type { PortfolioCtaAction } from "@/types/portfolioTemplate";
import { formatDuration } from "@/utils/format";

export type PortfolioPreviewDevice = "desktop" | "tablet" | "mobile";
export type PortfolioTemplatePublicViewProps = {
  business: PublicBusiness;
  publicSlug: string;
  services?: PublicService[];
  config: MiniSiteConfig;
  reviews?: PublicReviewItem[];
  reviewSummary?: PublicReviewSummary | null;
  variant?: "full" | "preview";
  previewDevice?: PortfolioPreviewDevice;
  testIdPrefix?: string;
};

function deviceGrid(
  device: PortfolioPreviewDevice | undefined,
  options: Record<PortfolioPreviewDevice | "responsive", string>,
) {
  return options[device ?? "responsive"];
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P"
  );
}

function buttonRadius(style: MiniSiteConfig["theme"]["buttonStyle"]) {
  return style === "pill" ? "rounded-full" : style === "square" ? "rounded-none" : "rounded-xl";
}

export function PortfolioTemplatePublicView({
  business,
  publicSlug,
  services = [],
  config,
  reviews = [],
  variant = "full",
  previewDevice,
  testIdPrefix = "portfolio-site",
}: PortfolioTemplatePublicViewProps) {
  const [category, setCategory] = useState("All");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [showreelOpen, setShowreelOpen] = useState(false);

  const content = getPortfolioTemplateContent(config);
  const visuals = resolvePortfolioPresetVisuals(content.themePreset, config.theme.backgroundStyle);
  const typography = resolvePortfolioTypography(content.typography);
  const images = getTemplateImageSlots(config.templateMedia, "portfolio");
  const videos = getTemplateVideoSlots(config.templateMedia, "portfolio");
  const enabled = new Set(getEnabledPortfolioSections(content));
  const isPreview = variant === "preview";
  const isMobileFrame = previewDevice === "mobile";
  const id = (name: string) => `${testIdPrefix}-${name}`;
  const typographyRootId = `${testIdPrefix}-portfolio`;
  const radius = buttonRadius(config.theme.buttonStyle);

  const projects = content.projects.items.filter((project) => project.visible);
  const orderedServices = orderPortfolioServices(services, content.services.selectedServiceIds);
  const firstBooking =
    orderedServices.find((service) => service.type === "booking") ??
    services.find((service) => service.type === "booking");
  const firstOrder =
    orderedServices.find((service) => service.type === "order") ??
    services.find((service) => service.type === "order");
  const phone = business.contact_phone?.trim() ?? "";
  const whatsapp = (config.socialLinks.whatsapp ?? "").trim();
  const servicesHref = `/b/${publicSlug}/services`;
  const categories = [
    "All",
    ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean))),
  ];
  const visibleProjects =
    category === "All" ? projects : projects.filter((project) => project.category === category);
  const selectedProject = projects.find((project) => project.id === openProjectId) ?? null;

  // Theme token classes only when override is empty (tokenTextClass drops them otherwise).
  const heroHeadingFallback = tokenTextClass(typography.heroHeadingColor, visuals.heroText);
  const heroBodyFallback = tokenTextClass(
    typography.heroBodyColor || typography.bodyColor,
    visuals.heroMutedText,
  );
  const headingFallback = tokenTextClass(typography.headingColor, visuals.bodyText);
  const bodyFallback = tokenTextClass(typography.bodyColor, visuals.bodyText);
  const mutedFallback = tokenTextClass(
    typography.mutedColor || typography.bodyColor,
    visuals.mutedText,
  );
  const cardTitleFallback = tokenTextClass(
    typography.cardTextColor || typography.headingColor,
    visuals.cardText,
  );
  const cardBodyFallback = tokenTextClass(
    typography.cardTextColor || typography.bodyColor || typography.mutedColor,
    visuals.cardMutedText,
  );

  // Inline styles so overrides win over Tailwind tokens (same pattern as Service/Expert).
  const headingStyle: CSSProperties = {
    fontFamily: typography.headingFontFamily,
    fontWeight: typography.headingWeight,
    ...(typography.headingColor ? { color: typography.headingColor } : {}),
  };
  const bodyStyle: CSSProperties | undefined = typography.bodyColor
    ? { color: typography.bodyColor }
    : undefined;
  const mutedStyle: CSSProperties | undefined = typography.mutedColor
    ? { color: typography.mutedColor }
    : undefined;
  const heroHeadingStyle: CSSProperties = {
    fontFamily: typography.headingFontFamily,
    fontWeight: typography.headingWeight,
    ...(typography.heroHeadingColor ? { color: typography.heroHeadingColor } : {}),
  };
  const heroBodyStyle: CSSProperties | undefined = typography.heroBodyColor
    ? { color: typography.heroBodyColor }
    : typography.bodyColor
      ? { color: typography.bodyColor }
      : undefined;
  const accentStyle: CSSProperties = {
    color: typography.accentTextColor || config.theme.accentColor,
  };
  const cardTextStyle: CSSProperties | undefined = typography.cardTextColor
    ? { color: typography.cardTextColor }
    : undefined;
  const cardTitleStyle: CSSProperties = {
    fontFamily: typography.headingFontFamily,
    fontWeight: typography.headingWeight,
    ...(typography.cardTextColor
      ? { color: typography.cardTextColor }
      : typography.headingColor
        ? { color: typography.headingColor }
        : {}),
  };
  const buttonLinkStyle: CSSProperties = {
    color: typography.buttonTextColor || config.theme.primaryColor,
  };
  const eyebrowStyle: CSSProperties = mutedStyle
    ? mutedStyle
    : typography.accentTextColor
      ? { color: typography.accentTextColor }
      : { color: config.theme.primaryColor };
  const heroEyebrowStyle: CSSProperties = mutedStyle
    ? mutedStyle
    : typography.accentTextColor
      ? { color: typography.accentTextColor }
      : { color: config.theme.accentColor };
  const categoryStyle: CSSProperties = mutedStyle
    ? mutedStyle
    : { color: config.theme.primaryColor };
  const statValueStyle: CSSProperties = {
    color:
      typography.statValueColor ||
      typography.accentTextColor ||
      config.theme.accentColor,
  };
  const statLabelStyle: CSSProperties | undefined =
    typography.statLabelColor
      ? { color: typography.statLabelColor }
      : mutedStyle || heroBodyStyle;

  const scrollToSection = (sectionId: string) => {
    const root = document.querySelector(`[data-testid="${testIdPrefix}-layout"]`);
    const element =
      (root?.querySelector(`#${sectionId}`) as HTMLElement | null) ??
      document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const actionHref = (action: PortfolioCtaAction) => {
    if (action === "booking") {
      return firstBooking ? `/b/${publicSlug}/services/${firstBooking.id}` : servicesHref;
    }
    if (action === "request") {
      return firstOrder ? `/b/${publicSlug}/services/${firstOrder.id}/request` : servicesHref;
    }
    if (action === "call") return phone ? `tel:${phone}` : servicesHref;
    if (action === "whatsapp") {
      return whatsapp
        ? whatsapp.startsWith("http")
          ? whatsapp
          : `https://wa.me/${whatsapp.replace(/\D/g, "")}`
        : servicesHref;
    }
    return servicesHref;
  };

  const renderAction = (
    label: string,
    action: PortfolioCtaAction,
    primary = true,
    testId?: string,
  ) => {
    if (!label.trim()) return null;
    const scrollSection =
      action === "projects" || action === "contact" || action === "about" ? action : null;
    const className = `portfolio-typo-button ${radius} ${
      isMobileFrame || !previewDevice ? "w-full sm:w-auto" : ""
    } inline-flex min-h-[48px] items-center justify-center px-6 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
      primary
        ? `${tokenTextClass(typography.buttonTextColor, visuals.primaryButtonText)} shadow-lg shadow-black/10`
        : visuals.secondaryButtonBg
    }`;
    const style: CSSProperties = {
      fontFamily: typography.buttonFontFamily,
      fontWeight: typography.buttonWeight,
      ...(primary ? { backgroundColor: config.theme.primaryColor } : {}),
      ...(typography.buttonTextColor ? { color: typography.buttonTextColor } : {}),
    };

    if (scrollSection) {
      return (
        <a
          href={`#${scrollSection}`}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(scrollSection);
          }}
          className={className}
          style={style}
          data-testid={testId}
        >
          {label}
        </a>
      );
    }
    if (isPreview) {
      return (
        <button type="button" disabled className={className} style={style} data-testid={testId}>
          {label}
        </button>
      );
    }
    const href = actionHref(action);
    if (href.startsWith("tel:") || href.startsWith("http")) {
      return (
        <a href={href} className={className} style={style} data-testid={testId}>
          {label}
        </a>
      );
    }
    return (
      <Link to={href} className={className} style={style} data-testid={testId}>
        {label}
      </Link>
    );
  };

  const manualTestimonials =
    content.testimonials.source === "approved"
      ? []
      : content.testimonials.items.filter((item) => item.visible);
  const approvedTestimonials =
    content.testimonials.source === "manual"
      ? []
      : reviews
          .filter((review) => review.comment)
          .map((review, index) => ({
            id: `review-${index}`,
            name: review.customer_name || "Client",
            role: "Verified client",
            quote: review.comment || "",
            rating: review.rating || 5,
            avatarInitials: initials(review.customer_name || "Client"),
            avatarUrl: "",
            date: "",
            visible: true,
          }));
  const testimonials = [...manualTestimonials, ...approvedTestimonials]
    .filter((item) => item.quote)
    .slice(0, content.testimonials.maxCount);

  const sectionShell = (alternate = false) =>
    `${alternate ? visuals.sectionAltClass : visuals.sectionMainClass} px-4 py-12 sm:px-6 sm:py-16 md:px-8`;

  const contactIsSoft = content.contactCta.backgroundStyle === "soft";
  const contactUsesThemeText =
    content.contactCta.backgroundStyle === "dark" ||
    content.contactCta.backgroundStyle === "primary";

  const manualTestimonialsEmpty = testimonials.length === 0;

  return (
    <main
      data-portfolio-root={typographyRootId}
      data-testid={id("layout")}
      data-template="portfolio"
      data-template-presentation="portfolio"
      data-preset={visuals.id}
      data-background-style={visuals.resolvedBackgroundStyle}
      data-button-style={config.theme.buttonStyle}
      data-surface-mode={visuals.surfaceMode}
      data-preview-device={previewDevice ?? "full"}
      data-heading-font={typography.presets.headingFontPreset}
      data-body-font={typography.presets.bodyFontPreset}
      data-button-font={typography.presets.buttonFontPreset}
      className={`template-portfolio portfolio-typo-body min-h-full overflow-hidden ${visuals.pageShellClass} ${bodyFallback}`}
      style={{
        backgroundColor: visuals.pageBg || visuals.backgroundColor,
        fontFamily: typography.bodyFontFamily,
        fontWeight: typography.bodyWeight,
        ...(typography.bodyColor ? { color: typography.bodyColor } : {}),
        ...(buildPortfolioTypographyCssVars(typography) as CSSProperties),
      }}
      data-has-heading-color={typography.headingColor ? "true" : "false"}
      data-has-hero-heading-color={typography.heroHeadingColor ? "true" : "false"}
      data-has-accent-text-color={typography.accentTextColor ? "true" : "false"}
    >
      <style
        data-testid={id("typography-style")}
        dangerouslySetInnerHTML={{
          __html: buildPortfolioTypographyCss(typographyRootId, typography),
        }}
      />

      <header className={`relative overflow-hidden ${visuals.heroClass}`} data-testid={id("hero")}>
        <div className="absolute inset-0">
          {images.heroVisual ? (
            <img
              src={images.heroVisual.url}
              alt=""
              className="h-full w-full object-cover opacity-45"
              data-testid={id("template-heroVisual")}
            />
          ) : null}
          <div className="absolute inset-0 bg-slate-950/45" />
          <div
            className="absolute inset-0 opacity-75"
            style={{
              background: `radial-gradient(circle at 16% 16%, ${config.theme.accentColor}88, transparent 35%), linear-gradient(135deg, ${config.theme.primaryColor}99, transparent 70%)`,
            }}
          />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 md:px-8">
          <nav className="flex min-w-0 items-center justify-between gap-4">
            <span
              className={`portfolio-typo-hero-heading min-w-0 break-words tracking-tight ${heroHeadingFallback}`}
              style={heroHeadingStyle}
            >
              {business.name}
            </span>
            <div className="hidden gap-4 text-xs font-semibold md:flex">
              {["projects", "about", "services", "contact"].map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(section);
                  }}
                  className={`portfolio-typo-hero-body ${heroBodyFallback}`}
                  style={heroBodyStyle}
                >
                  {section[0].toUpperCase() + section.slice(1)}
                </a>
              ))}
            </div>
          </nav>
          <div
            className={`grid items-center gap-8 py-12 sm:gap-10 sm:py-16 ${deviceGrid(previewDevice, {
              mobile: "grid-cols-1",
              tablet: "grid-cols-[1.15fr_.85fr]",
              desktop: "grid-cols-[1.2fr_.8fr]",
              responsive: "md:grid-cols-[1.2fr_.8fr]",
            })} md:py-20`}
          >
            <div className="min-w-0">
              <p
                className="portfolio-typo-muted text-xs font-bold uppercase tracking-[.18em]"
                style={heroEyebrowStyle}
                data-testid={id("hero-badge")}
              >
                {content.hero.eyebrow}
              </p>
              <p
                className={`portfolio-typo-hero-body mt-4 break-words text-sm font-medium ${heroBodyFallback}`}
                style={heroBodyStyle}
              >
                {content.hero.creativeTitle}
              </p>
              <h1
                className={`portfolio-typo-hero-heading mt-3 break-words text-[clamp(2.25rem,8vw,4.5rem)] leading-[1.05] tracking-tight ${heroHeadingFallback}`}
                style={heroHeadingStyle}
                data-testid={id("hero-title")}
              >
                {content.hero.headline}{" "}
                <span
                  className="portfolio-typo-accent"
                  style={accentStyle}
                  data-testid={id("hero-accent")}
                >
                  {content.hero.headlineHighlight}
                </span>
              </h1>
              <p
                className={`portfolio-typo-hero-body mt-6 max-w-xl break-words text-base leading-relaxed ${heroBodyFallback}`}
                style={heroBodyStyle}
                data-testid={id("hero-subtitle")}
              >
                {content.hero.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {renderAction(
                  content.hero.primaryCtaLabel,
                  content.hero.primaryCtaAction,
                  true,
                  id("book-cta"),
                )}
                {renderAction(
                  content.hero.secondaryCtaLabel,
                  content.hero.secondaryCtaAction,
                  false,
                  id("secondary-cta"),
                )}
              </div>
              {videos.showreelVideo?.embedUrl &&
              isAllowedMiniSiteVideoEmbedUrl(videos.showreelVideo.embedUrl) ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowreelOpen((open) => !open)}
                    className={`portfolio-typo-hero-body mt-6 inline-flex max-w-full items-center gap-2 text-sm font-semibold ${heroBodyFallback}`}
                    style={heroBodyStyle}
                    data-testid={id("template-showreelVideo")}
                  >
                    {showreelOpen ? "Hide showreel" : "▶ Watch showreel"}
                  </button>
                  {showreelOpen ? (
                    <div className="mt-4 max-w-xl">
                      <MiniSiteVideoEmbed
                        media={videos.showreelVideo}
                        variant={variant}
                        testId={id("showreel")}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <div
              className={`min-h-64 overflow-hidden border border-white/20 shadow-2xl ${radius}`}
              style={{
                background: images.heroVisual
                  ? undefined
                  : `linear-gradient(145deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
              }}
            >
              {images.heroVisual ? (
                <img
                  src={images.heroVisual.url}
                  alt={images.heroVisual.alt || ""}
                  className="h-full min-h-64 w-full object-cover"
                />
              ) : (
                <div className="flex min-h-64 items-center justify-center text-6xl font-black text-white/80">
                  {business.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative border-t border-white/15 bg-black/25 backdrop-blur-sm">
          <div
            className={`mx-auto grid max-w-6xl divide-white/15 ${deviceGrid(previewDevice, {
              mobile: "grid-cols-1 divide-y",
              tablet: "grid-cols-3 divide-x",
              desktop: "grid-cols-3 divide-x",
              responsive: "grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0",
            })}`}
          >
            {content.hero.stats.map((stat) => (
              <div
                key={stat.id}
                className="min-w-0 px-4 py-4 sm:px-6 sm:py-5"
                data-testid={id("hero-stat")}
              >
                <b
                  className="portfolio-typo-stat-value portfolio-typo-accent block break-words text-xl"
                  style={statValueStyle}
                  data-testid={id("hero-stat-value")}
                >
                  {stat.value}
                </b>
                <span
                  className={`portfolio-typo-stat-label portfolio-typo-muted mt-1 block break-words text-xs ${heroBodyFallback}`}
                  style={statLabelStyle}
                  data-testid={id("hero-stat-label")}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {enabled.has("projects") ? (
        <section id="projects" className={sectionShell()} data-testid={id("projects")}>
          <div className="mx-auto max-w-6xl">
            <p
              className="portfolio-typo-muted text-xs font-bold uppercase tracking-[.18em]"
              style={eyebrowStyle}
            >
              Portfolio
            </p>
            <h2
              className={`portfolio-typo-heading mt-2 break-words text-3xl ${headingFallback}`}
              style={headingStyle}
              data-testid={id("projects-title")}
            >
              {content.projects.title}
            </h2>
            <p
              className={`portfolio-typo-muted mt-2 break-words ${mutedFallback}`}
              style={mutedStyle}
              data-testid={id("projects-subtitle")}
            >
              {content.projects.subtitle}
            </p>
            {content.projects.showCategoryFilter && categories.length > 1 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      item === category
                        ? "text-white"
                        : `portfolio-typo-muted border ${cardBodyFallback}`
                    }`}
                    style={
                      item === category ? { backgroundColor: config.theme.primaryColor } : undefined
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              className={`mt-8 grid items-stretch gap-5 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-3",
                responsive: "sm:grid-cols-2 lg:grid-cols-3",
              })}`}
            >
              {visibleProjects.map((project) => {
                const cover = project.coverImageUrl.trim();
                const meta = [project.clientName, project.year].filter(Boolean).join(" · ");
                return (
                  <article
                    key={project.id}
                    className={`${visuals.cardClass} min-w-0 overflow-hidden shadow-sm ${
                      project.featured && !isMobileFrame ? "md:col-span-2" : ""
                    }`}
                    data-testid={id("project-card")}
                    data-featured={project.featured ? "true" : "false"}
                  >
                    <div
                      className="aspect-[4/3] w-full"
                      style={{
                        background: cover
                          ? undefined
                          : `linear-gradient(135deg, ${config.theme.primaryColor}cc, ${config.theme.accentColor}99)`,
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover"
                          data-testid={id("project-cover")}
                        />
                      ) : (
                        <div
                          className="flex h-full items-end p-4"
                          data-testid={id("project-cover-fallback")}
                        >
                          <span className="rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white">
                            {project.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col p-5">
                      <p
                        className="portfolio-typo-muted break-words text-xs font-semibold uppercase tracking-wide"
                        data-testid={id("project-category")}
                        style={categoryStyle}
                      >
                        {project.category || "Project"}
                      </p>
                      <h3
                        className={`portfolio-typo-card-title mt-1 min-w-0 break-words text-xl ${cardTitleFallback}`}
                        style={cardTitleStyle}
                        data-testid={id("project-title")}
                      >
                        {project.title}
                      </h3>
                      <p
                        className={`portfolio-typo-card mt-2 line-clamp-3 break-words text-sm ${cardBodyFallback}`}
                        style={cardTextStyle || bodyStyle}
                        data-testid={id("project-description")}
                      >
                        {project.shortDescription}
                      </p>
                      {meta ? (
                        <p
                          className={`portfolio-typo-muted mt-3 break-words text-xs ${mutedFallback}`}
                          style={mutedStyle}
                          data-testid={id("project-meta")}
                        >
                          {meta}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`portfolio-typo-muted break-words rounded-full border border-black/5 bg-black/[0.04] px-2 py-1 text-[10px] font-semibold ${mutedFallback}`}
                            style={mutedStyle}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5">
                        {project.externalUrl.trim() ? (
                          isPreview ? (
                            <button
                              type="button"
                              disabled
                              className="portfolio-typo-button text-sm font-bold disabled:opacity-60"
                              style={{
                                fontFamily: typography.buttonFontFamily,
                                fontWeight: typography.buttonWeight,
                                ...buttonLinkStyle,
                              }}
                            >
                              View project →
                            </button>
                          ) : (
                            <a
                              href={project.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="portfolio-typo-button text-sm font-bold"
                              style={{
                                fontFamily: typography.buttonFontFamily,
                                fontWeight: typography.buttonWeight,
                                ...buttonLinkStyle,
                              }}
                            >
                              View project →
                            </a>
                          )
                        ) : (
                          <button
                            type="button"
                            className="portfolio-typo-button text-sm font-bold"
                            onClick={() => setOpenProjectId(project.id)}
                            style={{
                              fontFamily: typography.buttonFontFamily,
                              fontWeight: typography.buttonWeight,
                              ...buttonLinkStyle,
                            }}
                          >
                            View project →
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {projects.length === 0 ? (
              <p
                className={`portfolio-typo-muted mt-8 rounded-2xl border border-dashed px-5 py-5 text-sm ${mutedFallback}`}
                style={mutedStyle}
                data-testid={id("projects-empty")}
              >
                Selected projects will appear here.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {enabled.has("about") ? (
        <section id="about" className={sectionShell(true)} data-testid={id("about")}>
          <div
            className={`mx-auto grid max-w-6xl items-center gap-8 sm:gap-10 ${deviceGrid(
              previewDevice,
              {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-2",
                responsive: "md:grid-cols-2",
              },
            )}`}
          >
            <div
              className="min-h-56 overflow-hidden rounded-3xl shadow-md sm:min-h-72"
              data-testid={
                images.featuredWorkImage ? id("template-featuredWorkImage") : id("about-fallback")
              }
              style={{
                background: images.featuredWorkImage
                  ? undefined
                  : `linear-gradient(145deg, ${config.theme.accentColor}, ${config.theme.primaryColor})`,
              }}
            >
              {images.featuredWorkImage ? (
                <img
                  src={images.featuredWorkImage.url}
                  alt=""
                  className="h-full min-h-56 w-full object-cover sm:min-h-72"
                />
              ) : (
                <div className="flex min-h-56 items-center justify-center text-6xl font-black text-white/80 sm:min-h-72">
                  {business.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p
                className="portfolio-typo-muted text-xs font-bold uppercase tracking-[.18em]"
                style={eyebrowStyle}
              >
                {content.about.subtitle}
              </p>
              <h2
                className={`portfolio-typo-heading mt-2 break-words text-3xl ${headingFallback}`}
                style={headingStyle}
                data-testid={id("about-title")}
              >
                {content.about.title}
              </h2>
              <p
                className={`portfolio-typo-body mt-5 break-words leading-relaxed ${bodyFallback}`}
                style={bodyStyle}
                data-testid={id("about-bio")}
              >
                {content.about.bio || business.description}
              </p>
              <ul className="mt-6 space-y-2">
                {content.about.highlights.map((highlight) => (
                  <li
                    key={highlight.id}
                    className={`portfolio-typo-body break-words text-sm font-medium ${bodyFallback}`}
                    style={bodyStyle}
                  >
                    ✦ {highlight.text}
                  </li>
                ))}
              </ul>
              {content.about.showCta ? (
                <div className="mt-8">
                  {renderAction(content.about.ctaLabel, content.about.ctaAction)}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {enabled.has("skills") ? (
        <section className={sectionShell()} data-testid={id("skills")}>
          <div className="mx-auto max-w-6xl">
            <h2
              className={`portfolio-typo-heading break-words text-3xl ${headingFallback}`}
              style={headingStyle}
              data-testid={id("skills-title")}
            >
              {content.skills.title}
            </h2>
            <p className={`portfolio-typo-muted mt-2 ${mutedFallback}`} style={mutedStyle}>
              {content.skills.subtitle}
            </p>
            <div
              className={`mt-7 grid gap-4 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-4",
                responsive: "sm:grid-cols-2 lg:grid-cols-4",
              })}`}
            >
              {content.skills.items
                .filter((skill) => skill.visible)
                .map((skill) => (
                  <div
                    key={skill.id}
                    className={`${visuals.cardClass} min-w-0 p-5`}
                    data-testid={id("skill-card")}
                  >
                    <h3
                      className={`portfolio-typo-card-title min-w-0 break-words ${cardTitleFallback}`}
                      style={cardTitleStyle}
                    >
                      {skill.label}
                    </h3>
                    <p
                      className={`portfolio-typo-card mt-2 break-words text-sm ${cardBodyFallback}`}
                      style={cardTextStyle || bodyStyle}
                    >
                      {skill.description}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {enabled.has("services") ? (
        <section id="services" className={sectionShell(true)} data-testid={id("services")}>
          <div className="mx-auto max-w-6xl">
            <h2
              className={`portfolio-typo-heading break-words text-3xl ${headingFallback}`}
              style={headingStyle}
              data-testid={id("services-title")}
            >
              {content.services.title}
            </h2>
            <p className={`portfolio-typo-muted mt-2 ${mutedFallback}`} style={mutedStyle}>
              {content.services.subtitle}
            </p>
            {images.servicesImage ? (
              <div className="mt-6 overflow-hidden rounded-2xl" data-testid={id("template-servicesImage")}>
                <img src={images.servicesImage.url} alt="" className="h-40 w-full object-cover" />
              </div>
            ) : null}
            <div
              className={`mt-7 grid gap-4 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-3",
                responsive: "md:grid-cols-3",
              })}`}
              data-testid={id("services-grid")}
            >
              {orderedServices.map((service) => (
                <div
                  key={service.id}
                  className={`${visuals.cardClass} flex min-w-0 flex-col overflow-hidden p-5`}
                  data-testid={id("service-card")}
                >
                  {content.services.showImage ? (
                    service.image ? (
                      <ServiceCardImageArea
                        image={service.image}
                        alt={service.name}
                        aspectClassName="mb-4 aspect-[16/10] w-full shrink-0"
                      />
                    ) : (
                      <div
                        className="mb-4 flex aspect-[16/10] items-center justify-center rounded-xl text-lg font-black text-white"
                        style={{
                          background: `linear-gradient(145deg, ${config.theme.primaryColor}66, ${config.theme.accentColor}88)`,
                        }}
                        data-testid={id("service-card-fallback")}
                      >
                        {service.name.charAt(0)}
                      </div>
                    )
                  ) : null}
                  <TypeBadge type={service.type} />
                  <h3
                    className={`portfolio-typo-card-title mt-3 min-w-0 break-words ${cardTitleFallback}`}
                    style={cardTitleStyle}
                  >
                    {service.name}
                  </h3>
                  {content.services.showDescription ? (
                    <p
                      className={`portfolio-typo-card mt-2 flex-1 break-words text-sm ${cardBodyFallback}`}
                      style={cardTextStyle || bodyStyle}
                    >
                      {service.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {content.services.showPrice ? <PriceLabel service={service} /> : null}
                    {content.services.showDuration && service.duration_minutes ? (
                      <span
                        className={`portfolio-typo-muted text-xs ${mutedFallback}`}
                        style={mutedStyle}
                      >
                        {formatDuration(service.duration_minutes)}
                      </span>
                    ) : null}
                  </div>
                  {isPreview ? (
                    <button
                      type="button"
                      disabled
                      className={`portfolio-typo-button mt-5 ${radius} min-h-[44px] text-sm disabled:opacity-60 ${tokenTextClass(typography.buttonTextColor, "text-white")}`}
                      style={{
                        fontFamily: typography.buttonFontFamily,
                        fontWeight: typography.buttonWeight,
                        backgroundColor: config.theme.primaryColor,
                        ...(typography.buttonTextColor
                          ? { color: typography.buttonTextColor }
                          : {}),
                      }}
                    >
                      {content.services.buttonLabel}
                    </button>
                  ) : (
                    <Link
                      to={`/b/${publicSlug}/services/${service.id}`}
                      className={`portfolio-typo-button mt-5 inline-flex min-h-[44px] items-center justify-center ${radius} text-sm ${tokenTextClass(typography.buttonTextColor, "text-white")}`}
                      style={{
                        fontFamily: typography.buttonFontFamily,
                        fontWeight: typography.buttonWeight,
                        backgroundColor: config.theme.primaryColor,
                        ...(typography.buttonTextColor
                          ? { color: typography.buttonTextColor }
                          : {}),
                      }}
                    >
                      {content.services.buttonLabel}
                    </Link>
                  )}
                </div>
              ))}
              {orderedServices.length === 0 ? (
                <p
                  className={`portfolio-typo-muted text-sm ${mutedFallback}`}
                  style={mutedStyle}
                  data-testid={id("services-empty")}
                >
                  Active services from Admin will appear here.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {enabled.has("process") ? (
        <section className={sectionShell()} data-testid={id("process")}>
          <div className="mx-auto max-w-6xl">
            <h2
              className={`portfolio-typo-heading text-3xl ${headingFallback}`}
              style={headingStyle}
              data-testid={id("process-title")}
            >
              {content.process.title}
            </h2>
            <div
              className={`mt-7 grid gap-5 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-4",
                responsive: "md:grid-cols-4",
              })}`}
            >
              {content.process.steps.map((step, index) => (
                <div key={step.id} className="min-w-0" data-testid={id("process-step")}>
                  <span className="portfolio-typo-accent text-3xl font-black" style={accentStyle}>
                    {content.process.showNumbering
                      ? String(index + 1).padStart(2, "0")
                      : "✦"}
                  </span>
                  <h3
                    className={`portfolio-typo-card-title mt-3 break-words ${cardTitleFallback}`}
                    style={cardTitleStyle}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`portfolio-typo-body mt-2 break-words text-sm ${bodyFallback}`}
                    style={bodyStyle}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {enabled.has("testimonials") ? (
        <section className={sectionShell(true)} data-testid={id("testimonials")}>
          <div className="mx-auto max-w-6xl">
            <h2
              className={`portfolio-typo-heading text-3xl ${headingFallback}`}
              style={headingStyle}
              data-testid={id("testimonials-title")}
            >
              {content.testimonials.title}
            </h2>
            <div
              className={`mt-7 grid gap-4 ${deviceGrid(previewDevice, {
                mobile: "grid-cols-1",
                tablet: "grid-cols-2",
                desktop: "grid-cols-3",
                responsive: "md:grid-cols-3",
              })}`}
            >
              {testimonials.map((testimonial) => {
                const avatar = testimonial.avatarUrl.trim();
                return (
                  <figure
                    key={testimonial.id}
                    className={`${visuals.cardClass} min-w-0 p-5`}
                    data-testid={id("testimonial-card")}
                  >
                    <blockquote
                      className={`portfolio-typo-card break-words text-sm leading-relaxed ${cardBodyFallback}`}
                      style={cardTextStyle || bodyStyle}
                    >
                      “{testimonial.quote}”
                    </blockquote>
                    {content.testimonials.showRating ? (
                      <p className="mt-4" style={{ color: config.theme.primaryColor }}>
                        {"★".repeat(Math.max(0, Math.min(5, testimonial.rating)))}
                      </p>
                    ) : null}
                    <figcaption className="mt-4 flex min-w-0 items-center gap-3">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                          data-testid={id("testimonial-avatar")}
                        />
                      ) : (
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: config.theme.primaryColor }}
                          data-testid={id("testimonial-initials")}
                        >
                          {testimonial.avatarInitials}
                        </span>
                      )}
                      <span className="min-w-0">
                        <b
                          className={`portfolio-typo-card-title block break-words text-sm ${cardTitleFallback}`}
                          style={cardTitleStyle}
                        >
                          {testimonial.name}
                        </b>
                        <small
                          className={`portfolio-typo-muted ${mutedFallback}`}
                          style={mutedStyle}
                        >
                          {testimonial.role}
                        </small>
                      </span>
                    </figcaption>
                  </figure>
                );
              })}
              {manualTestimonialsEmpty ? (
                <p
                  className={`portfolio-typo-muted mt-6 max-w-md rounded-2xl border border-dashed px-5 py-5 text-sm ${mutedFallback}`}
                  style={mutedStyle}
                  data-testid={id("testimonials-empty")}
                >
                  Client feedback will appear here.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {enabled.has("contact") ? (
        <section
          id="contact"
          className={`${
            content.contactCta.backgroundStyle === "dark"
              ? "bg-slate-950"
              : content.contactCta.backgroundStyle === "primary"
                ? ""
                : visuals.sectionAltClass
          } px-4 py-12 sm:px-6 sm:py-16 md:px-8`}
          style={
            content.contactCta.backgroundStyle === "primary"
              ? { backgroundColor: config.theme.primaryColor }
              : undefined
          }
          data-testid={id("contact")}
        >
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
            <div className="min-w-0">
              <h2
                className={`portfolio-typo-heading break-words text-[clamp(2rem,7vw,3rem)] ${
                  contactIsSoft
                    ? headingFallback
                    : contactUsesThemeText && !typography.headingColor
                      ? "text-white"
                      : headingFallback
                }`}
                style={
                  typography.headingColor
                    ? headingStyle
                    : {
                        fontFamily: typography.headingFontFamily,
                        fontWeight: typography.headingWeight,
                      }
                }
                data-testid={id("contact-title")}
              >
                {content.contactCta.headline}
              </h2>
              <p
                className={`portfolio-typo-body mt-4 break-words ${
                  contactIsSoft
                    ? bodyFallback
                    : contactUsesThemeText && !typography.bodyColor
                      ? "text-white/80"
                      : bodyFallback
                }`}
                style={bodyStyle}
                data-testid={id("contact-subtitle")}
              >
                {content.contactCta.subtitle}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {renderAction(
                  content.contactCta.primaryCtaLabel,
                  content.contactCta.primaryCtaAction,
                )}
                {renderAction(
                  content.contactCta.secondaryCtaLabel,
                  content.contactCta.secondaryCtaAction,
                  false,
                )}
              </div>
            </div>
            {images.collaborationImage ? (
              <img
                src={images.collaborationImage.url}
                alt=""
                className="h-56 w-full rounded-3xl object-cover"
                data-testid={id("template-collaborationImage")}
              />
            ) : (
              <div className="min-h-40 rounded-3xl bg-white/10" aria-hidden="true" />
            )}
          </div>
        </section>
      ) : null}

      {enabled.has("footer") ? (
        <footer
          className={`${visuals.footerClass} px-4 py-10 sm:px-6 md:px-8`}
          data-testid={id("footer")}
        >
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
            <div className="min-w-0">
              <b
                className={`portfolio-typo-heading break-words ${headingFallback}`}
                style={headingStyle}
              >
                {business.name}
              </b>
              <p
                className={`portfolio-typo-muted mt-2 break-words text-sm ${mutedFallback}`}
                style={mutedStyle}
                data-testid={id("footer-description")}
              >
                {content.footer.description}
              </p>
            </div>
            {content.footer.showQuickLinks ? (
              <div>
                <b className={`portfolio-typo-heading ${headingFallback}`} style={headingStyle}>
                  Explore
                </b>
                <p
                  className={`portfolio-typo-muted mt-2 text-sm ${mutedFallback}`}
                  style={mutedStyle}
                >
                  About · Services · Contact
                </p>
              </div>
            ) : null}
            {content.footer.showProjectsLinks ? (
              <div className="min-w-0">
                <b className={`portfolio-typo-heading ${headingFallback}`} style={headingStyle}>
                  Projects
                </b>
                <p
                  className={`portfolio-typo-muted mt-2 break-words text-sm ${mutedFallback}`}
                  style={mutedStyle}
                >
                  {projects
                    .slice(0, 3)
                    .map((project) => project.title)
                    .join(" · ") || "Selected work"}
                </p>
              </div>
            ) : null}
            {content.footer.showContactInfo ? (
              <div className="min-w-0">
                <b className={`portfolio-typo-heading ${headingFallback}`} style={headingStyle}>
                  Connect
                </b>
                <p
                  className={`portfolio-typo-muted mt-2 break-words text-sm ${mutedFallback}`}
                  style={mutedStyle}
                >
                  {[phone, ...getVisibleSocialLinks(config.socialLinks).map((item) => item.value)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
          <p
            className={`portfolio-typo-muted mx-auto mt-8 max-w-6xl text-xs ${mutedFallback}`}
            style={mutedStyle}
            data-testid={id("footer-copyright")}
          >
            {content.footer.copyrightText ||
              `© ${new Date().getFullYear()} ${business.name}`}
          </p>
        </footer>
      ) : null}

      {selectedProject ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenProjectId(null)}
          data-testid={id("project-modal")}
          role="dialog"
          aria-modal="true"
        >
          <article
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenProjectId(null)}
              className="float-right text-xl"
              aria-label="Close"
            >
              ×
            </button>
            <h2
              className={`portfolio-typo-heading break-words text-2xl ${headingFallback}`}
              style={headingStyle}
            >
              {selectedProject.title}
            </h2>
            <p
              className={`portfolio-typo-body mt-4 whitespace-pre-line break-words ${bodyFallback}`}
              style={bodyStyle}
            >
              {selectedProject.fullDescription || selectedProject.shortDescription}
            </p>
            {selectedProject.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-1">
                {selectedProject.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`portfolio-typo-muted rounded-full bg-slate-100 px-2 py-1 text-xs ${mutedFallback}`}
                    style={mutedStyle}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </main>
  );
}
