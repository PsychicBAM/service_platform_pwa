import { getEnabledMiniSiteSections } from "@/lib/miniSiteConfig";
import {
  getMiniSitePageShellClass,
  getMiniSitePageShellStyle,
  getMiniSiteTemplatePresentation,
} from "@/lib/miniSiteTemplatePresentation";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteConfig,
  MiniSiteSectionType,
  MiniSiteTemplate,
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
      ? "border-slate-700/80 bg-slate-900/60 text-slate-100 shadow-md"
      : "border-slate-200/90 bg-white text-slate-900 shadow-sm";
  return `rounded-xl border p-5 ${surface} ${extra}`;
}

function PreviewTrustStats({
  stats,
  primaryColor,
  isDark,
}: {
  stats: { value: string; label: string }[];
  primaryColor: string;
  isDark: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2" data-testid="mini-site-preview-trust-stats">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-lg border px-2 py-2 text-center ${
            isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/80"
          }`}
        >
          <p className="text-xs font-bold" style={{ color: primaryColor }}>
            {stat.value}
          </p>
          <p className={`mt-0.5 text-[9px] font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function PreviewBenefitsStrip({
  primaryColor,
  isDark,
  template,
}: {
  primaryColor: string;
  isDark: boolean;
  template: MiniSiteTemplate;
}) {
  const benefit = template === "clinic" ? "Flexible scheduling" : "Fast response";

  return (
    <div
      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
        isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50/80"
      }`}
      data-testid="mini-site-preview-benefits-strip"
    >
      <span
        className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: primaryColor }}
        aria-hidden
      >
        ✓
      </span>
      {benefit}
    </div>
  );
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
  const isDark = theme.backgroundStyle === "dark";
  const mutedText = previewMutedTextClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(theme.template, theme.backgroundStyle);
  const pageShellClass = getMiniSitePageShellClass();
  const pageShellStyle = getMiniSitePageShellStyle(theme.backgroundColor, theme.backgroundStyle);
  const benefitsSectionEnabled = config.sections.some(
    (section) => section.type === "benefits" && section.enabled,
  );

  return (
    <div
      className="space-y-3"
      data-testid="mini-site-live-preview"
      data-template={theme.template}
      data-template-presentation={theme.template}
      data-background-style={theme.backgroundStyle}
      data-background-color={theme.backgroundColor}
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

      <div
        className={`${pageShellClass} ${presentation.layoutClass}`}
        style={pageShellStyle}
        data-testid="mini-site-preview-frame"
      >
        <div className="space-y-5">
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
              <div className="min-w-0 flex-1 space-y-2">
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
              </div>
              {presentation.showTrustStats ? (
                <PreviewTrustStats
                  stats={presentation.trustStats}
                  primaryColor={theme.primaryColor}
                  isDark={isDark}
                />
              ) : null}
              {presentation.showBenefitsStrip && !benefitsSectionEnabled ? (
                <PreviewBenefitsStrip
                  primaryColor={theme.primaryColor}
                  isDark={isDark}
                  template={theme.template}
                />
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
              <p className={`text-sm font-semibold ${theme.template === "portfolio" ? "uppercase tracking-wide" : ""}`}>
                Services
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                Your public services list will appear on the live page.
              </p>
            </section>
          ) : null}

          {isSectionEnabled(config, "booking_cta") ? (
            <button
              type="button"
              disabled
              className={`w-full px-5 py-3 text-sm font-semibold text-white shadow-md ${buttonRadiusClass(theme.buttonStyle)}`}
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
            className={`${previewCardClass(theme.backgroundStyle, `border-dashed text-center ${presentation.galleryClass}`)} py-8`}
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
