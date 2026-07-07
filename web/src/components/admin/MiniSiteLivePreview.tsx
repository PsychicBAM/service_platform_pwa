import { formatServicesSectionBadge, getEnabledMiniSiteSections } from "@/lib/miniSiteConfig";
import {
  getMiniSitePageShellClass,
  getMiniSitePageShellStyle,
  getMiniSitePreviewDeviceFrameClass,
  getMiniSitePreviewDeviceScreenClass,
  getMiniSitePreviewDeviceShellClass,
  getMiniSiteTemplatePresentation,
  getThemedServiceCardPresentation,
} from "@/lib/miniSiteTemplatePresentation";
import type {
  MiniSiteBackgroundStyle,
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

function previewCardClass(backgroundStyle: MiniSiteBackgroundStyle, extra = ""): string {
  const surface =
    backgroundStyle === "dark"
      ? "border-slate-700/80 bg-slate-900/60 text-slate-100 shadow-md"
      : "border-slate-200/90 bg-white text-slate-900 shadow-sm";
  return `rounded-xl border p-4 ${surface} ${extra}`;
}

export function MiniSiteLivePreview({ config, businessName = "Your business" }: MiniSiteLivePreviewProps) {
  const { theme, socialLinks, copy } = config;
  const enabledSections = getEnabledMiniSiteSections(config);
  const heroTitle = getSectionField(config, "hero", "title") || businessName;
  const heroSubtitle = getSectionField(config, "hero", "subtitle");
  const heroBody = getSectionField(config, "hero", "body");
  const aboutTitle = getSectionField(config, "about", "title") || "About";
  const aboutBody = getSectionField(config, "about", "body");
  const servicesTitle = copy.servicesSectionTitle || getSectionField(config, "services", "title") || "Services";
  const contactTitle = copy.contactSectionTitle || getSectionField(config, "contact", "title") || "Contact";
  const primaryCtaLabel = copy.primaryCtaLabel || getSectionField(config, "booking_cta", "title") || "Book now";
  const isDark = theme.backgroundStyle === "dark";
  const mutedText = previewMutedTextClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(
    theme.template,
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const pageShellClass = getMiniSitePageShellClass(true);
  const pageShellStyle = getMiniSitePageShellStyle(theme.backgroundColor, theme.backgroundStyle);
  const benefitsSectionEnabled = config.sections.some(
    (section) => section.type === "benefits" && section.enabled,
  );
  const serviceCardStyle = getThemedServiceCardPresentation(
    theme.template,
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const servicesBadge = formatServicesSectionBadge(copy.servicesSectionBadgeText, 2);

  const previewContent = (
    <div
      className={`${pageShellClass} ${presentation.layoutClass.replace("max-w-5xl", "").replace("max-w-3xl", "")}`}
      style={pageShellStyle}
      data-testid="mini-site-preview-frame"
    >
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
              className={`flex h-14 w-14 shrink-0 items-center justify-center text-xl font-bold shadow-sm ${
                theme.template === "expert" ? "rounded-full" : "rounded-xl"
              }`}
              style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
              data-testid="mini-site-preview-logo-placeholder"
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p
                className="inline-flex max-w-full break-words rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}18` }}
                data-testid="mini-site-preview-hero-badge"
              >
                {copy.heroBadgeText}
              </p>
              <h4 className={presentation.heroTitleClass} data-testid="mini-site-preview-hero-title">
                {heroTitle}
              </h4>
              {heroSubtitle ? (
                <p
                  className={`break-words text-sm font-medium ${mutedText}`}
                  data-testid="mini-site-preview-hero-subtitle"
                >
                  {heroSubtitle}
                </p>
              ) : null}
              {heroBody ? (
                <p
                  className={`break-words text-sm leading-relaxed ${mutedText}`}
                  data-testid="mini-site-preview-hero-body"
                >
                  {heroBody}
                </p>
              ) : null}
            </div>
            {presentation.showTrustStats ? (
              <div className="mt-3 grid w-full grid-cols-3 gap-2" data-testid="mini-site-preview-trust-stats">
                {copy.trustCards.map((stat) => (
                  <div
                    key={stat.subtitle}
                    className={`rounded-lg border px-2 py-2 text-center ${
                      isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/80"
                    }`}
                  >
                    <p className="break-words text-xs font-bold" style={{ color: theme.primaryColor }}>
                      {stat.title}
                    </p>
                    <p
                      className={`mt-0.5 break-words text-[9px] font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {stat.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {presentation.showBenefitsStrip && !benefitsSectionEnabled ? (
              <div
                className={`mt-3 w-full rounded-lg border px-3 py-2 ${
                  isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50/80"
                }`}
                data-testid="mini-site-preview-benefits-strip"
              >
                <p className={`mb-1 break-words text-[10px] font-semibold uppercase ${mutedText}`}>
                  {copy.benefitsSectionTitle}
                </p>
                <p className={`break-words text-xs ${mutedText}`}>{copy.benefitsItems[0]}</p>
              </div>
            ) : null}
            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                disabled
                className={presentation.primaryButtonClass}
                data-testid="mini-site-preview-primary-button"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {primaryCtaLabel}
              </button>
              <button
                type="button"
                disabled
                className={presentation.secondaryButtonClass}
                data-testid="mini-site-preview-secondary-button"
                style={{ borderColor: theme.accentColor, color: theme.accentColor }}
              >
                {copy.secondaryCtaLabel}
              </button>
            </div>
          </header>
        ) : null}

        {isSectionEnabled(config, "about") ? (
          <section
            className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
            data-testid="mini-site-preview-about"
          >
            <div className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: theme.accentColor }} aria-hidden />
            <h4 className={presentation.sectionHeadingClass} data-testid="mini-site-preview-about-title">
              {aboutTitle}
            </h4>
            {aboutBody ? (
              <p className={`mt-2 break-words text-sm leading-relaxed ${mutedText}`} data-testid="mini-site-preview-about-body">
                {aboutBody}
              </p>
            ) : (
              <p className={`mt-2 text-sm italic ${mutedText}`}>About text will appear here.</p>
            )}
          </section>
        ) : null}

        {isSectionEnabled(config, "services") ? (
          <section
            className={previewCardClass(
              theme.backgroundStyle,
              `${presentation.sectionClass} ${presentation.servicesClass}`,
            )}
            data-testid="mini-site-preview-services"
            style={
              theme.template === "service"
                ? { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }
                : undefined
            }
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 h-1 w-8 rounded-full" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
                <p
                  className={`break-words text-sm font-semibold ${theme.template === "portfolio" ? "uppercase tracking-wide" : ""}`}
                  data-testid="mini-site-preview-services-title"
                >
                  {servicesTitle}
                </p>
              </div>
              {servicesBadge ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}
                >
                  {servicesBadge}
                </span>
              ) : null}
            </div>
            <div className={`${serviceCardStyle.cardClass} mt-2`} style={{ borderColor: `${theme.primaryColor}44` }}>
              <p className={serviceCardStyle.titleClass}>Sample service</p>
              <p className={serviceCardStyle.descriptionClass}>Your services will appear here on the live page.</p>
              <button
                type="button"
                disabled
                className={serviceCardStyle.buttonClass}
                style={{ backgroundColor: theme.primaryColor }}
              >
                View service
              </button>
            </div>
          </section>
        ) : null}

        {isSectionEnabled(config, "contact") || socialLinks.website || socialLinks.instagram ? (
          <section
            className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
            data-testid="mini-site-preview-contact"
          >
            <h4 className="break-words text-sm font-semibold" data-testid="mini-site-preview-contact-title">
              {contactTitle}
            </h4>
            <div className={`mt-2 space-y-1 break-words text-sm ${mutedText}`}>
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
  );

  return (
    <div
      className="space-y-3 lg:sticky lg:top-4"
      data-testid="mini-site-live-preview"
      data-template={theme.template}
      data-template-presentation={theme.template}
      data-background-style={theme.backgroundStyle}
      data-background-color={theme.backgroundColor}
      data-button-style={theme.buttonStyle}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile preview</p>
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

      <div className={getMiniSitePreviewDeviceShellClass()} data-testid="mini-site-preview-device-shell">
        <div className={getMiniSitePreviewDeviceFrameClass()}>
          <div className="rounded-[1.35rem] bg-slate-800 px-4 py-2 text-center">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-600" aria-hidden />
          </div>
          <div className={getMiniSitePreviewDeviceScreenClass()}>{previewContent}</div>
        </div>
      </div>
    </div>
  );
}
