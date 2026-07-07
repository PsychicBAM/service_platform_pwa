import { getEnabledMiniSiteSections } from "@/lib/miniSiteConfig";
import {
  getMiniSitePageShellClass,
  getMiniSiteTemplatePresentation,
} from "@/lib/miniSiteTemplatePresentation";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteConfig,
  MiniSiteSectionType,
} from "@/types/miniSite";

export type MiniSiteLivePreviewProps = {
  config: MiniSiteConfig;
  businessName?: string;
};

function getSectionField(
  config: MiniSiteConfig,
  type: MiniSiteSectionType,
  field: "title" | "subtitle" | "body",
): string {
  const section = config.sections.find((entry) => entry.type === type);
  return section?.[field] ?? "";
}

function isSectionEnabled(config: MiniSiteConfig, type: MiniSiteSectionType): boolean {
  return config.sections.some((section) => section.type === type && section.enabled);
}

function previewMutedTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-300" : "text-slate-600";
}

function previewBorderClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "border-slate-700/80" : "border-slate-200";
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

function previewCardClass(backgroundStyle: MiniSiteBackgroundStyle, extra = ""): string {
  const surface =
    backgroundStyle === "dark"
      ? "border-slate-700/80 bg-slate-800/50 text-slate-100"
      : "border-slate-200 bg-white text-slate-900";
  return `rounded-xl border p-4 ${surface} ${extra}`;
}

export function MiniSiteLivePreview({ config, businessName = "Your business" }: MiniSiteLivePreviewProps) {
  const { theme, socialLinks } = config;
  const enabledSections = getEnabledMiniSiteSections(config);
  const heroTitle = getSectionField(config, "hero", "title") || businessName;
  const heroSubtitle = getSectionField(config, "hero", "subtitle");
  const heroBody = getSectionField(config, "hero", "body");
  const aboutTitle = getSectionField(config, "about", "title") || "About";
  const aboutBody = getSectionField(config, "about", "body");
  const contactTitle = getSectionField(config, "contact", "title") || "Contact";
  const bookingTitle = getSectionField(config, "booking_cta", "title") || "Book now";
  const mutedText = previewMutedTextClass(theme.backgroundStyle);
  const borderClass = previewBorderClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(theme.template, theme.backgroundStyle);
  const pageShell = getMiniSitePageShellClass(theme.backgroundStyle);

  return (
    <div
      className="space-y-3"
      data-testid="mini-site-live-preview"
      data-template={theme.template}
      data-template-presentation={theme.template}
      data-background-style={theme.backgroundStyle}
      data-button-style={theme.buttonStyle}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
          style={{
            color: theme.accentColor,
            backgroundColor: `${theme.accentColor}15`,
          }}
        >
          {theme.template}
        </span>
      </div>

      <div className={`${pageShell} ${presentation.layoutClass}`} data-testid="mini-site-preview-frame">
        <div className="space-y-4">
          {isSectionEnabled(config, "hero") ? (
            <header
              className={`relative overflow-hidden ${previewCardClass(theme.backgroundStyle, presentation.heroClass)} ${presentation.heroLayoutClass}`}
              data-testid="mini-site-preview-hero"
              style={{
                borderColor: theme.template === "service" ? theme.primaryColor : theme.accentColor,
                borderLeftColor: theme.template === "service" ? theme.primaryColor : undefined,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{
                  background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor})`,
                }}
                aria-hidden
              />
              <div
                className={`flex h-14 w-14 items-center justify-center text-xl font-bold shadow-sm ${
                  theme.template === "expert" ? "rounded-full" : "rounded-xl"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
                data-testid="mini-site-preview-logo-placeholder"
              >
                {businessName.charAt(0).toUpperCase()}
              </div>
              <p
                className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}18` }}
              >
                {presentation.heroBadge}
              </p>
              <h4 className={presentation.heroTitleClass} data-testid="mini-site-preview-hero-title">
                {heroTitle}
              </h4>
              {heroSubtitle ? (
                <p className={`text-sm font-medium ${mutedText}`} data-testid="mini-site-preview-hero-subtitle">
                  {heroSubtitle}
                </p>
              ) : null}
              {heroBody ? (
                <p className={`text-sm leading-relaxed ${mutedText}`} data-testid="mini-site-preview-hero-body">
                  {heroBody}
                </p>
              ) : null}
            </header>
          ) : null}

          {isSectionEnabled(config, "about") ? (
            <section className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)} data-testid="mini-site-preview-about">
              <div className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: theme.accentColor }} aria-hidden />
              <h4 className={presentation.sectionHeadingClass} data-testid="mini-site-preview-about-title">
                {aboutTitle}
              </h4>
              {aboutBody ? (
                <p className={`mt-2 text-sm leading-relaxed ${mutedText}`} data-testid="mini-site-preview-about-body">
                  {aboutBody}
                </p>
              ) : (
                <p className={`mt-2 text-sm italic ${mutedText}`}>About text will appear here.</p>
              )}
            </section>
          ) : null}

          {isSectionEnabled(config, "services") ? (
            <section
              className={previewCardClass(theme.backgroundStyle, `${presentation.sectionClass} ${presentation.servicesClass}`)}
              data-testid="mini-site-preview-services"
              style={
                theme.template === "service"
                  ? { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }
                  : undefined
              }
            >
              <div className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
              <p className="text-sm font-semibold">Services</p>
              <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                Your public services list will appear on the live page.
              </p>
            </section>
          ) : null}

          {isSectionEnabled(config, "booking_cta") ? (
            <button
              type="button"
              disabled
              className={`w-full px-4 py-2.5 text-sm font-semibold text-white shadow-md ${buttonRadiusClass(theme.buttonStyle)}`}
              data-testid="mini-site-preview-primary-button"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {bookingTitle}
            </button>
          ) : null}

          {isSectionEnabled(config, "contact") || socialLinks.website || socialLinks.instagram ? (
            <section className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)} data-testid="mini-site-preview-contact">
              <h4 className="text-sm font-semibold">{contactTitle}</h4>
              <div className={`mt-2 space-y-1 text-sm ${mutedText}`}>
                {socialLinks.website ? (
                  <p data-testid="mini-site-preview-website">{socialLinks.website}</p>
                ) : null}
                {socialLinks.instagram ? (
                  <p data-testid="mini-site-preview-instagram">{socialLinks.instagram}</p>
                ) : null}
                {!socialLinks.website && !socialLinks.instagram ? (
                  <p className="italic">Social links will appear here.</p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section
            className={`${previewCardClass(theme.backgroundStyle, `border-dashed text-center ${presentation.galleryClass}`)} py-6`}
            data-testid="mini-site-preview-gallery-placeholder"
            style={
              theme.template === "portfolio"
                ? { borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}12` }
                : undefined
            }
          >
            <p className={`text-xs font-medium ${mutedText}`}>Gallery coming soon</p>
          </section>

          <p className={`text-center text-[10px] ${mutedText}`}>
            {enabledSections.length} enabled section{enabledSections.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}
