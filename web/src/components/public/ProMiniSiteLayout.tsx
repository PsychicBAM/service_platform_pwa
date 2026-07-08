import { Link } from "react-router-dom";
import { ServiceCard } from "@/components/ServiceCard";
import {
  DEFAULT_MINI_SITE_CONFIG,
  formatServicesSectionBadge,
  getEnabledMiniSiteSections,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";
import {
  getMiniSitePageShellClass,
  getMiniSitePageShellStyle,
  getMiniSiteTemplatePresentation,
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
  backgroundStyle: MiniSiteBackgroundStyle,
  presentationClass: string,
): string {
  const surface =
    backgroundStyle === "dark"
      ? "border-slate-700/80 bg-slate-900/60 text-slate-100 shadow-lg shadow-black/20"
      : "border-slate-200/90 bg-white text-slate-900 shadow-md shadow-slate-200/40";
  return `rounded-2xl border p-6 md:p-9 ${surface} ${presentationClass}`;
}

function hasSocialLinks(links: MiniSiteSocialLinks): boolean {
  return Boolean(
    links.website ||
      links.instagram ||
      links.facebook ||
      links.whatsapp ||
      links.tiktok ||
      links.telegram,
  );
}

function SectionHeading({
  id,
  title,
  accentColor,
  className,
  isDark,
  template,
}: {
  id?: string;
  title: string;
  accentColor: string;
  className: string;
  isDark: boolean;
  template: MiniSiteTemplate;
}) {
  const clinicTint = !isDark && template === "clinic" ? "text-emerald-950" : "";

  return (
    <div className="mb-5 space-y-2">
      <div className="h-1 w-12 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden />
      <h2 id={id} className={`${className} ${clinicTint}`}>
        {title}
      </h2>
    </div>
  );
}

function TrustStatsRow({
  stats,
  primaryColor,
  isDark,
}: {
  stats: { title: string; subtitle: string }[];
  primaryColor: string;
  isDark: boolean;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="pro-mini-site-trust-stats">
      {stats.map((stat) => (
        <div
          key={stat.subtitle}
          className={`rounded-xl border px-4 py-3 text-center ${
            isDark ? "border-slate-700/80 bg-slate-900/50" : "border-slate-200/80 bg-white/80"
          }`}
        >
          <p className="break-words text-lg font-bold" style={{ color: primaryColor }}>
            {stat.title}
          </p>
          <p
            className={`mt-0.5 break-words text-xs font-medium uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}
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
  isDark,
}: {
  links: MiniSiteSocialLinks;
  mutedText: string;
  labelText: string;
  isDark: boolean;
}) {
  const entries = [
    { key: "website", label: "Website", value: links.website },
    { key: "instagram", label: "Instagram", value: links.instagram },
    { key: "facebook", label: "Facebook", value: links.facebook },
    { key: "whatsapp", label: "WhatsApp", value: links.whatsapp },
    { key: "tiktok", label: "TikTok", value: links.tiktok },
    { key: "telegram", label: "Telegram", value: links.telegram },
  ].filter((entry) => entry.value);

  if (entries.length === 0) {
    return null;
  }

  const chipClass = isDark
    ? "border-slate-700 bg-slate-900/40"
    : "border-slate-200/80 bg-slate-50/80";

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
  const primaryCtaLabel =
    copy.primaryCtaLabel || getSectionField(siteConfig, "booking_cta", "title") || "Browse services to book";
  const secondaryCtaLabel = copy.secondaryCtaLabel || "Submit a request";

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

  const renderHero = () => (
    <header
      className={`relative overflow-hidden rounded-2xl border p-6 md:p-10 lg:p-12 ${sectionBorder} ${presentation.heroClass}`}
      data-testid="pro-mini-site-hero"
      style={{
        borderColor: theme.template === "service" ? theme.primaryColor : theme.accentColor,
        borderLeftColor: theme.template === "service" ? theme.primaryColor : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
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
        <div className="min-w-0 flex-1 space-y-3">
          <p
            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              color: theme.accentColor,
              backgroundColor: `${theme.accentColor}18`,
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {ctas.showBookingCta ? (
          <Link
            to={primaryBookingHref}
            className={primaryCtaClass}
            data-testid="pro-mini-site-book-cta"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {primaryCtaLabel}
          </Link>
        ) : null}
        {ctas.showRequestCta ? (
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
      className={sectionCardClass(theme.backgroundStyle, presentation.sectionClass)}
      data-testid="pro-mini-site-about"
    >
      <SectionHeading
        title={aboutTitle}
        accentColor={theme.accentColor}
        className={presentation.sectionHeadingClass}
        isDark={isDark}
        template={theme.template}
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
      className={sectionCardClass(theme.backgroundStyle, presentation.sectionClass)}
      data-testid="pro-mini-site-trust"
    >
      {presentation.showTrustStats ? (
        <TrustStatsRow stats={copy.trustCards} primaryColor={theme.primaryColor} isDark={isDark} />
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

  const renderFaq = () => (
    <section
      className={sectionCardClass(theme.backgroundStyle, presentation.sectionClass)}
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
      />
      <div className="space-y-3">
        {copy.faqItems.map((item, index) => (
          <div
            key={`${index}-${item.question}`}
            className={`min-w-0 rounded-xl border px-4 py-3 ${
              isDark ? "border-slate-700/80 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/80"
            }`}
            data-testid={`pro-mini-site-faq-item-${index}`}
          >
            <p
              className="text-sm font-semibold whitespace-normal"
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
        ))}
      </div>
    </section>
  );

  const renderServices = () => (
    <section
      className={`${sectionCardClass(theme.backgroundStyle, `${presentation.sectionClass} ${presentation.servicesClass}`)}`}
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
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: theme.primaryColor }} aria-hidden />
          <h2 id="pro-mini-site-services-heading" className={presentation.sectionHeadingClass}>
            {servicesTitle}
          </h2>
        </div>
        {servicesBadgeText ? (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
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
        <div className="grid gap-4 md:grid-cols-2">
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

  const renderContact = () => (
    <section
      className={sectionCardClass(theme.backgroundStyle, presentation.sectionClass)}
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
      />
      <dl className={`grid gap-3 sm:grid-cols-2 ${mutedText}`}>
        {business.address ? (
          <div
            className={`rounded-xl border px-4 py-3 ${presentation.contactChipClass}`}
          >
            <dt className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Address</dt>
            <dd className="mt-1 text-sm">{business.address}</dd>
          </div>
        ) : null}
        {business.contact_phone ? (
          <div
            className={`rounded-xl border px-4 py-3 ${presentation.contactChipClass}`}
          >
            <dt className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Phone</dt>
            <dd className="mt-1 text-sm">
              <a
                href={`tel:${business.contact_phone}`}
                className="font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                {business.contact_phone}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      {!business.address && !business.contact_phone && !hasSocialLinks(socialLinks) ? (
        <p className={`mt-2 text-sm ${mutedText}`}>Contact details are not available yet.</p>
      ) : null}
      <SocialLinksList links={socialLinks} mutedText={mutedText} labelText={labelText} isDark={isDark} />
    </section>
  );

  const renderBookingCta = () => (
    <section
      className={`${sectionCardClass(theme.backgroundStyle, `${presentation.sectionClass} ${presentation.bookingCtaClass}`)} py-10 text-center md:py-12`}
      data-testid="pro-mini-site-booking-cta-section"
      style={{ backgroundColor: `${theme.primaryColor}08` }}
    >
      {ctas.showBookingCta ? (
        <Link
          to={primaryBookingHref}
          className={primaryCtaClass}
          data-testid="pro-mini-site-booking-cta-link"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {primaryCtaLabel}
        </Link>
      ) : null}
    </section>
  );

  const renderGallery = () => (
    <section
      className={`${sectionCardClass(theme.backgroundStyle, presentation.galleryClass)} py-10 text-center md:py-14`}
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
        className={sectionCardClass(theme.backgroundStyle, presentation.sectionClass)}
        data-testid={`pro-mini-site-${type}`}
      >
        <SectionHeading
          title={sectionTitle}
          accentColor={theme.accentColor}
          className={presentation.sectionHeadingClass}
          isDark={isDark}
          template={theme.template}
        />
        {sectionBody ? (
          <p className={`text-sm leading-relaxed md:text-base ${mutedText}`}>{sectionBody}</p>
        ) : null}
      </section>
    );
  };

  const renderSection = (type: MiniSiteSectionType) => {
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
        className={`space-y-10 md:space-y-12 ${presentation.layoutClass}`}
        data-testid="pro-mini-site-layout"
        data-template={theme.template}
        data-template-presentation={theme.template}
        data-background-style={theme.backgroundStyle}
        data-button-style={theme.buttonStyle}
      >
        {enabledSections.map((section) => (
          <div key={`${section.id}-${section.type}`}>{renderSection(section.type)}</div>
        ))}
      </section>
    </div>
  );
}
