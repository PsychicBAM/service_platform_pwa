import { Link } from "react-router-dom";
import { ServiceCard } from "@/components/ServiceCard";
import {
  DEFAULT_MINI_SITE_CONFIG,
  getEnabledMiniSiteSections,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";
import { getMiniSiteTemplatePresentation } from "@/lib/miniSiteTemplatePresentation";
import type { OperatingMode, PublicBusiness, PublicService } from "@/types/api";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteConfig,
  MiniSiteSectionType,
  MiniSiteSocialLinks,
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

function surfaceClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  switch (backgroundStyle) {
    case "dark":
      return "bg-slate-900 text-slate-100";
    case "soft":
      return "bg-slate-50 text-slate-900";
    default:
      return "bg-white text-slate-900";
  }
}

function mutedTextClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "text-slate-300" : "text-slate-600";
}

function borderClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  return backgroundStyle === "dark" ? "border-slate-700" : "border-slate-200";
}

function buttonRadiusClass(buttonStyle: MiniSiteButtonStyle): string {
  switch (buttonStyle) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-xl";
  }
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

function SocialLinksList({
  links,
  mutedText,
}: {
  links: MiniSiteSocialLinks;
  mutedText: string;
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

  return (
    <div className="mt-3 space-y-1" data-testid="pro-mini-site-social-links">
      {entries.map((entry) => (
        <p key={entry.key} className={mutedText}>
          <span className="font-medium text-slate-700">{entry.label}: </span>
          {entry.value}
        </p>
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
  const { theme, socialLinks } = siteConfig;
  const enabledSections = getEnabledMiniSiteSections(siteConfig);
  const ctas = getProMiniSiteCtas(business, publicSlug, services);
  const primaryBookingHref = bookingHref ?? ctas.bookingHref;
  const secondaryOrderHref = orderHref ?? ctas.orderHref;

  const heroTitle = getSectionField(siteConfig, "hero", "title") || business.name;
  const heroSubtitle = getSectionField(siteConfig, "hero", "subtitle");
  const heroBody = getSectionField(siteConfig, "hero", "body");
  const aboutTitle = getSectionField(siteConfig, "about", "title") || "About us";
  const aboutBody = getSectionField(siteConfig, "about", "body");
  const servicesTitle = getSectionField(siteConfig, "services", "title") || "Services";
  const contactTitle = getSectionField(siteConfig, "contact", "title") || "Contact & details";
  const bookingCtaTitle =
    getSectionField(siteConfig, "booking_cta", "title") || "Browse services to book";

  const mutedText = mutedTextClass(theme.backgroundStyle);
  const sectionBorder = borderClass(theme.backgroundStyle);
  const buttonRadius = buttonRadiusClass(theme.buttonStyle);
  const pageSurface = surfaceClass(theme.backgroundStyle);
  const presentation = getMiniSiteTemplatePresentation(theme.template, theme.backgroundStyle);

  const renderHero = () => (
    <header
      className={`overflow-hidden rounded-2xl border p-5 md:p-8 ${sectionBorder} ${pageSurface} ${presentation.heroClass}`}
      data-testid="pro-mini-site-hero"
      style={{
        borderColor: theme.template === "service" ? theme.primaryColor : theme.accentColor,
        borderLeftColor: theme.template === "service" ? theme.primaryColor : undefined,
      }}
    >
      <div className={presentation.heroLayoutClass}>
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt=""
            className={`h-16 w-16 object-cover md:h-20 md:w-20 ${
              theme.template === "expert" ? "rounded-full" : "rounded-2xl"
            }`}
          />
        ) : (
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center text-2xl font-bold md:h-20 md:w-20 md:text-3xl ${
              theme.template === "expert" ? "rounded-full" : "rounded-2xl"
            }`}
            style={{ backgroundColor: `${theme.primaryColor}22`, color: theme.primaryColor }}
            aria-hidden
            data-testid="pro-mini-site-logo-placeholder"
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.accentColor }}>
            {presentation.heroBadge}
          </p>
          <h1
            className="mt-1 text-2xl font-bold md:text-4xl"
            data-testid="pro-mini-site-hero-title"
          >
            {heroTitle}
          </h1>
          {heroSubtitle ? (
            <p className={`mt-2 text-sm md:text-base ${mutedText}`} data-testid="pro-mini-site-hero-subtitle">
              {heroSubtitle}
            </p>
          ) : (
            <p className={`mt-3 text-sm md:text-base ${mutedText}`}>{heroIntro(business.operating_mode)}</p>
          )}
          {heroBody ? (
            <p className={`mt-2 text-sm md:text-base ${mutedText}`} data-testid="pro-mini-site-hero-body">
              {heroBody}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {ctas.showBookingCta ? (
          <Link
            to={primaryBookingHref}
            className={`px-5 py-3 text-center text-sm font-semibold text-white hover:opacity-90 ${buttonRadius}`}
            data-testid="pro-mini-site-book-cta"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {bookingCtaTitle}
          </Link>
        ) : null}
        {ctas.showRequestCta ? (
          <Link
            to={secondaryOrderHref}
            className={`border bg-white px-5 py-3 text-center text-sm font-semibold hover:bg-slate-50 ${buttonRadius} ${sectionBorder}`}
            data-testid="pro-mini-site-request-cta"
            style={{ borderColor: theme.accentColor, color: theme.accentColor }}
          >
            Submit a request
          </Link>
        ) : null}
      </div>
    </header>
  );

  const renderAbout = () => (
    <section
      className={`rounded-2xl border p-5 ${sectionBorder} ${pageSurface} ${presentation.sectionClass}`}
      data-testid="pro-mini-site-about"
    >
      <h2 className="text-lg font-semibold">{aboutTitle}</h2>
      {aboutBody ? (
        <p className={`mt-2 text-sm md:text-base ${mutedText}`} data-testid="pro-mini-site-about-body">
          {aboutBody}
        </p>
      ) : business.description ? (
        <p className={`mt-2 text-sm md:text-base ${mutedText}`}>{business.description}</p>
      ) : (
        <p className={`mt-2 text-sm italic ${mutedText}`}>About text will appear here.</p>
      )}
    </section>
  );

  const renderServices = () => (
    <section
      className={`rounded-2xl border p-5 ${sectionBorder} ${pageSurface} ${presentation.sectionClass} ${presentation.servicesClass}`}
      aria-labelledby="pro-mini-site-services-heading"
      data-testid="pro-mini-site-services"
      style={
        theme.template === "service"
          ? { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}12` }
          : undefined
      }
    >
      <h2
        id="pro-mini-site-services-heading"
        className="text-lg font-semibold"
        style={theme.template === "service" ? { color: theme.primaryColor } : undefined}
      >
        {servicesTitle}
      </h2>
      {services && services.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <ServiceCard key={service.id} slug={publicSlug} service={service} />
          ))}
        </div>
      ) : (
        <p className={`mt-2 text-sm ${mutedText}`}>
          Services will appear here.{" "}
          <Link
            to={`/b/${publicSlug}/services`}
            className="font-medium hover:underline"
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
      className={`rounded-2xl border p-5 ${sectionBorder} ${pageSurface} ${presentation.sectionClass}`}
      aria-labelledby="pro-mini-site-contact-heading"
      data-testid="pro-mini-site-contact"
    >
      <h2 id="pro-mini-site-contact-heading" className="text-lg font-semibold">
        {contactTitle}
      </h2>
      <dl className={`mt-3 space-y-2 text-sm ${mutedText}`}>
        {business.address ? (
          <div>
            <dt className="font-medium text-slate-700">Address</dt>
            <dd>{business.address}</dd>
          </div>
        ) : null}
        {business.contact_phone ? (
          <div>
            <dt className="font-medium text-slate-700">Phone</dt>
            <dd>
              <a href={`tel:${business.contact_phone}`} className="hover:underline" style={{ color: theme.primaryColor }}>
                {business.contact_phone}
              </a>
            </dd>
          </div>
        ) : null}
        {!business.address && !business.contact_phone && !hasSocialLinks(socialLinks) ? (
          <p className="text-slate-500">Contact details are not available yet.</p>
        ) : null}
      </dl>
      <SocialLinksList links={socialLinks} mutedText={mutedText} />
    </section>
  );

  const renderBookingCta = () => (
    <section
      className={`rounded-2xl border p-5 text-center ${sectionBorder} ${pageSurface} ${presentation.sectionClass}`}
      data-testid="pro-mini-site-booking-cta-section"
    >
      {ctas.showBookingCta ? (
        <Link
          to={primaryBookingHref}
          className={`inline-block px-5 py-3 text-sm font-semibold text-white hover:opacity-90 ${buttonRadius}`}
          data-testid="pro-mini-site-booking-cta-link"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {bookingCtaTitle}
        </Link>
      ) : null}
    </section>
  );

  const renderGallery = () => (
    <section
      className={`rounded-2xl border p-5 text-center ${sectionBorder} ${pageSurface} ${presentation.galleryClass}`}
      aria-labelledby="pro-mini-site-gallery-heading"
      data-testid="pro-mini-site-gallery-placeholder"
      style={
        theme.template === "portfolio"
          ? { borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}14` }
          : undefined
      }
    >
      <h2 id="pro-mini-site-gallery-heading" className="text-lg font-semibold">
        Gallery
      </h2>
      <p className={`mt-2 text-sm ${mutedText}`}>Media gallery coming soon</p>
    </section>
  );

  const renderGenericSection = (type: MiniSiteSectionType, title: string) => {
    const sectionTitle = getSectionField(siteConfig, type, "title") || title;
    const sectionBody = getSectionField(siteConfig, type, "body");

    return (
      <section
        key={type}
        className={`rounded-2xl border p-5 ${sectionBorder} ${pageSurface} ${presentation.sectionClass}`}
        data-testid={`pro-mini-site-${type}`}
      >
        <h2 className="text-lg font-semibold">{sectionTitle}</h2>
        {sectionBody ? <p className={`mt-2 text-sm ${mutedText}`}>{sectionBody}</p> : null}
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
      case "faq":
        return renderGenericSection(type, "FAQ");
      default:
        return null;
    }
  };

  return (
    <section
      className={`space-y-6 ${presentation.layoutClass}`}
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
  );
}
