import {
  ClinicAboutSection,
  ClinicContactSection,
  ClinicFaqSection,
  ClinicHeroSection,
  ClinicServicesSection,
  ClinicTrustSection,
} from "@/components/public/ClinicProMiniSiteSections";
import {
  PortfolioAboutSection,
  PortfolioContactSection,
  PortfolioFaqSection,
  PortfolioHeroSection,
  PortfolioProcessSection,
  PortfolioWorkSection,
} from "@/components/public/PortfolioProMiniSiteSections";
import {
  TeacherAboutSection,
  TeacherContactSection,
  TeacherFaqSection,
  TeacherHeroSection,
  TeacherLearningSection,
  TeacherLessonsSection,
} from "@/components/public/TeacherProMiniSiteSections";
import {
  CoachAboutSection,
  CoachContactSection,
  CoachFaqSection,
  CoachHeroSection,
  CoachProgramsSection,
  CoachTransformationSection,
} from "@/components/public/CoachProMiniSiteSections";
import {
  ExpertAboutSection,
  ExpertContactSection,
  ExpertFaqSection,
  ExpertHeroSection,
  ExpertServicesSection,
  ExpertTrustSection,
} from "@/components/public/ExpertProMiniSiteSections";
import {
  ServiceAboutSection,
  ServiceContactSection,
  ServiceFaqSection,
  ServiceHeroSection,
  ServiceServicesSection,
  ServiceTrustSection,
} from "@/components/public/ServiceProMiniSiteSections";
import {
  CleanAboutSection,
  CleanContactSection,
  CleanFaqSection,
  CleanHeroSection,
  CleanServicesSection,
  CleanTrustSection,
} from "@/components/public/CleanProMiniSiteSections";
import type { PublicBusiness } from "@/types/api";
import {
  formatServicesSectionBadge,
  getEnabledMiniSiteSections,
  getVisibleFaqItems,
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
} from "@/lib/miniSiteConfig";
import { getTemplateImageSlots } from "@/lib/miniSiteMedia";
import {
  getMiniSitePageShellStyle,
  getMiniSitePreviewHeroContentClass,
  getMiniSitePreviewHeroTitleClass,
  getMiniSitePreviewOuterShellClass,
  getMiniSitePreviewPageShellClass,
  getMiniSitePreviewPrimaryButtonClass,
  getMiniSitePreviewScaledViewportStyle,
  getMiniSitePreviewSecondaryButtonClass,
  getMiniSitePreviewSectionHeadingClass,
  getMiniSitePreviewServiceCardPresentation,
  getMiniSiteTemplatePresentation,
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

function previewMutedTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-300" : "text-slate-600";
}

function previewCardClass(backgroundStyle: MiniSiteBackgroundStyle, extra = ""): string {
  const surface =
    backgroundStyle === "dark"
      ? "border-slate-700/80 bg-slate-900/60 text-slate-100 shadow-md"
      : "border-slate-200/90 bg-white text-slate-900 shadow-sm";
  return `rounded-lg border p-3 ${surface} ${extra}`;
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
  const primaryCtaLabel = copy.primaryCtaLabel.trim();
  const secondaryCtaLabel = copy.secondaryCtaLabel.trim();
  const visibleSocialLinks = getVisibleSocialLinks(socialLinks);
  const isDark = theme.backgroundStyle === "dark";
  const mutedText = previewMutedTextClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(
    theme.template,
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const templateImages = getTemplateImageSlots(config.templateMedia, theme.template);
  const viewport = getMiniSitePreviewScaledViewportStyle();
  const pageShellClass = getMiniSitePreviewPageShellClass();
  const pageShellStyle = getMiniSitePageShellStyle(theme.backgroundColor, theme.backgroundStyle);
  const heroContentClass = getMiniSitePreviewHeroContentClass(theme.template);
  const heroTitleClass = getMiniSitePreviewHeroTitleClass(theme.template);
  const sectionHeadingClass = getMiniSitePreviewSectionHeadingClass(theme.template);
  const primaryButtonClass = getMiniSitePreviewPrimaryButtonClass(theme.buttonStyle);
  const secondaryButtonClass = getMiniSitePreviewSecondaryButtonClass(
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const benefitsSectionEnabled = config.sections.some(
    (section) => section.type === "benefits" && section.enabled,
  );
  const serviceCardStyle = getMiniSitePreviewServiceCardPresentation(
    theme.template,
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const servicesBadge = formatServicesSectionBadge(copy.servicesSectionBadgeText, 2);
  const faqItems = copy.faqItems ?? [];
  const visibleFaqItems = getVisibleFaqItems(faqItems);

  const isCleanTemplate = theme.template === "clean";
  const isServiceTemplate = theme.template === "service";
  const isExpertTemplate = theme.template === "expert";
  const isClinicTemplate = theme.template === "clinic";
  const isPortfolioTemplate = theme.template === "portfolio";
  const isTeacherTemplate = theme.template === "teacher";
  const isCoachTemplate = theme.template === "coach";
  const trustSectionEnabled = enabledSections.some((section) => section.type === "trust");
  const cleanTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
  };
  const serviceTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const expertTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const clinicTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const portfolioTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const teacherTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const coachTheme = {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const previewBusiness = {
    name: businessName,
    logo_url: null,
    operating_mode: "both",
  } as PublicBusiness;
  const showCleanHeroTrustStrip =
    isCleanTemplate &&
    presentation.showTrustStats &&
    !trustSectionEnabled &&
    copy.trustCards.length > 0;
  const showServiceHeroTrustPills =
    isServiceTemplate &&
    presentation.showTrustStats &&
    !trustSectionEnabled &&
    copy.trustCards.length > 0;
  const serviceBenefitHighlights = copy.benefitsItems.filter(Boolean).slice(0, 3);
  const showExpertHeroCredibility =
    isExpertTemplate &&
    presentation.showTrustStats &&
    !trustSectionEnabled &&
    copy.trustCards.length > 0;

  const orderedSectionTypes = enabledSections
    .filter((section) =>
      ["hero", "about", "services", "trust", "faq", "contact"].includes(section.type),
    )
    .map((section) => section.type);

  function renderTrust() {
    return (
      <section
        className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
        data-testid="mini-site-preview-trust"
      >
        {presentation.showTrustStats ? (
          <div className="grid grid-cols-3 gap-1.5" data-testid="mini-site-preview-trust-stats">
            {copy.trustCards.map((stat) => (
              <div
                key={stat.subtitle}
                className={`min-w-0 text-center ${
                  isCleanTemplate
                    ? `rounded-lg border px-2 py-2 ${
                        isDark ? "border-slate-700/60 bg-slate-900/30" : "border-slate-200/55 bg-white shadow-sm"
                      }`
                    : `rounded-md border px-1.5 py-1.5 ${
                        isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/80"
                      }`
                }`}
              >
                <p
                  className="text-xs font-bold leading-snug whitespace-normal"
                  style={{ color: theme.primaryColor }}
                >
                  {stat.title}
                </p>
                <p
                  className={`mt-0.5 text-[10px] font-medium uppercase leading-snug whitespace-normal ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {presentation.showBenefitsStrip && !benefitsSectionEnabled ? (
          <div
            className={`mt-3 rounded-md border px-2.5 py-2 ${
              isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50/80"
            }`}
            data-testid="mini-site-preview-benefits-strip"
          >
            <p className={`mb-1 text-[10px] font-semibold uppercase whitespace-normal ${mutedText}`}>
              {copy.benefitsSectionTitle}
            </p>
            <ul className="space-y-1">
              {copy.benefitsItems.filter(Boolean).map((item) => (
                <li key={item} className={`text-xs leading-snug whitespace-normal ${mutedText}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    );
  }

  function renderCleanPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <CleanHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={cleanTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            showHeroTrustStrip={showCleanHeroTrustStrip}
            operatingMode="both"
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <CleanAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={cleanTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <CleanServicesSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={cleanTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <CleanTrustSection
            {...shell}
            copy={copy}
            theme={cleanTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <CleanFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <CleanContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={cleanTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderExpertPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <ExpertHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={expertTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            showHeroCredibility={showExpertHeroCredibility}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ExpertAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={expertTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <ExpertServicesSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={expertTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ExpertTrustSection
            {...shell}
            copy={copy}
            theme={expertTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <ExpertFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <ExpertContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={expertTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderClinicPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <ClinicHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={clinicTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            serviceCount={2}
            contactPhone=""
            contactAddress=""
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ClinicAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={clinicTheme}
            isDark={isDark}
            businessName={businessName}
            copy={copy}
          />
        );
      case "services":
        return (
          <ClinicServicesSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={clinicTheme}
            isDark={isDark}
            primaryCtaLabel={primaryCtaLabel}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ClinicTrustSection
            {...shell}
            copy={copy}
            theme={clinicTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <ClinicFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={clinicTheme}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <ClinicContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={clinicTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderServicePreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <ServiceHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={serviceTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            serviceCount={2}
            benefitHighlights={serviceBenefitHighlights}
            showHeroTrustPills={showServiceHeroTrustPills}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ServiceAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={serviceTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <ServiceServicesSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={serviceTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ServiceTrustSection
            {...shell}
            copy={copy}
            theme={serviceTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <ServiceFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={serviceTheme}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <ServiceContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={serviceTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderPortfolioPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <PortfolioHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={portfolioTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            services={undefined}
            serviceCount={2}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <PortfolioAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={portfolioTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <PortfolioWorkSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={portfolioTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <PortfolioProcessSection
            {...shell}
            copy={copy}
            theme={portfolioTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <PortfolioFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={portfolioTheme}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <PortfolioContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={portfolioTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderTeacherPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <TeacherHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={teacherTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            services={undefined}
            serviceCount={2}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <TeacherAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={teacherTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <TeacherLessonsSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={teacherTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <TeacherLearningSection
            {...shell}
            copy={copy}
            theme={teacherTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <TeacherFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={teacherTheme}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <TeacherContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={teacherTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderCoachPreviewSection(type: MiniSiteSectionType): JSX.Element | null {
    const shell = {
      variant: "preview" as const,
      testIdPrefix: "mini-site-preview",
      previewButtons: true,
    };

    switch (type) {
      case "hero":
        return (
          <CoachHeroSection
            {...shell}
            business={previewBusiness}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={coachTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref="#"
            secondaryOrderHref="#"
            showBookingCta={hasMeaningfulText(primaryCtaLabel)}
            showRequestCta={hasMeaningfulText(secondaryCtaLabel)}
            operatingMode="both"
            services={undefined}
            serviceCount={2}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <CoachAboutSection
            {...shell}
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={null}
            theme={coachTheme}
            isDark={isDark}
          />
        );
      case "services":
        return (
          <CoachProgramsSection
            {...shell}
            title={servicesTitle}
            badgeText={servicesBadge}
            services={undefined}
            publicSlug=""
            theme={coachTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <CoachTransformationSection
            {...shell}
            copy={copy}
            theme={coachTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <CoachFaqSection
            {...shell}
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={coachTheme}
            isDark={isDark}
          />
        );
      case "contact":
        if (visibleSocialLinks.length === 0) {
          return null;
        }
        return (
          <CoachContactSection
            {...shell}
            title={contactTitle}
            contactAddress=""
            contactPhone=""
            socialLinks={socialLinks}
            theme={coachTheme}
            isDark={isDark}
          />
        );
      default:
        return null;
    }
  }

  function renderSection(type: MiniSiteSectionType): JSX.Element | null {
    if (isCleanTemplate) {
      return renderCleanPreviewSection(type);
    }
    if (isServiceTemplate) {
      return renderServicePreviewSection(type);
    }
    if (isExpertTemplate) {
      return renderExpertPreviewSection(type);
    }
    if (isClinicTemplate) {
      return renderClinicPreviewSection(type);
    }
    if (isPortfolioTemplate) {
      return renderPortfolioPreviewSection(type);
    }
    if (isTeacherTemplate) {
      return renderTeacherPreviewSection(type);
    }
    if (isCoachTemplate) {
      return renderCoachPreviewSection(type);
    }

    switch (type) {
      case "hero":
        return (
          <header
            className={`relative overflow-hidden ${previewCardClass(theme.backgroundStyle, presentation.heroClass)} ${
              theme.template === "expert" ? "text-center" : ""
            }`}
            data-testid="mini-site-preview-hero"
            style={{
              borderColor: theme.template === "service" ? theme.primaryColor : theme.accentColor,
              borderLeftColor: theme.template === "service" ? theme.primaryColor : undefined,
            }}
          >
            <div
              className={presentation.heroTopBarClass}
              style={{
                background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor})`,
              }}
              aria-hidden
            />
            <div className={heroContentClass}>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center text-base font-bold shadow-sm ${
                  theme.template === "expert" ? "rounded-full" : "rounded-lg"
                }`}
                style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
                data-testid="mini-site-preview-logo-placeholder"
              >
                {businessName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p
                  className={`inline-block max-w-full whitespace-normal ${
                    isCleanTemplate
                      ? "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]"
                      : "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  }`}
                  style={{
                    color: theme.accentColor,
                    backgroundColor: `${theme.accentColor}${isCleanTemplate ? "12" : "18"}`,
                  }}
                  data-testid="mini-site-preview-hero-badge"
                >
                  {copy.heroBadgeText}
                </p>
                <h4
                  className={`${heroTitleClass} min-w-0 whitespace-normal`}
                  data-testid="mini-site-preview-hero-title"
                >
                  {heroTitle}
                </h4>
                {heroSubtitle ? (
                  <p
                    className={`min-w-0 text-xs font-medium whitespace-normal ${mutedText}`}
                    data-testid="mini-site-preview-hero-subtitle"
                  >
                    {heroSubtitle}
                  </p>
                ) : null}
                {heroBody ? (
                  <p
                    className={`min-w-0 text-xs leading-relaxed whitespace-normal ${mutedText}`}
                    data-testid="mini-site-preview-hero-body"
                  >
                    {heroBody}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex w-full flex-col gap-1.5">
              {hasMeaningfulText(primaryCtaLabel) ? (
                <button
                  type="button"
                  disabled
                  className={primaryButtonClass}
                  data-testid="mini-site-preview-primary-button"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {primaryCtaLabel}
                </button>
              ) : null}
              {hasMeaningfulText(secondaryCtaLabel) ? (
                <button
                  type="button"
                  disabled
                  className={secondaryButtonClass}
                  data-testid="mini-site-preview-secondary-button"
                  style={{ borderColor: theme.accentColor, color: theme.accentColor }}
                >
                  {secondaryCtaLabel}
                </button>
              ) : null}
            </div>
          </header>
        );
      case "about":
        return (
          <section
            className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
            data-testid="mini-site-preview-about"
          >
            <div
              className={isCleanTemplate ? "mb-2 h-px w-8" : "mb-2 h-1 w-8 rounded-full"}
              style={{ backgroundColor: theme.accentColor }}
              aria-hidden
            />
            <h4
              className={`${sectionHeadingClass} min-w-0 whitespace-normal`}
              data-testid="mini-site-preview-about-title"
            >
              {aboutTitle}
            </h4>
            {aboutBody ? (
              <p
                className={`mt-1.5 min-w-0 text-xs leading-relaxed whitespace-normal ${mutedText}`}
                data-testid="mini-site-preview-about-body"
              >
                {aboutBody}
              </p>
            ) : (
              <p className={`mt-1.5 text-xs italic ${mutedText}`}>About text will appear here.</p>
            )}
          </section>
        );
      case "services":
        return (
          <section
            className={previewCardClass(theme.backgroundStyle, `${presentation.sectionClass} ${presentation.servicesClass}`)}
            data-testid="mini-site-preview-services"
            style={
              theme.template === "service"
                ? { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }
                : undefined
            }
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <div
                  className={isCleanTemplate ? "mb-1 h-px w-8" : "mb-1 h-1 w-8 rounded-full"}
                  style={{ backgroundColor: theme.primaryColor }}
                  aria-hidden
                />
                <p
                  className={`${sectionHeadingClass} min-w-0 whitespace-normal ${
                    theme.template === "portfolio" ? "uppercase tracking-wide" : ""
                  }`}
                  data-testid="mini-site-preview-services-title"
                >
                  {servicesTitle}
                </p>
              </div>
              {servicesBadge ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                  style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}
                >
                  {servicesBadge}
                </span>
              ) : null}
            </div>
            <div
              className={`${serviceCardStyle.cardClass} mt-2 min-w-0`}
              style={{ borderColor: isCleanTemplate ? `${theme.accentColor}30` : `${theme.primaryColor}44` }}
            >
              <p className={`${serviceCardStyle.titleClass} whitespace-normal`}>Sample service</p>
              <p className={`${serviceCardStyle.descriptionClass} whitespace-normal`}>
                Your services will appear here on the live page.
              </p>
              <button
                type="button"
                disabled
                className={serviceCardStyle.buttonClass}
                style={
                  serviceCardStyle.buttonVariant === "outline"
                    ? {
                        borderColor: theme.primaryColor,
                        color: theme.primaryColor,
                        backgroundColor: "transparent",
                      }
                    : { backgroundColor: theme.primaryColor }
                }
              >
                View service
              </button>
            </div>
          </section>
        );
      case "trust":
        return renderTrust();
      case "faq": {
        if (visibleFaqItems.length === 0) {
          return null;
        }

        return (
          <section
            className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
            data-testid="mini-site-preview-faq"
          >
            <div
              className={isCleanTemplate ? "mb-2 h-px w-8" : "mb-2 h-1 w-8 rounded-full"}
              style={{ backgroundColor: theme.accentColor }}
              aria-hidden
            />
            <h4
              className={`${sectionHeadingClass} min-w-0 whitespace-normal`}
              data-testid="mini-site-preview-faq-title"
            >
              {copy.faqSectionTitle}
            </h4>
            <div className="mt-2 space-y-2">
              {faqItems.map((item, index) => {
                if (!isFaqItemFilled(item)) {
                  return null;
                }

                return (
                  <div
                    key={`${index}-${item.question}`}
                    className={`min-w-0 ${
                      isCleanTemplate
                        ? `rounded-lg border px-2.5 py-2 ${
                            isDark ? "border-slate-700/60 bg-slate-900/30" : "border-slate-200/55 bg-white shadow-sm"
                          }`
                        : `rounded-md border px-2.5 py-2 ${
                            isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/80"
                          }`
                    }`}
                    data-testid={`mini-site-preview-faq-item-${index}`}
                  >
                    <p
                      className="text-xs font-semibold whitespace-normal"
                      data-testid={`mini-site-preview-faq-item-${index}-question`}
                    >
                      {item.question}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-snug whitespace-normal ${mutedText}`}
                      data-testid={`mini-site-preview-faq-item-${index}-answer`}
                    >
                      {item.answer}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      }
      case "contact": {
        if (visibleSocialLinks.length === 0) {
          return null;
        }

        const website = visibleSocialLinks.find((entry) => entry.key === "website");
        const instagram = visibleSocialLinks.find((entry) => entry.key === "instagram");

        return (
          <section
            className={previewCardClass(theme.backgroundStyle, presentation.sectionClass)}
            data-testid="mini-site-preview-contact"
          >
            <h4
              className="min-w-0 text-xs font-semibold whitespace-normal"
              data-testid="mini-site-preview-contact-title"
            >
              {contactTitle}
            </h4>
            <div className={`mt-1.5 space-y-1 text-xs whitespace-normal ${mutedText}`}>
              {website ? (
                <p className="break-words" data-testid="mini-site-preview-website">
                  {website.value}
                </p>
              ) : null}
              {instagram ? (
                <p className="break-words" data-testid="mini-site-preview-instagram">
                  {instagram.value}
                </p>
              ) : null}
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  }

  const previewContent = (
    <div
      className={`${pageShellClass} template-${theme.template} mx-auto w-full max-w-none`}
      style={pageShellStyle}
      data-testid="mini-site-preview-frame"
    >
      <div className={isCleanTemplate ? "space-y-0" : isServiceTemplate ? "space-y-2.5" : "space-y-3"}>
        {orderedSectionTypes.map((type) => {
          const section = renderSection(type);
          return section ? <div key={type}>{section}</div> : null;
        })}

        <section
          className={
            isCleanTemplate
              ? `border-t border-dashed ${isDark ? "border-slate-700/60" : "border-slate-200/60"} py-4 text-center`
              : isServiceTemplate
                ? `rounded-lg border-2 border-dashed py-4 text-center ${isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-300/80 bg-white/80"}`
                : `${previewCardClass(theme.backgroundStyle, `border-dashed text-center ${presentation.galleryClass}`)} py-6`
          }
          data-testid="mini-site-preview-gallery-placeholder"
          style={
            isServiceTemplate
              ? { borderColor: `${theme.accentColor}55` }
              : theme.template === "portfolio"
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

  const scaledWidth = viewport.innerWidth * viewport.scale;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-testid="mini-site-live-preview"
      data-template={theme.template}
      data-template-presentation={theme.template}
      data-background-style={theme.backgroundStyle}
      data-background-color={theme.backgroundColor}
      data-button-style={theme.buttonStyle}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
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

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
        <div
          className={`${getMiniSitePreviewOuterShellClass()} mx-auto w-full`}
          data-testid="mini-site-preview-device-shell"
          style={{
            maxWidth: scaledWidth,
            maxHeight: viewport.maxHeight,
          }}
        >
          <div
            className="mx-auto overflow-hidden"
            style={{ width: scaledWidth }}
          >
            <div
              className="origin-top-left"
              style={{
                width: viewport.innerWidth,
                transform: `scale(${viewport.scale})`,
              }}
            >
              {previewContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
