import { getEnabledMiniSiteSections } from "@/lib/miniSiteConfig";
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

function previewSurfaceClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  switch (backgroundStyle) {
    case "dark":
      return "bg-slate-900 text-slate-100";
    case "soft":
      return "bg-slate-50 text-slate-900";
    default:
      return "bg-white text-slate-900";
  }
}

function previewMutedTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-300" : "text-slate-600";
}

function previewBorderClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "border-slate-700" : "border-slate-200";
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

export function MiniSiteLivePreview({ config, businessName = "Your business" }: MiniSiteLivePreviewProps) {
  const { theme, socialLinks } = config;
  const enabledSections = getEnabledMiniSiteSections(config);
  const heroTitle = getSectionField(config, "hero", "title") || businessName;
  const heroSubtitle = getSectionField(config, "hero", "subtitle");
  const heroBody = getSectionField(config, "hero", "body");
  const aboutTitle = getSectionField(config, "about", "title") || "About";
  const aboutBody = getSectionField(config, "about", "body");
  const contactTitle = getSectionField(config, "contact", "title") || "Contact";
  const bookingTitle =
    getSectionField(config, "booking_cta", "title") || "Book now";
  const mutedText = previewMutedTextClass(theme.backgroundStyle);
  const borderClass = previewBorderClass(theme.backgroundStyle);

  return (
    <div
      className="space-y-3"
      data-testid="mini-site-live-preview"
      data-template={theme.template}
      data-background-style={theme.backgroundStyle}
      data-button-style={theme.buttonStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Live preview</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {theme.template}
        </span>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border shadow-sm ${borderClass} ${previewSurfaceClass(theme.backgroundStyle)}`}
        data-testid="mini-site-preview-frame"
        style={{
          borderColor: theme.accentColor,
        }}
      >
        <div className="space-y-4 p-4">
          {isSectionEnabled(config, "hero") ? (
            <header
              className={`space-y-2 rounded-xl border p-4 ${borderClass}`}
              data-testid="mini-site-preview-hero"
              style={{ borderColor: theme.primaryColor }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${mutedText}`}
                style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
                data-testid="mini-site-preview-logo-placeholder"
              >
                {businessName.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: theme.accentColor }}>
                Cover image coming soon
              </p>
              <h4 className="text-lg font-semibold" data-testid="mini-site-preview-hero-title">
                {heroTitle}
              </h4>
              {heroSubtitle ? (
                <p className={`text-sm ${mutedText}`} data-testid="mini-site-preview-hero-subtitle">
                  {heroSubtitle}
                </p>
              ) : null}
              {heroBody ? (
                <p className={`text-sm ${mutedText}`} data-testid="mini-site-preview-hero-body">
                  {heroBody}
                </p>
              ) : null}
            </header>
          ) : null}

          {isSectionEnabled(config, "about") ? (
            <section className="space-y-1" data-testid="mini-site-preview-about">
              <h4 className="text-sm font-semibold" data-testid="mini-site-preview-about-title">
                {aboutTitle}
              </h4>
              {aboutBody ? (
                <p className={`text-sm ${mutedText}`} data-testid="mini-site-preview-about-body">
                  {aboutBody}
                </p>
              ) : (
                <p className={`text-sm italic ${mutedText}`}>About text will appear here.</p>
              )}
            </section>
          ) : null}

          {isSectionEnabled(config, "services") ? (
            <section
              className={`rounded-xl border p-3 ${borderClass}`}
              data-testid="mini-site-preview-services"
            >
              <p className="text-sm font-medium">Services preview</p>
              <p className={`mt-1 text-xs ${mutedText}`}>
                Your public services list will appear on the live page.
              </p>
            </section>
          ) : null}

          {isSectionEnabled(config, "booking_cta") ? (
            <button
              type="button"
              disabled
              className={`w-full px-4 py-2 text-sm font-medium text-white ${buttonRadiusClass(theme.buttonStyle)}`}
              data-testid="mini-site-preview-primary-button"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {bookingTitle}
            </button>
          ) : null}

          {isSectionEnabled(config, "contact") ||
          socialLinks.website ||
          socialLinks.instagram ? (
            <section className="space-y-2" data-testid="mini-site-preview-contact">
              <h4 className="text-sm font-semibold">{contactTitle}</h4>
              <div className={`space-y-1 text-sm ${mutedText}`}>
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
            className={`rounded-xl border border-dashed p-3 text-center text-xs ${borderClass} ${mutedText}`}
            data-testid="mini-site-preview-gallery-placeholder"
          >
            Gallery coming soon
          </section>

          <p className={`text-center text-[10px] ${mutedText}`}>
            {enabledSections.length} enabled section{enabledSections.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}
