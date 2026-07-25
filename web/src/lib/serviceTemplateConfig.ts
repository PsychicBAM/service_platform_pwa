import type { MiniSiteConfig, MiniSiteTheme } from "@/types/miniSite";
import type {
  ServiceBenefitItem,
  ServiceCustomTestimonial,
  ServiceCtaAction,
  ServiceFaqItem,
  ServiceHeroStat,
  ServiceHeroTrustBadge,
  ServiceHowItWorksStep,
  ServicePricingPackage,
  ServiceSectionId,
  ServiceTemplateContent,
  ServiceThemePresetId,
} from "@/types/serviceTemplate";
import {
  SERVICE_SECTION_IDS,
  SERVICE_THEME_PRESET_IDS,
} from "@/types/serviceTemplate";
import {
  getServicePresetVisuals,
  resolveServicePresetVisuals,
  SERVICE_PRESET_VISUALS,
} from "@/lib/serviceTemplatePresets";
import {
  createDefaultServiceTypography,
  normalizeServiceTypography,
} from "@/lib/serviceTemplateTypography";

export {
  SERVICE_FONT_PRESET_OPTIONS,
  buildServiceTypographyCss,
  buildServiceTypographyCssVars,
  coerceTypographyColorInput,
  createDefaultServiceTypography,
  normalizeServiceTypography,
  resolveServiceTypography,
  sanitizeCustomFontFamily,
  sanitizeOptionalHexColor,
  tokenTextClass,
} from "@/lib/serviceTemplateTypography";

export type ServiceThemePresetDefinition = {
  id: ServiceThemePresetId;
  label: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: MiniSiteTheme["backgroundStyle"];
  buttonStyle: MiniSiteTheme["buttonStyle"];
};

export const SERVICE_THEME_PRESETS: Record<ServiceThemePresetId, ServiceThemePresetDefinition> =
  Object.fromEntries(
    SERVICE_THEME_PRESET_IDS.map((id) => {
      const visual = SERVICE_PRESET_VISUALS[id];
      return [
        id,
        {
          id,
          label: visual.label,
          primaryColor: visual.primaryColor,
          accentColor: visual.accentColor,
          backgroundColor: visual.backgroundColor,
          backgroundStyle: visual.backgroundStyle,
          buttonStyle: visual.buttonStyle,
        },
      ];
    }),
  ) as Record<ServiceThemePresetId, ServiceThemePresetDefinition>;

export {
  getServicePresetVisuals,
  resolveServicePresetVisuals,
  SERVICE_PRESET_VISUALS,
};
export type { ServiceContrastTokens, ServiceResolvedVisuals } from "@/lib/serviceTemplatePresets";

const STEP_ICONS = ["clipboard", "calendar", "wrench", "sparkles", "check"] as const;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asCtaAction(value: unknown, fallback: ServiceCtaAction): ServiceCtaAction {
  const allowed: ServiceCtaAction[] = [
    "booking",
    "request",
    "services",
    "call",
    "whatsapp",
    "external",
  ];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as ServiceCtaAction)
    : fallback;
}

function asPreset(value: unknown): ServiceThemePresetId {
  return typeof value === "string" &&
    (SERVICE_THEME_PRESET_IDS as readonly string[]).includes(value)
    ? (value as ServiceThemePresetId)
    : "premium_dark";
}

export function createDefaultServiceTemplateContent(): ServiceTemplateContent {
  return {
    themePreset: "premium_dark",
    typography: createDefaultServiceTypography(),
    hero: {
      eyebrow: "Trusted local professionals",
      headline: "Professional services",
      headlineHighlight: "you can rely on",
      subtitle:
        "Quality. Reliability. Results. Everything your home or business needs, done right the first time.",
      trustBadges: [
        { id: "badge-1", label: "Available 24/7" },
        { id: "badge-2", label: "Fast response" },
        { id: "badge-3", label: "Satisfaction guaranteed" },
      ],
      primaryCtaLabel: "Book a service",
      primaryCtaAction: "booking",
      secondaryCtaLabel: "Get a quote",
      secondaryCtaAction: "request",
      showCallButton: true,
      showWhatsappButton: true,
      ratingLine: "Trusted by local customers",
      stats: [
        { id: "stat-1", value: "500+", label: "Projects completed" },
        { id: "stat-2", value: "98%", label: "Customer satisfaction" },
        { id: "stat-3", value: "24/7", label: "Support available" },
        { id: "stat-4", value: "10+", label: "Years experience" },
      ],
      layoutStyle: "split",
    },
    servicesCatalog: {
      title: "Services we provide",
      subtitle: "Choose an offer and book or request online.",
      selectedServiceIds: [],
      showImage: true,
      showPrice: true,
      showDuration: true,
      showDescription: true,
      showCategory: true,
      cardStyle: "premium",
      desktopColumns: 3,
      mobileStyle: "card_list",
      buttonLabel: "Book now",
    },
    howItWorks: {
      title: "Simple process. Great results.",
      subtitle: "From request to done — clear steps every time.",
      steps: [
        {
          id: "step-1",
          icon: "clipboard",
          title: "Choose a service",
          description: "Pick the offer that matches what you need.",
        },
        {
          id: "step-2",
          icon: "calendar",
          title: "Book or request",
          description: "Schedule online or send a quick quote request.",
        },
        {
          id: "step-3",
          icon: "wrench",
          title: "We get to work",
          description: "Our team delivers with clear communication.",
        },
        {
          id: "step-4",
          icon: "sparkles",
          title: "You relax",
          description: "Enjoy reliable results without the hassle.",
        },
      ],
      showNumbering: true,
      backgroundStyle: "light",
    },
    whyChooseUs: {
      title: "We deliver more than just service",
      subtitle: "Why customers choose us",
      description:
        "Local professionals focused on quality work, transparent pricing, and dependable support.",
      benefits: [
        { id: "ben-1", text: "Experienced and verified team" },
        { id: "ben-2", text: "Transparent pricing" },
        { id: "ben-3", text: "Fast response times" },
        { id: "ben-4", text: "Satisfaction-focused delivery" },
      ],
      layout: "image_right",
      ctaLabel: "Learn more",
      ctaAction: "services",
      showCta: true,
    },
    pricingPackages: {
      title: "Simple pricing. No hidden fees.",
      subtitle: "Marketing packages you can customize for your brand.",
      packages: [
        {
          id: "pkg-basic",
          name: "Basic",
          price: "$99",
          billingLabel: "visit",
          description: "Essential coverage for straightforward jobs.",
          includes: ["Standard visit", "Clear quote", "Email support"],
          popular: false,
          ctaLabel: "Book now",
          ctaAction: "booking",
        },
        {
          id: "pkg-standard",
          name: "Standard",
          price: "$149",
          billingLabel: "visit",
          description: "Our most popular package for everyday needs.",
          includes: ["Priority scheduling", "Detailed report", "Phone support", "Follow-up check"],
          popular: true,
          ctaLabel: "Book now",
          ctaAction: "booking",
        },
        {
          id: "pkg-premium",
          name: "Premium",
          price: "$249",
          billingLabel: "project",
          description: "Full-service coverage for larger projects.",
          includes: [
            "Dedicated coordinator",
            "Flexible scheduling",
            "Priority support",
            "Quality guarantee",
          ],
          popular: false,
          ctaLabel: "Get a quote",
          ctaAction: "request",
        },
      ],
      showComparison: true,
    },
    reviews: {
      title: "Real reviews from real people",
      subtitle: "Social proof from customers who booked with you.",
      source: "approved",
      maxCount: 6,
      showRating: true,
      showAvatar: true,
      customTestimonials: [],
    },
    faq: {
      title: "Frequently asked questions",
      subtitle: "Quick answers before you book.",
      items: [
        {
          id: "faq-1",
          question: "How do I book a service?",
          answer: "Choose a service, pick a time or send a request, and confirm online.",
        },
        {
          id: "faq-2",
          question: "What areas do you serve?",
          answer: "We serve local customers. Contact us if you are unsure about coverage.",
        },
        {
          id: "faq-3",
          question: "How are prices calculated?",
          answer: "Listed prices apply when shown. Custom work is quoted before you confirm.",
        },
        {
          id: "faq-4",
          question: "Can I request a quote first?",
          answer: "Yes. Use Get a quote / Send request for order-style services.",
        },
      ],
      defaultOpenId: "faq-1",
    },
    contactCta: {
      headline: "Ready to get started?",
      subtitle: "Book a service or send a request — we respond quickly.",
      primaryCtaLabel: "Book a service",
      primaryCtaAction: "booking",
      secondaryCtaLabel: "Get a free quote",
      secondaryCtaAction: "request",
      showPhone: true,
      showEmail: true,
      showLocation: true,
      showHours: true,
      backgroundStyle: "dark",
    },
    footer: {
      description: "Professional local service you can book online with confidence.",
      showQuickLinks: true,
      showServicesLinks: true,
      showSocialLinks: true,
      showContactInfo: true,
      copyrightText: "",
    },
    sectionOrder: [...SERVICE_SECTION_IDS],
    sectionVisibility: {
      hero: true,
      services: true,
      "how-it-works": true,
      "why-choose-us": true,
      pricing: true,
      reviews: true,
      faq: true,
      contact: true,
      footer: true,
    },
  };
}

function normalizeTrustBadges(input: unknown): ServiceHeroTrustBadge[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().hero.trustBadges;
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const label = asString(row.label).trim();
      if (!label) return null;
      return { id: asString(row.id, `badge-${index + 1}`), label };
    })
    .filter((entry): entry is ServiceHeroTrustBadge => entry !== null)
    .slice(0, 8);
}

function normalizeStats(input: unknown): ServiceHeroStat[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().hero.stats;
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const value = asString(row.value).trim();
      const label = asString(row.label).trim();
      if (!value && !label) return null;
      return {
        id: asString(row.id, `stat-${index + 1}`),
        value: value || "—",
        label: label || "Stat",
      };
    })
    .filter((entry): entry is ServiceHeroStat => entry !== null)
    .slice(0, 6);
}

function normalizeSteps(input: unknown): ServiceHowItWorksStep[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().howItWorks.steps;
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const title = asString(row.title).trim();
      if (!title) return null;
      const iconRaw = asString(row.icon, STEP_ICONS[index % STEP_ICONS.length]);
      return {
        id: asString(row.id, `step-${index + 1}`),
        icon: iconRaw || STEP_ICONS[index % STEP_ICONS.length],
        title,
        description: asString(row.description),
      };
    })
    .filter((entry): entry is ServiceHowItWorksStep => entry !== null)
    .slice(0, 5);
}

function normalizeBenefits(input: unknown): ServiceBenefitItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().whyChooseUs.benefits;
  }
  return input
    .map((entry, index) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        return text ? { id: `ben-${index + 1}`, text } : null;
      }
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const text = asString(row.text ?? row.label).trim();
      if (!text) return null;
      return { id: asString(row.id, `ben-${index + 1}`), text };
    })
    .filter((entry): entry is ServiceBenefitItem => entry !== null)
    .slice(0, 12);
}

function normalizePackages(input: unknown): ServicePricingPackage[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().pricingPackages.packages;
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const name = asString(row.name).trim();
      if (!name) return null;
      const includes = Array.isArray(row.includes)
        ? row.includes.map((item) => asString(item).trim()).filter(Boolean).slice(0, 12)
        : [];
      return {
        id: asString(row.id, `pkg-${index + 1}`),
        name,
        price: asString(row.price, "$0"),
        billingLabel: asString(row.billingLabel ?? row.billing_label, "visit"),
        description: asString(row.description),
        includes,
        popular: asBoolean(row.popular, false),
        ctaLabel: asString(row.ctaLabel ?? row.cta_label, "Book now"),
        ctaAction: asCtaAction(row.ctaAction ?? row.cta_action, "booking"),
      };
    })
    .filter((entry): entry is ServicePricingPackage => entry !== null)
    .slice(0, 6);
}

function normalizeCustomTestimonials(input: unknown): ServiceCustomTestimonial[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const name = asString(row.name).trim();
      const quote = asString(row.quote).trim();
      if (!name || !quote) return null;
      const rating = Math.min(5, Math.max(1, asNumber(row.rating, 5)));
      return {
        id: asString(row.id, `testimonial-${index + 1}`),
        name,
        quote,
        rating,
      };
    })
    .filter((entry): entry is ServiceCustomTestimonial => entry !== null)
    .slice(0, 12);
}

function normalizeFaqItems(input: unknown): ServiceFaqItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    return createDefaultServiceTemplateContent().faq.items;
  }
  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const question = asString(row.question).trim();
      const answer = asString(row.answer).trim();
      if (!question && !answer) return null;
      return {
        id: asString(row.id, `faq-${index + 1}`),
        question: question || `Question ${index + 1}`,
        answer,
      };
    })
    .filter((entry): entry is ServiceFaqItem => entry !== null)
    .slice(0, 20);
}

function normalizeSectionOrder(input: unknown): ServiceSectionId[] {
  const defaults = [...SERVICE_SECTION_IDS];
  if (!Array.isArray(input)) {
    return defaults;
  }
  const seen = new Set<ServiceSectionId>();
  const ordered: ServiceSectionId[] = [];
  for (const entry of input) {
    if (
      typeof entry === "string" &&
      (SERVICE_SECTION_IDS as readonly string[]).includes(entry) &&
      !seen.has(entry as ServiceSectionId)
    ) {
      ordered.push(entry as ServiceSectionId);
      seen.add(entry as ServiceSectionId);
    }
  }
  for (const id of defaults) {
    if (!seen.has(id)) {
      ordered.push(id);
    }
  }
  return ordered;
}

function normalizeVisibility(input: unknown): Record<ServiceSectionId, boolean> {
  const defaults = createDefaultServiceTemplateContent().sectionVisibility;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...defaults };
  }
  const source = input as Record<string, unknown>;
  const result = { ...defaults };
  for (const id of SERVICE_SECTION_IDS) {
    if (typeof source[id] === "boolean") {
      result[id] = source[id];
    }
  }
  return result;
}

export function normalizeServiceTemplateContent(input: unknown): ServiceTemplateContent {
  const defaults = createDefaultServiceTemplateContent();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return defaults;
  }
  const source = input as Record<string, unknown>;
  const heroSource =
    source.hero && typeof source.hero === "object" && !Array.isArray(source.hero)
      ? (source.hero as Record<string, unknown>)
      : {};
  const catalogSource =
    source.servicesCatalog &&
    typeof source.servicesCatalog === "object" &&
    !Array.isArray(source.servicesCatalog)
      ? (source.servicesCatalog as Record<string, unknown>)
      : source.services_catalog &&
          typeof source.services_catalog === "object" &&
          !Array.isArray(source.services_catalog)
        ? (source.services_catalog as Record<string, unknown>)
        : {};
  const howSource =
    source.howItWorks && typeof source.howItWorks === "object" && !Array.isArray(source.howItWorks)
      ? (source.howItWorks as Record<string, unknown>)
      : source.how_it_works &&
          typeof source.how_it_works === "object" &&
          !Array.isArray(source.how_it_works)
        ? (source.how_it_works as Record<string, unknown>)
        : {};
  const whySource =
    source.whyChooseUs && typeof source.whyChooseUs === "object" && !Array.isArray(source.whyChooseUs)
      ? (source.whyChooseUs as Record<string, unknown>)
      : source.why_choose_us &&
          typeof source.why_choose_us === "object" &&
          !Array.isArray(source.why_choose_us)
        ? (source.why_choose_us as Record<string, unknown>)
        : {};
  const pricingSource =
    source.pricingPackages &&
    typeof source.pricingPackages === "object" &&
    !Array.isArray(source.pricingPackages)
      ? (source.pricingPackages as Record<string, unknown>)
      : source.pricing_packages &&
          typeof source.pricing_packages === "object" &&
          !Array.isArray(source.pricing_packages)
        ? (source.pricing_packages as Record<string, unknown>)
        : {};
  const reviewsSource =
    source.reviews && typeof source.reviews === "object" && !Array.isArray(source.reviews)
      ? (source.reviews as Record<string, unknown>)
      : {};
  const faqSource =
    source.faq && typeof source.faq === "object" && !Array.isArray(source.faq)
      ? (source.faq as Record<string, unknown>)
      : {};
  const contactSource =
    source.contactCta && typeof source.contactCta === "object" && !Array.isArray(source.contactCta)
      ? (source.contactCta as Record<string, unknown>)
      : source.contact_cta &&
          typeof source.contact_cta === "object" &&
          !Array.isArray(source.contact_cta)
        ? (source.contact_cta as Record<string, unknown>)
        : {};
  const footerSource =
    source.footer && typeof source.footer === "object" && !Array.isArray(source.footer)
      ? (source.footer as Record<string, unknown>)
      : {};

  const selectedIdsRaw =
    catalogSource.selectedServiceIds ?? catalogSource.selected_service_ids;
  const selectedServiceIds = Array.isArray(selectedIdsRaw)
    ? selectedIdsRaw.map((id) => asString(id).trim()).filter(Boolean)
    : [];

  const cardStyleRaw = asString(catalogSource.cardStyle ?? catalogSource.card_style, "premium");
  const cardStyle =
    cardStyleRaw === "image_top" || cardStyleRaw === "compact" || cardStyleRaw === "premium"
      ? cardStyleRaw
      : "premium";
  const columnsRaw = asNumber(catalogSource.desktopColumns ?? catalogSource.desktop_columns, 3);
  const desktopColumns = columnsRaw === 2 || columnsRaw === 4 ? columnsRaw : 3;
  const mobileRaw = asString(catalogSource.mobileStyle ?? catalogSource.mobile_style, "card_list");
  const mobileStyle = mobileRaw === "compact_list" ? "compact_list" : "card_list";

  const layoutRaw = asString(whySource.layout, "image_right");
  const whyLayout =
    layoutRaw === "image_left" || layoutRaw === "cards_grid" || layoutRaw === "image_right"
      ? layoutRaw
      : "image_right";

  const reviewsSourceMode = asString(reviewsSource.source, "approved");
  const sourceMode =
    reviewsSourceMode === "custom" || reviewsSourceMode === "both" || reviewsSourceMode === "approved"
      ? reviewsSourceMode
      : "approved";

  const contactBg = asString(
    contactSource.backgroundStyle ?? contactSource.background_style,
    "dark",
  );
  const contactBackgroundStyle =
    contactBg === "primary" || contactBg === "soft" || contactBg === "dark" ? contactBg : "dark";

  const heroLayout = asString(heroSource.layoutStyle ?? heroSource.layout_style, "split");
  const layoutStyle =
    heroLayout === "overlay" || heroLayout === "centered" || heroLayout === "split"
      ? heroLayout
      : "split";

  const howBg = asString(howSource.backgroundStyle ?? howSource.background_style, "light");
  const howBackgroundStyle =
    howBg === "soft" || howBg === "dark" || howBg === "light" ? howBg : "light";

  return {
    themePreset: asPreset(source.themePreset ?? source.theme_preset),
    hero: {
      eyebrow: asString(heroSource.eyebrow, defaults.hero.eyebrow),
      headline: asString(heroSource.headline, defaults.hero.headline),
      headlineHighlight: asString(
        heroSource.headlineHighlight ?? heroSource.headline_highlight,
        defaults.hero.headlineHighlight,
      ),
      subtitle: asString(heroSource.subtitle, defaults.hero.subtitle),
      trustBadges: normalizeTrustBadges(heroSource.trustBadges ?? heroSource.trust_badges),
      primaryCtaLabel: asString(
        heroSource.primaryCtaLabel ?? heroSource.primary_cta_label,
        defaults.hero.primaryCtaLabel,
      ),
      primaryCtaAction: asCtaAction(
        heroSource.primaryCtaAction ?? heroSource.primary_cta_action,
        defaults.hero.primaryCtaAction,
      ),
      secondaryCtaLabel: asString(
        heroSource.secondaryCtaLabel ?? heroSource.secondary_cta_label,
        defaults.hero.secondaryCtaLabel,
      ),
      secondaryCtaAction: asCtaAction(
        heroSource.secondaryCtaAction ?? heroSource.secondary_cta_action,
        defaults.hero.secondaryCtaAction,
      ),
      showCallButton: asBoolean(
        heroSource.showCallButton ?? heroSource.show_call_button,
        defaults.hero.showCallButton,
      ),
      showWhatsappButton: asBoolean(
        heroSource.showWhatsappButton ?? heroSource.show_whatsapp_button,
        defaults.hero.showWhatsappButton,
      ),
      ratingLine: asString(
        heroSource.ratingLine ?? heroSource.rating_line,
        defaults.hero.ratingLine,
      ),
      stats: normalizeStats(heroSource.stats),
      layoutStyle,
    },
    servicesCatalog: {
      title: asString(catalogSource.title, defaults.servicesCatalog.title),
      subtitle: asString(catalogSource.subtitle, defaults.servicesCatalog.subtitle),
      selectedServiceIds,
      showImage: asBoolean(
        catalogSource.showImage ?? catalogSource.show_image,
        defaults.servicesCatalog.showImage,
      ),
      showPrice: asBoolean(
        catalogSource.showPrice ?? catalogSource.show_price,
        defaults.servicesCatalog.showPrice,
      ),
      showDuration: asBoolean(
        catalogSource.showDuration ?? catalogSource.show_duration,
        defaults.servicesCatalog.showDuration,
      ),
      showDescription: asBoolean(
        catalogSource.showDescription ?? catalogSource.show_description,
        defaults.servicesCatalog.showDescription,
      ),
      showCategory: asBoolean(
        catalogSource.showCategory ?? catalogSource.show_category,
        defaults.servicesCatalog.showCategory,
      ),
      cardStyle,
      desktopColumns,
      mobileStyle,
      buttonLabel: asString(
        catalogSource.buttonLabel ?? catalogSource.button_label,
        defaults.servicesCatalog.buttonLabel,
      ),
    },
    howItWorks: {
      title: asString(howSource.title, defaults.howItWorks.title),
      subtitle: asString(howSource.subtitle, defaults.howItWorks.subtitle),
      steps: normalizeSteps(howSource.steps),
      showNumbering: asBoolean(
        howSource.showNumbering ?? howSource.show_numbering,
        defaults.howItWorks.showNumbering,
      ),
      backgroundStyle: howBackgroundStyle,
    },
    whyChooseUs: {
      title: asString(whySource.title, defaults.whyChooseUs.title),
      subtitle: asString(whySource.subtitle, defaults.whyChooseUs.subtitle),
      description: asString(whySource.description, defaults.whyChooseUs.description),
      benefits: normalizeBenefits(whySource.benefits),
      layout: whyLayout,
      ctaLabel: asString(whySource.ctaLabel ?? whySource.cta_label, defaults.whyChooseUs.ctaLabel),
      ctaAction: asCtaAction(
        whySource.ctaAction ?? whySource.cta_action,
        defaults.whyChooseUs.ctaAction,
      ),
      showCta: asBoolean(whySource.showCta ?? whySource.show_cta, defaults.whyChooseUs.showCta),
    },
    pricingPackages: {
      title: asString(pricingSource.title, defaults.pricingPackages.title),
      subtitle: asString(pricingSource.subtitle, defaults.pricingPackages.subtitle),
      packages: normalizePackages(pricingSource.packages),
      showComparison: asBoolean(
        pricingSource.showComparison ?? pricingSource.show_comparison,
        defaults.pricingPackages.showComparison,
      ),
    },
    reviews: {
      title: asString(reviewsSource.title, defaults.reviews.title),
      subtitle: asString(reviewsSource.subtitle, defaults.reviews.subtitle),
      source: sourceMode,
      maxCount: Math.min(12, Math.max(1, asNumber(reviewsSource.maxCount ?? reviewsSource.max_count, 6))),
      showRating: asBoolean(
        reviewsSource.showRating ?? reviewsSource.show_rating,
        defaults.reviews.showRating,
      ),
      showAvatar: asBoolean(
        reviewsSource.showAvatar ?? reviewsSource.show_avatar,
        defaults.reviews.showAvatar,
      ),
      customTestimonials: normalizeCustomTestimonials(
        reviewsSource.customTestimonials ?? reviewsSource.custom_testimonials,
      ),
    },
    faq: {
      title: asString(faqSource.title, defaults.faq.title),
      subtitle: asString(faqSource.subtitle, defaults.faq.subtitle),
      items: normalizeFaqItems(faqSource.items),
      defaultOpenId:
        faqSource.defaultOpenId === null || faqSource.default_open_id === null
          ? null
          : asString(
              faqSource.defaultOpenId ?? faqSource.default_open_id,
              defaults.faq.defaultOpenId ?? "",
            ) || null,
    },
    contactCta: {
      headline: asString(contactSource.headline, defaults.contactCta.headline),
      subtitle: asString(contactSource.subtitle, defaults.contactCta.subtitle),
      primaryCtaLabel: asString(
        contactSource.primaryCtaLabel ?? contactSource.primary_cta_label,
        defaults.contactCta.primaryCtaLabel,
      ),
      primaryCtaAction: asCtaAction(
        contactSource.primaryCtaAction ?? contactSource.primary_cta_action,
        defaults.contactCta.primaryCtaAction,
      ),
      secondaryCtaLabel: asString(
        contactSource.secondaryCtaLabel ?? contactSource.secondary_cta_label,
        defaults.contactCta.secondaryCtaLabel,
      ),
      secondaryCtaAction: asCtaAction(
        contactSource.secondaryCtaAction ?? contactSource.secondary_cta_action,
        defaults.contactCta.secondaryCtaAction,
      ),
      showPhone: asBoolean(
        contactSource.showPhone ?? contactSource.show_phone,
        defaults.contactCta.showPhone,
      ),
      showEmail: asBoolean(
        contactSource.showEmail ?? contactSource.show_email,
        defaults.contactCta.showEmail,
      ),
      showLocation: asBoolean(
        contactSource.showLocation ?? contactSource.show_location,
        defaults.contactCta.showLocation,
      ),
      showHours: asBoolean(
        contactSource.showHours ?? contactSource.show_hours,
        defaults.contactCta.showHours,
      ),
      backgroundStyle: contactBackgroundStyle,
    },
    footer: {
      description: asString(footerSource.description, defaults.footer.description),
      showQuickLinks: asBoolean(
        footerSource.showQuickLinks ?? footerSource.show_quick_links,
        defaults.footer.showQuickLinks,
      ),
      showServicesLinks: asBoolean(
        footerSource.showServicesLinks ?? footerSource.show_services_links,
        defaults.footer.showServicesLinks,
      ),
      showSocialLinks: asBoolean(
        footerSource.showSocialLinks ?? footerSource.show_social_links,
        defaults.footer.showSocialLinks,
      ),
      showContactInfo: asBoolean(
        footerSource.showContactInfo ?? footerSource.show_contact_info,
        defaults.footer.showContactInfo,
      ),
      copyrightText: asString(
        footerSource.copyrightText ?? footerSource.copyright_text,
        defaults.footer.copyrightText,
      ),
    },
    sectionOrder: normalizeSectionOrder(source.sectionOrder ?? source.section_order),
    sectionVisibility: normalizeVisibility(
      source.sectionVisibility ?? source.section_visibility,
    ),
    typography: normalizeServiceTypography(source.typography),
  };
}

export function getServiceTemplateContent(config: MiniSiteConfig): ServiceTemplateContent {
  return normalizeServiceTemplateContent(config.templateContent.service);
}

export function setServiceTemplateContent(
  config: MiniSiteConfig,
  service: ServiceTemplateContent,
): MiniSiteConfig {
  return {
    ...config,
    templateContent: {
      ...config.templateContent,
      service: { ...service } as Record<string, unknown>,
    },
  };
}

export function applyServiceThemePreset(
  config: MiniSiteConfig,
  presetId: ServiceThemePresetId,
): MiniSiteConfig {
  const preset = SERVICE_THEME_PRESETS[presetId];
  const service = {
    ...getServiceTemplateContent(config),
    themePreset: presetId,
  };
  return setServiceTemplateContent(
    {
      ...config,
      theme: {
        ...config.theme,
        template: "service",
        primaryColor: preset.primaryColor,
        accentColor: preset.accentColor,
        backgroundColor: preset.backgroundColor,
        backgroundStyle: preset.backgroundStyle,
        buttonStyle: preset.buttonStyle,
      },
    },
    service,
  );
}

export function getEnabledServiceSections(
  content: ServiceTemplateContent,
): ServiceSectionId[] {
  return content.sectionOrder.filter((id) => content.sectionVisibility[id] !== false);
}

export function orderPublicServicesBySelection<T extends { id: string }>(
  services: T[] | undefined,
  selectedServiceIds: string[],
): T[] {
  if (!services || services.length === 0) {
    return [];
  }
  if (selectedServiceIds.length === 0) {
    return services;
  }
  const byId = new Map(services.map((service) => [service.id, service]));
  const ordered: T[] = [];
  for (const id of selectedServiceIds) {
    const match = byId.get(id);
    if (match) {
      ordered.push(match);
      byId.delete(id);
    }
  }
  return ordered;
}

export function newServiceEntityId(prefix: string): string {
  return uid(prefix);
}

export const SERVICE_STEP_ICON_OPTIONS = [
  { id: "clipboard", label: "Clipboard" },
  { id: "calendar", label: "Calendar" },
  { id: "wrench", label: "Wrench" },
  { id: "sparkles", label: "Sparkles" },
  { id: "check", label: "Check" },
  { id: "shield", label: "Shield" },
  { id: "clock", label: "Clock" },
  { id: "star", label: "Star" },
] as const;
