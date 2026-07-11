import { Link } from "react-router-dom";
import { ServiceCard } from "@/components/ServiceCard";
import {
  CleanAboutSection,
  CleanBookingCtaSection,
  CleanContactSection,
  CleanFaqSection,
  CleanGallerySection,
  CleanHeroSection,
  CleanServicesSection,
  CleanTrustSection,
} from "@/components/public/CleanProMiniSiteSections";
import {
  DEFAULT_MINI_SITE_CONFIG,
  formatServicesSectionBadge,
  getEnabledMiniSiteSections,
  getVisibleFaqItems,
  getVisibleSocialLinks,
  hasMeaningfulText,
  isFaqItemFilled,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";
import { getTemplateImageSlots } from "@/lib/miniSiteMedia";
import { getTemplateVideoSlots } from "@/lib/miniSiteVideo";
import {
  ClinicAboutSection,
  ClinicBookingCtaSection,
  ClinicContactSection,
  ClinicFaqSection,
  ClinicGallerySection,
  ClinicHeroSection,
  ClinicServicesSection,
  ClinicTrustSection,
} from "@/components/public/ClinicProMiniSiteSections";
import {
  ExpertAboutSection,
  ExpertBookingCtaSection,
  ExpertContactSection,
  ExpertFaqSection,
  ExpertGallerySection,
  ExpertHeroSection,
  ExpertServicesSection,
  ExpertTrustSection,
} from "@/components/public/ExpertProMiniSiteSections";
import {
  PortfolioAboutSection,
  PortfolioBookingCtaSection,
  PortfolioContactSection,
  PortfolioFaqSection,
  PortfolioGallerySection,
  PortfolioHeroSection,
  PortfolioProcessSection,
  PortfolioWorkSection,
} from "@/components/public/PortfolioProMiniSiteSections";
import {
  TeacherAboutSection,
  TeacherBookingCtaSection,
  TeacherContactSection,
  TeacherFaqSection,
  TeacherGallerySection,
  TeacherHeroSection,
  TeacherLearningSection,
  TeacherLessonsSection,
} from "@/components/public/TeacherProMiniSiteSections";
import {
  CoachAboutSection,
  CoachBookingCtaSection,
  CoachContactSection,
  CoachFaqSection,
  CoachGallerySection,
  CoachHeroSection,
  CoachProgramsSection,
  CoachTransformationSection,
} from "@/components/public/CoachProMiniSiteSections";
import {
  ServiceAboutSection,
  ServiceBookingCtaSection,
  ServiceContactSection,
  ServiceFaqSection,
  ServiceGallerySection,
  ServiceHeroSection,
  ServiceServicesSection,
  ServiceTrustSection,
} from "@/components/public/ServiceProMiniSiteSections";
import {
  getMiniSitePageShellClass,
  getMiniSitePageShellStyle,
  getMiniSiteSectionCardSurface,
  getMiniSiteTemplatePresentation,
  type MiniSiteTemplatePresentation,
} from "@/lib/miniSiteTemplatePresentation";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteConfig,
  MiniSiteSectionType,
  MiniSiteSocialLinks,
  MiniSiteTemplate,
} from "@/types/miniSite";

export type ProMiniSiteLayoutProps = {
  business: PublicBusiness;
  publicSlug: string;
  services?: PublicService[];
  bookingHref?: string;
  orderHref?: string;
  config?: MiniSiteConfig | null;
};

export function getProMiniSiteCtas(
  business: PublicBusiness,
  publicSlug: string,
  services?: PublicService[],
): {
  bookingHref: string;
  orderHref: string;
  showBookingCta: boolean;
  showRequestCta: boolean;
} {
  const servicesHref = `/b/${publicSlug}/services`;
  const firstOrderService = services?.find((service) => service.type === "order");
  const orderHref = firstOrderService
    ? `/b/${publicSlug}/services/${firstOrderService.id}/request`
    : servicesHref;

  return {
    bookingHref: servicesHref,
    orderHref,
    showBookingCta: business.operating_mode !== "orders_only",
    showRequestCta: business.operating_mode !== "booking_only",
  };
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

function getSectionField(
  config: MiniSiteConfig,
  type: MiniSiteSectionType,
  field: "title" | "subtitle" | "body",
): string {
  const section = config.sections.find((entry) => entry.type === type);
  return section?.[field] ?? "";
}

function mutedTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-300" : "text-slate-600";
}

function borderClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "border-slate-700/80" : "border-slate-200";
}

function labelTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-200" : "text-slate-700";
}

function sectionCardClass(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
  presentation: MiniSiteTemplatePresentation,
): string {
  const surface = getMiniSiteSectionCardSurface(template, backgroundStyle);
  return `border ${presentation.sectionPaddingClass} ${presentation.sectionRadiusClass} ${surface} ${presentation.sectionClass}`;
}

function SectionHeading({
  id,
  title,
  accentColor,
  className,
  isDark,
  template,
  accentClass,
}: {
  id?: string;
  title: string;
  accentColor: string;
  className: string;
  isDark: boolean;
  template: MiniSiteTemplate;
  accentClass: string;
}) {
  const clinicTint = !isDark && template === "clinic" ? "text-emerald-950" : "";

  return (
    <div className="space-y-2">
      <div className={accentClass} style={{ backgroundColor: accentColor }} aria-hidden />
      <h2 id={id} className={`${className} ${clinicTint}`}>
        {title}
      </h2>
    </div>
  );
}

function TrustStatsRow({
  stats,
  primaryColor,
  statClass,
  isDark,
}: {
  stats: { title: string; subtitle: string }[];
  primaryColor: string;
  statClass: string;
  isDark: boolean;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="pro-mini-site-trust-stats">
      {stats.map((stat) => (
        <div key={stat.subtitle} className={statClass}>
          <p className="break-words text-lg font-semibold" style={{ color: primaryColor }}>
            {stat.title}
          </p>
          <p
            className={`mt-1 break-words text-xs font-medium tracking-wide ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {stat.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}

function BenefitsStrip({
  title,
  items,
  primaryColor,
  isDark,
}: {
  title: string;
  items: string[];
  primaryColor: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`mt-6 rounded-2xl border px-5 py-4 ${
        isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/80"
      }`}
      data-testid="pro-mini-site-benefits-strip"
    >
      <p
        className={`mb-3 break-words text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}
      >
        {title}
      </p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {items.map((benefit) => (
          <li
            key={benefit}
            className={`flex items-start gap-2 break-words text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
              aria-hidden
            >
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLinksList({
  links,
  mutedText,
  labelText,
  chipClass,
}: {
  links: MiniSiteSocialLinks;
  mutedText: string;
  labelText: string;
  chipClass: string;
}) {
  const entries = getVisibleSocialLinks(links);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2" data-testid="pro-mini-site-social-links">
      {entries.map((entry) => (
        <div key={entry.key} className={`rounded-xl border px-3 py-2 text-sm ${chipClass}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${labelText}`}>{entry.label}</p>
          <p className={`mt-0.5 break-all ${mutedText}`}>{entry.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProMiniSiteLayout({
  business,
  publicSlug,
  services,
  bookingHref,
  orderHref,
  config,
}: ProMiniSiteLayoutProps) {
  const siteConfig = normalizeMiniSiteConfig(config ?? DEFAULT_MINI_SITE_CONFIG);
  const { theme, socialLinks, copy } = siteConfig;
  const templateImages = getTemplateImageSlots(siteConfig.templateMedia, theme.template);
  const templateVideos = getTemplateVideoSlots(siteConfig.templateMedia, theme.template);
  const enabledSections = getEnabledMiniSiteSections(siteConfig);
  const ctas = getProMiniSiteCtas(business, publicSlug, services);
  const primaryBookingHref = bookingHref ?? ctas.bookingHref;
  const secondaryOrderHref = orderHref ?? ctas.orderHref;
  const isDark = theme.backgroundStyle === "dark";

  const heroTitle = getSectionField(siteConfig, "hero", "title") || business.name;
  const heroSubtitle = getSectionField(siteConfig, "hero", "subtitle");
  const heroBody = getSectionField(siteConfig, "hero", "body");
  const aboutTitle = getSectionField(siteConfig, "about", "title") || "About us";
  const aboutBody = getSectionField(siteConfig, "about", "body");
  const servicesTitle =
    copy.servicesSectionTitle || getSectionField(siteConfig, "services", "title") || "Services";
  const contactTitle =
    copy.contactSectionTitle || getSectionField(siteConfig, "contact", "title") || "Contact & details";
  const primaryCtaLabel = copy.primaryCtaLabel.trim();
  const secondaryCtaLabel = copy.secondaryCtaLabel.trim();
  const hasCenteredHeroLayout = theme.template === "expert";
  const rawAddress = business.address ?? "";
  const rawPhone = business.contact_phone ?? "";
  const contactAddress = hasMeaningfulText(rawAddress) ? rawAddress.trim() : "";
  const contactPhone = hasMeaningfulText(rawPhone) ? rawPhone.trim() : "";
  const visibleSocialLinks = getVisibleSocialLinks(socialLinks);
  const hasVisibleContactContent =
    hasMeaningfulText(contactAddress) || hasMeaningfulText(contactPhone) || visibleSocialLinks.length > 0;

  const mutedText = mutedTextClass(theme.backgroundStyle);
  const sectionBorder = borderClass(theme.backgroundStyle);
  const labelText = labelTextClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(
    theme.template,
    theme.backgroundStyle,
    theme.buttonStyle,
  );
  const pageShellClass = getMiniSitePageShellClass();
  const pageShellStyle = getMiniSitePageShellStyle(theme.backgroundColor, theme.backgroundStyle);
  const benefitsSectionEnabled = siteConfig.sections.some(
    (section) => section.type === "benefits" && section.enabled,
  );
  const visibleFaqItems = getVisibleFaqItems(copy.faqItems);
  const faqItems = copy.faqItems ?? [];
  const serviceCardTheme = {
    template: theme.template,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundStyle: theme.backgroundStyle,
    buttonStyle: theme.buttonStyle,
  };
  const servicesBadgeText =
    services && services.length > 0
      ? formatServicesSectionBadge(copy.servicesSectionBadgeText, services.length)
      : null;

  const primaryCtaClass = `${presentation.primaryButtonClass} ${sectionBorder}`;
  const secondaryCtaClass = `${presentation.secondaryButtonClass} ${sectionBorder}`;
  const heroPadding = presentation.heroPaddingClass || "p-6 md:p-10 lg:p-12";
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

  const renderClinicSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <ClinicHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={clinicTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            serviceCount={services?.length ?? null}
            contactPhone={contactPhone}
            contactAddress={contactAddress}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ClinicAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={clinicTheme}
            isDark={isDark}
            businessName={business.name}
            copy={copy}
            introVideo={templateVideos.introVideo ?? null}
            templateImages={templateImages}
          />
        );
      case "services":
        return (
          <ClinicServicesSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={clinicTheme}
            isDark={isDark}
            primaryCtaLabel={primaryCtaLabel}
            copy={copy}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ClinicTrustSection
            copy={copy}
            theme={clinicTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
            primaryCtaLabel={primaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            showBookingCta={ctas.showBookingCta}
            templateImages={templateImages}
          />
        );
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <ClinicFaqSection
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={clinicTheme}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <ClinicContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={clinicTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <ClinicBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={clinicTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <ClinicGallerySection isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className="mx-auto max-w-3xl py-8 md:py-10"
            data-testid={`pro-mini-site-${type}`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: theme.accentColor }}>
              {sectionTitle}
            </p>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderPortfolioSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <PortfolioHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={portfolioTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            services={services}
            serviceCount={services?.length ?? null}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <PortfolioAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={portfolioTheme}
            isDark={isDark}
            services={services}
            copy={copy}
            templateImages={templateImages}
          />
        );
      case "services":
        return (
          <PortfolioWorkSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={portfolioTheme}
            isDark={isDark}
            templateImages={templateImages}
            showreelVideo={templateVideos.showreelVideo ?? null}
          />
        );
      case "trust":
        return (
          <PortfolioProcessSection
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
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={portfolioTheme}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <PortfolioContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={portfolioTheme}
            isDark={isDark}
            primaryCtaLabel={primaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            showBookingCta={ctas.showBookingCta}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <PortfolioBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={portfolioTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <PortfolioGallerySection theme={portfolioTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className="mx-auto max-w-3xl py-8 md:py-10"
            data-testid={`pro-mini-site-${type}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.accentColor }}>
              {sectionTitle}
            </p>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderTeacherSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <TeacherHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={teacherTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            services={services}
            serviceCount={services?.length ?? null}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <TeacherAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={teacherTheme}
            isDark={isDark}
            introVideo={templateVideos.introVideo ?? null}
          />
        );
      case "services":
        return (
          <TeacherLessonsSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={teacherTheme}
            isDark={isDark}
            templateImages={templateImages}
            lessonPreviewVideo={templateVideos.lessonPreviewVideo ?? null}
          />
        );
      case "trust":
        return (
          <TeacherLearningSection
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
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={teacherTheme}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <TeacherContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={teacherTheme}
            isDark={isDark}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <TeacherBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={teacherTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <TeacherGallerySection theme={teacherTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className="mx-auto max-w-3xl py-8 md:py-10"
            data-testid={`pro-mini-site-${type}`}
          >
            <p className="text-xs font-medium" style={{ color: theme.accentColor }}>
              {sectionTitle}
            </p>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderCoachSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <CoachHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={coachTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            services={services}
            serviceCount={services?.length ?? null}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <CoachAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={coachTheme}
            isDark={isDark}
            introVideo={templateVideos.introVideo ?? null}
          />
        );
      case "services":
        return (
          <CoachProgramsSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={coachTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <CoachTransformationSection
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
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={coachTheme}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <CoachContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={coachTheme}
            isDark={isDark}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <CoachBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={coachTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <CoachGallerySection theme={coachTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className="mx-auto max-w-3xl py-8 md:py-10"
            data-testid={`pro-mini-site-${type}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.accentColor }}>
              {sectionTitle}
            </p>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderExpertSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <ExpertHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={expertTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            showHeroCredibility={showExpertHeroCredibility}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ExpertAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={expertTheme}
            isDark={isDark}
            introVideo={templateVideos.introVideo ?? null}
          />
        );
      case "services":
        return (
          <ExpertServicesSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={expertTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ExpertTrustSection
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
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <ExpertContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={expertTheme}
            isDark={isDark}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <ExpertBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={expertTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <ExpertGallerySection theme={expertTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className="mx-auto max-w-3xl py-8 text-center md:py-10 md:text-left"
            data-testid={`pro-mini-site-${type}`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: theme.accentColor }}>
              {sectionTitle}
            </p>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderServiceSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <ServiceHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={serviceTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            operatingMode={business.operating_mode}
            serviceCount={services?.length ?? null}
            benefitHighlights={serviceBenefitHighlights}
            showHeroTrustPills={showServiceHeroTrustPills}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <ServiceAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={serviceTheme}
            isDark={isDark}
            introVideo={templateVideos.introVideo ?? null}
          />
        );
      case "services":
        return (
          <ServiceServicesSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={serviceTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust":
        return (
          <ServiceTrustSection
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
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            theme={serviceTheme}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <ServiceContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={serviceTheme}
            isDark={isDark}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <ServiceBookingCtaSection
            primaryLabel={primaryCtaLabel}
            primaryHref={primaryBookingHref}
            secondaryLabel={secondaryCtaLabel}
            secondaryHref={secondaryOrderHref}
            showSecondary={ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel)}
            theme={serviceTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <ServiceGallerySection theme={serviceTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className={`rounded-2xl border-2 p-5 md:p-6 ${
              isDark ? "border-slate-700/80 bg-slate-900/55" : "border-slate-200/90 bg-white shadow-sm"
            }`}
            style={{ borderLeftColor: theme.primaryColor, borderLeftWidth: 4 }}
            data-testid={`pro-mini-site-${type}`}
          >
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{sectionTitle}</h2>
            <p className={`mt-2 text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderCleanSection = (type: MiniSiteSectionType) => {
    switch (type) {
      case "hero":
        return (
          <CleanHeroSection
            business={business}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroBody={heroBody}
            heroBadgeText={copy.heroBadgeText}
            copy={copy}
            theme={cleanTheme}
            presentation={presentation}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaLabel={secondaryCtaLabel}
            primaryBookingHref={primaryBookingHref}
            secondaryOrderHref={secondaryOrderHref}
            showBookingCta={ctas.showBookingCta}
            showRequestCta={ctas.showRequestCta}
            showHeroTrustStrip={showCleanHeroTrustStrip}
            operatingMode={business.operating_mode}
            templateImages={templateImages}
          />
        );
      case "about":
        return (
          <CleanAboutSection
            title={aboutTitle}
            body={aboutBody || null}
            fallbackBody={business.description}
            theme={cleanTheme}
            isDark={isDark}
            introVideo={templateVideos.introVideo ?? null}
          />
        );
      case "services":
        return (
          <CleanServicesSection
            title={servicesTitle}
            badgeText={servicesBadgeText}
            services={services}
            publicSlug={publicSlug}
            theme={cleanTheme}
            isDark={isDark}
            templateImages={templateImages}
          />
        );
      case "trust": {
        const trust = (
          <CleanTrustSection
            copy={copy}
            theme={cleanTheme}
            isDark={isDark}
            showTrustStats={presentation.showTrustStats}
            showBenefitsStrip={presentation.showBenefitsStrip}
            benefitsSectionEnabled={benefitsSectionEnabled}
          />
        );
        return trust;
      }
      case "faq":
        if (visibleFaqItems.length === 0) {
          return null;
        }
        return (
          <CleanFaqSection
            title={copy.faqSectionTitle}
            faqItems={faqItems}
            isDark={isDark}
          />
        );
      case "contact":
        return (
          <CleanContactSection
            title={contactTitle}
            contactAddress={contactAddress}
            contactPhone={contactPhone}
            socialLinks={socialLinks}
            theme={cleanTheme}
            isDark={isDark}
          />
        );
      case "booking_cta":
        if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
          return null;
        }
        return (
          <CleanBookingCtaSection
            label={primaryCtaLabel}
            href={primaryBookingHref}
            theme={cleanTheme}
            presentation={presentation}
            templateImages={templateImages}
          />
        );
      case "gallery":
        return <CleanGallerySection theme={cleanTheme} isDark={isDark} />;
      case "benefits":
      case "pricing": {
        const sectionTitle = getSectionField(siteConfig, type, "title") || (type === "benefits" ? "Benefits" : "Pricing");
        const sectionBody = getSectionField(siteConfig, type, "body");
        if (!sectionBody) {
          return null;
        }
        return (
          <section
            className={`border-t ${isDark ? "border-slate-700/60" : "border-slate-200/60"} py-12 md:py-16`}
            data-testid={`pro-mini-site-${type}`}
          >
            <p
              className="mb-4 text-center text-xs font-medium uppercase tracking-[0.18em]"
              style={{ color: theme.accentColor }}
            >
              {sectionTitle}
            </p>
            <p className={`mx-auto max-w-2xl text-center text-sm leading-relaxed md:text-base ${mutedText}`}>
              {sectionBody}
            </p>
          </section>
        );
      }
      default:
        return null;
    }
  };

  const renderHero = () => (
    <header
      className={`relative overflow-hidden border ${presentation.sectionRadiusClass} ${heroPadding} ${sectionBorder} ${presentation.heroClass}`}
      data-testid="pro-mini-site-hero"
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
      <div className={presentation.heroLayoutClass} data-testid="pro-mini-site-hero-content">
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt=""
            className={`h-20 w-20 shrink-0 object-cover shadow-md ring-4 ring-white/80 md:h-24 md:w-24 ${
              theme.template === "expert" ? "rounded-full" : "rounded-2xl"
            }`}
          />
        ) : (
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center text-3xl font-bold shadow-md ring-4 ring-white/70 md:h-24 md:w-24 md:text-4xl ${
              theme.template === "expert" ? "rounded-full" : "rounded-2xl"
            }`}
            style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
            aria-hidden
            data-testid="pro-mini-site-logo-placeholder"
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-3 md:space-y-4">
          <p
            className={presentation.heroBadgeClass}
            style={{
              color: theme.accentColor,
              backgroundColor: `${theme.accentColor}${isCleanTemplate ? "12" : "18"}`,
            }}
          >
            {copy.heroBadgeText}
          </p>
          <h1
            className={presentation.heroTitleClass}
            data-testid="pro-mini-site-hero-title"
          >
            {heroTitle}
          </h1>
          {heroSubtitle ? (
            <p
              className={`text-base font-medium md:text-lg ${mutedText}`}
              data-testid="pro-mini-site-hero-subtitle"
            >
              {heroSubtitle}
            </p>
          ) : (
            <p className={`text-base md:text-lg ${mutedText}`}>{heroIntro(business.operating_mode)}</p>
          )}
          {heroBody ? (
            <p
              className={`max-w-2xl text-sm leading-relaxed md:text-base ${mutedText}`}
              data-testid="pro-mini-site-hero-body"
            >
              {heroBody}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap ${hasCenteredHeroLayout ? "sm:justify-center" : ""} ${isCleanTemplate ? "md:mt-10 md:gap-4" : ""}`}
        data-testid="pro-mini-site-hero-cta-group"
      >
        {ctas.showBookingCta && hasMeaningfulText(primaryCtaLabel) ? (
          <Link
            to={primaryBookingHref}
            className={primaryCtaClass}
            data-testid="pro-mini-site-book-cta"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {primaryCtaLabel}
          </Link>
        ) : null}
        {ctas.showRequestCta && hasMeaningfulText(secondaryCtaLabel) ? (
          <Link
            to={secondaryOrderHref}
            className={secondaryCtaClass}
            data-testid="pro-mini-site-request-cta"
            style={{ borderColor: theme.accentColor, color: theme.accentColor }}
          >
            {secondaryCtaLabel}
          </Link>
        ) : null}
      </div>
    </header>
  );

  const renderAbout = () => (
    <section
      className={sectionCardClass(theme.template, theme.backgroundStyle, presentation)}
      data-testid="pro-mini-site-about"
    >
      <SectionHeading
        title={aboutTitle}
        accentColor={theme.accentColor}
        className={presentation.sectionHeadingClass}
        isDark={isDark}
        template={theme.template}
        accentClass={presentation.sectionHeadingAccentClass}
      />
      {aboutBody ? (
        <p
          className={`max-w-3xl text-sm leading-relaxed md:text-base ${mutedText}`}
          data-testid="pro-mini-site-about-body"
        >
          {aboutBody}
        </p>
      ) : business.description ? (
        <p className={`max-w-3xl text-sm leading-relaxed md:text-base ${mutedText}`}>
          {business.description}
        </p>
      ) : (
        <p className={`text-sm italic ${mutedText}`}>About text will appear here.</p>
      )}
    </section>
  );

  const renderTrust = () => (
    <section
      className={sectionCardClass(theme.template, theme.backgroundStyle, presentation)}
      data-testid="pro-mini-site-trust"
    >
      {presentation.showTrustStats ? (
        <TrustStatsRow
          stats={copy.trustCards}
          primaryColor={theme.primaryColor}
          statClass={presentation.trustStatClass}
          isDark={isDark}
        />
      ) : null}

      {presentation.showBenefitsStrip && !benefitsSectionEnabled ? (
        <BenefitsStrip
          title={copy.benefitsSectionTitle}
          items={copy.benefitsItems.filter(Boolean)}
          primaryColor={theme.primaryColor}
          isDark={isDark}
        />
      ) : null}
    </section>
  );

  const renderFaq = () => {
    if (visibleFaqItems.length === 0) {
      return null;
    }

    return (
      <section
        className={sectionCardClass(theme.template, theme.backgroundStyle, presentation)}
        aria-labelledby="pro-mini-site-faq-heading"
        data-testid="pro-mini-site-faq"
      >
        <SectionHeading
          id="pro-mini-site-faq-heading"
          title={copy.faqSectionTitle}
          accentColor={theme.accentColor}
          className={presentation.sectionHeadingClass}
          isDark={isDark}
          template={theme.template}
          accentClass={presentation.sectionHeadingAccentClass}
        />
        <div className="space-y-3">
          {faqItems.map((item, index) => {
            if (!isFaqItemFilled(item)) {
              return null;
            }

            return (
              <div
                key={`${index}-${item.question}`}
                className={presentation.faqItemClass}
                data-testid={`pro-mini-site-faq-item-${index}`}
              >
                <p
                  className={`text-sm whitespace-normal ${
                    isCleanTemplate
                      ? isDark
                        ? "font-medium"
                        : "font-medium text-slate-900"
                      : "font-semibold"
                  }`}
                  data-testid={`pro-mini-site-faq-item-${index}-question`}
                >
                  {item.question}
                </p>
                <p
                  className={`mt-1 text-sm leading-relaxed whitespace-normal ${mutedText}`}
                  data-testid={`pro-mini-site-faq-item-${index}-answer`}
                >
                  {item.answer}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderServices = () => (
    <section
      className={sectionCardClass(theme.template, theme.backgroundStyle, {
        ...presentation,
        sectionClass: `${presentation.sectionClass} ${presentation.servicesClass}`,
      })}
      aria-labelledby="pro-mini-site-services-heading"
      data-testid="pro-mini-site-services"
      style={
        theme.template === "service"
          ? { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}10` }
          : undefined
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div
            className={isCleanTemplate ? "mb-2 h-px w-10" : "h-1 w-10 rounded-full"}
            style={{ backgroundColor: theme.primaryColor }}
            aria-hidden
          />
          <h2 id="pro-mini-site-services-heading" className={presentation.sectionHeadingClass}>
            {servicesTitle}
          </h2>
        </div>
        {servicesBadgeText ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${isCleanTemplate ? "font-medium" : ""}`}
            style={{
              color: theme.primaryColor,
              backgroundColor: `${theme.primaryColor}15`,
            }}
            data-testid="pro-mini-site-services-badge"
          >
            {servicesBadgeText}
          </span>
        ) : null}
      </div>
      {services && services.length > 0 ? (
        <div className={`grid gap-4 ${isCleanTemplate ? "md:grid-cols-2 md:gap-5" : "md:grid-cols-2"}`}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              slug={publicSlug}
              service={service}
              miniSiteTheme={serviceCardTheme}
            />
          ))}
        </div>
      ) : (
        <p className={`text-sm ${mutedText}`}>
          Services will appear here.{" "}
          <Link
            to={`/b/${publicSlug}/services`}
            className="font-semibold hover:underline"
            style={{ color: theme.primaryColor }}
          >
            View services
          </Link>
        </p>
      )}
    </section>
  );

  const renderContact = () => {
    if (!hasVisibleContactContent) {
      return null;
    }

    return (
      <section
        className={sectionCardClass(theme.template, theme.backgroundStyle, presentation)}
        aria-labelledby="pro-mini-site-contact-heading"
        data-testid="pro-mini-site-contact"
      >
        <SectionHeading
          id="pro-mini-site-contact-heading"
          title={contactTitle}
          accentColor={theme.accentColor}
          className={presentation.sectionHeadingClass}
          isDark={isDark}
          template={theme.template}
          accentClass={presentation.sectionHeadingAccentClass}
        />
        <dl className={`grid gap-3 sm:grid-cols-2 ${mutedText}`}>
          {hasMeaningfulText(contactAddress) ? (
            <div className={`rounded-xl border px-4 py-3 ${presentation.contactChipClass}`}>
              <dt className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Address</dt>
              <dd className="mt-1 text-sm">{contactAddress}</dd>
            </div>
          ) : null}
          {hasMeaningfulText(contactPhone) ? (
            <div className={`rounded-xl border px-4 py-3 ${presentation.contactChipClass}`}>
              <dt className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Phone</dt>
              <dd className="mt-1 text-sm">
                <a
                  href={`tel:${contactPhone}`}
                  className="font-medium hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  {contactPhone}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        <SocialLinksList
          links={socialLinks}
          mutedText={mutedText}
          labelText={labelText}
          chipClass={presentation.contactChipClass}
        />
      </section>
    );
  };

  const renderBookingCta = () => {
    if (!ctas.showBookingCta || !hasMeaningfulText(primaryCtaLabel)) {
      return null;
    }

    return (
      <section
        className={`${sectionCardClass(theme.template, theme.backgroundStyle, {
          ...presentation,
          sectionClass: `${presentation.sectionClass} ${presentation.bookingCtaClass}`,
        })} py-10 text-center md:py-12`}
        data-testid="pro-mini-site-booking-cta-section"
        style={{ backgroundColor: `${theme.primaryColor}08` }}
      >
        <Link
          to={primaryBookingHref}
          className={primaryCtaClass}
          data-testid="pro-mini-site-booking-cta-link"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {primaryCtaLabel}
        </Link>
      </section>
    );
  };

  const renderGallery = () => (
    <section
      className={`${sectionCardClass(theme.template, theme.backgroundStyle, {
        ...presentation,
        sectionClass: presentation.galleryClass,
      })} py-10 text-center md:py-14`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid="pro-mini-site-gallery-placeholder"
      style={
        theme.template === "portfolio"
          ? { borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}12` }
          : undefined
      }
    >
      <div
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
        style={{ backgroundColor: `${theme.accentColor}20`, color: theme.accentColor }}
        aria-hidden
      >
        +
      </div>
      <h2 id="pro-mini-site-gallery-heading" className={presentation.sectionHeadingClass}>
        Gallery
      </h2>
      <p className={`mx-auto mt-2 max-w-md text-sm ${mutedText}`}>
        Photo gallery coming soon. Showcase your work here.
      </p>
    </section>
  );

  const renderGenericSection = (type: MiniSiteSectionType, title: string) => {
    const sectionTitle = getSectionField(siteConfig, type, "title") || title;
    const sectionBody = getSectionField(siteConfig, type, "body");

    return (
      <section
        key={type}
        className={sectionCardClass(theme.template, theme.backgroundStyle, presentation)}
        data-testid={`pro-mini-site-${type}`}
      >
        <SectionHeading
          title={sectionTitle}
          accentColor={theme.accentColor}
          className={presentation.sectionHeadingClass}
          isDark={isDark}
          template={theme.template}
          accentClass={presentation.sectionHeadingAccentClass}
        />
        {sectionBody ? (
          <p className={`text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
        ) : null}
      </section>
    );
  };

  const renderSection = (type: MiniSiteSectionType) => {
    if (isCleanTemplate) {
      return renderCleanSection(type);
    }
    if (isServiceTemplate) {
      return renderServiceSection(type);
    }
    if (isExpertTemplate) {
      return renderExpertSection(type);
    }
    if (isClinicTemplate) {
      return renderClinicSection(type);
    }
    if (isPortfolioTemplate) {
      return renderPortfolioSection(type);
    }
    if (isTeacherTemplate) {
      return renderTeacherSection(type);
    }
    if (isCoachTemplate) {
      return renderCoachSection(type);
    }

    switch (type) {
      case "hero":
        return renderHero();
      case "about":
        return renderAbout();
      case "services":
        return renderServices();
      case "trust":
        return renderTrust();
      case "faq":
        return renderFaq();
      case "contact":
        return renderContact();
      case "booking_cta":
        return renderBookingCta();
      case "gallery":
        return renderGallery();
      case "benefits":
        return renderGenericSection(type, "Benefits");
      case "pricing":
        return renderGenericSection(type, "Pricing");
      default:
        return null;
    }
  };

  return (
    <div
      className={pageShellClass}
      style={pageShellStyle}
      data-testid="pro-mini-site-page-shell"
      data-background-color={theme.backgroundColor}
    >
      <section
        className={`${presentation.layoutSpacingClass} ${presentation.layoutClass}`}
        data-testid="pro-mini-site-layout"
        data-template={theme.template}
        data-template-presentation={theme.template}
        data-background-style={theme.backgroundStyle}
        data-button-style={theme.buttonStyle}
      >
        {enabledSections.map((section) => {
          const content = renderSection(section.type);
          return content ? <div key={`${section.id}-${section.type}`}>{content}</div> : null;
        })}
      </section>
    </div>
  );
}
