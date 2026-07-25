import type { MiniSiteConfig, MiniSiteTheme } from "@/types/miniSite";
import type {
  ExpertArticleItem,
  ExpertArticleType,
  ExpertCtaAction,
  ExpertSectionId,
  ExpertTemplateContent,
  ExpertThemePresetId,
  ExpertWorkItem,
  ExpertTestimonialItem,
  ExpertExpertiseItem,
  ExpertProcessStep,
  ExpertResultItem,
  ExpertFaqItem,
  ExpertCredential,
  ExpertHeroStat,
} from "@/types/expertTemplate";
import { EXPERT_SECTION_IDS, EXPERT_THEME_PRESET_IDS } from "@/types/expertTemplate";
import {
  EXPERT_PRESET_VISUALS,
  getExpertPresetVisuals,
  resolveExpertPresetVisuals,
} from "@/lib/expertTemplatePresets";
import {
  createDefaultExpertTypography,
  normalizeExpertTypography,
} from "@/lib/expertTemplateTypography";
import { orderPublicServicesBySelection } from "@/lib/serviceTemplateConfig";
import type { PublicService } from "@/types/api";

export {
  EXPERT_FONT_PRESET_OPTIONS,
  buildExpertTypographyCss,
  buildExpertTypographyCssVars,
  coerceTypographyColorInput,
  createDefaultExpertTypography,
  normalizeExpertTypography,
  resolveExpertTypography,
  sanitizeCustomFontFamily,
  tokenTextClass,
} from "@/lib/expertTemplateTypography";

export {
  getExpertPresetVisuals,
  resolveExpertPresetVisuals,
  EXPERT_PRESET_VISUALS,
};
export type { ExpertResolvedVisuals } from "@/lib/expertTemplatePresets";

export { orderPublicServicesBySelection };

export type ExpertThemePresetDefinition = {
  id: ExpertThemePresetId;
  label: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: MiniSiteTheme["backgroundStyle"];
  buttonStyle: MiniSiteTheme["buttonStyle"];
};

export const EXPERT_THEME_PRESETS: Record<ExpertThemePresetId, ExpertThemePresetDefinition> =
  Object.fromEntries(
    EXPERT_THEME_PRESET_IDS.map((id) => {
      const visual = EXPERT_PRESET_VISUALS[id];
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
  ) as Record<ExpertThemePresetId, ExpertThemePresetDefinition>;

const MAX = {
  articles: 12,
  works: 12,
  testimonials: 12,
  expertise: 16,
  process: 6,
  results: 8,
  faq: 12,
  credentials: 10,
  stats: 6,
  badges: 6,
  metrics: 4,
} as const;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newExpertEntityId(prefix: string): string {
  return uid(prefix);
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

function asCta(value: unknown, fallback: ExpertCtaAction): ExpertCtaAction {
  const allowed: ExpertCtaAction[] = [
    "booking",
    "request",
    "services",
    "call",
    "whatsapp",
    "external",
  ];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as ExpertCtaAction)
    : fallback;
}

function asPreset(value: unknown): ExpertThemePresetId {
  return typeof value === "string" &&
    (EXPERT_THEME_PRESET_IDS as readonly string[]).includes(value)
    ? (value as ExpertThemePresetId)
    : "calm_green";
}

function asArticleType(value: unknown): ExpertArticleType {
  const allowed: ExpertArticleType[] = [
    "article",
    "publication",
    "media",
    "research",
    "guide",
  ];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as ExpertArticleType)
    : "article";
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function createDefaultExpertTemplateContent(): ExpertTemplateContent {
  return {
    themePreset: "calm_green",
    typography: createDefaultExpertTypography(),
    hero: {
      eyebrow: "Expert profile",
      professionalTitle: "Consultant & coach",
      headline: "Clarity, confidence,",
      headlineHighlight: "and lasting results",
      subtitle:
        "Work one-on-one with a specialist who helps you move from uncertainty to a clear plan you can trust.",
      trustBadges: ["Certified professional", "1:1 sessions", "Practical guidance"],
      primaryCtaLabel: "Book consultation",
      primaryCtaAction: "booking",
      secondaryCtaLabel: "View services",
      secondaryCtaAction: "services",
      showCallButton: true,
      showWhatsappButton: true,
      stats: [
        { id: "stat-1", value: "10+", label: "Years experience" },
        { id: "stat-2", value: "500+", label: "Clients helped" },
        { id: "stat-3", value: "4.9", label: "Average rating" },
        { id: "stat-4", value: "1,000+", label: "Sessions delivered" },
      ],
    },
    about: {
      title: "Dedicated to your growth",
      subtitle: "About",
      bio: "I help professionals and teams gain clarity, build confidence, and take action with a practical, personalized approach.",
      credentials: [
        { id: "cred-1", text: "Certified coach / consultant" },
        { id: "cred-2", text: "Evidence-based methods" },
        { id: "cred-3", text: "Clear session structure" },
        { id: "cred-4", text: "Confidential and respectful" },
      ],
      ctaLabel: "Learn more",
      ctaAction: "services",
      showCta: true,
    },
    services: {
      title: "Sessions & services",
      subtitle: "Choose the format that fits your goals.",
      selectedServiceIds: [],
      showImage: true,
      showPrice: true,
      showDuration: true,
      showDescription: true,
      buttonLabel: "Book session",
    },
    expertise: {
      title: "Areas of expertise",
      subtitle: "Where I can help most.",
      items: [
        {
          id: "exp-1",
          label: "Strategy & clarity",
          description: "Define priorities and a realistic path forward.",
          visible: true,
        },
        {
          id: "exp-2",
          label: "Performance",
          description: "Build habits and systems that stick.",
          visible: true,
        },
        {
          id: "exp-3",
          label: "Communication",
          description: "Lead conversations with confidence.",
          visible: true,
        },
      ],
    },
    process: {
      title: "How we work together",
      subtitle: "A clear path from first call to follow-up.",
      steps: [
        {
          id: "step-1",
          title: "Discover",
          description: "Share your goals and current challenges.",
        },
        {
          id: "step-2",
          title: "Book",
          description: "Choose a session that fits your schedule.",
        },
        {
          id: "step-3",
          title: "Session",
          description: "Focused work with clear takeaways.",
        },
        {
          id: "step-4",
          title: "Follow-up",
          description: "Stay accountable with practical next steps.",
        },
      ],
      showNumbering: true,
    },
    results: {
      title: "Proof points",
      subtitle: "Outcomes that matter.",
      items: [
        { id: "res-1", value: "92%", label: "Clients report clearer direction" },
        { id: "res-2", value: "3–6", label: "Sessions for a focused plan" },
        { id: "res-3", value: "1:1", label: "Personalized support" },
      ],
    },
    articles: {
      title: "Articles & publications",
      subtitle: "Insights, guides, and thought leadership.",
      items: [],
    },
    works: {
      title: "Selected work",
      subtitle: "Case studies and outcomes.",
      items: [],
    },
    testimonials: {
      title: "Reviews & testimonials",
      subtitle: "What clients say about working together.",
      source: "both",
      maxCount: 6,
      showRating: true,
      items: [],
    },
    faq: {
      title: "Frequently asked questions",
      subtitle: "Quick answers before you book.",
      items: [
        {
          id: "faq-1",
          question: "How do sessions work?",
          answer: "Book online, join on the scheduled time, and leave with clear next steps.",
        },
        {
          id: "faq-2",
          question: "Are sessions online or in person?",
          answer: "Both formats can be offered depending on the service you choose.",
        },
        {
          id: "faq-3",
          question: "How should I prepare?",
          answer: "Bring your goals and any context that helps us start productively.",
        },
      ],
    },
    contactCta: {
      headline: "Ready to take the next step?",
      subtitle: "Book a consultation or send a message — I’ll help you find the right starting point.",
      primaryCtaLabel: "Book consultation",
      primaryCtaAction: "booking",
      secondaryCtaLabel: "View services",
      secondaryCtaAction: "services",
      showPhone: true,
      showEmail: true,
      showLocation: true,
      backgroundStyle: "primary",
    },
    footer: {
      description: "Personal consulting and coaching focused on clarity, confidence, and results.",
      showQuickLinks: true,
      showServicesLinks: true,
      showSocialLinks: true,
      showContactInfo: true,
      copyrightText: "",
    },
    sectionOrder: [...EXPERT_SECTION_IDS],
    sectionVisibility: Object.fromEntries(
      EXPERT_SECTION_IDS.map((id) => [id, true]),
    ) as Record<ExpertSectionId, boolean>,
  };
}

function normalizeStats(input: unknown): ExpertHeroStat[] {
  const defaults = createDefaultExpertTemplateContent().hero.stats;
  if (!Array.isArray(input) || input.length === 0) return defaults;
  return input
    .slice(0, MAX.stats)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `stat-${index + 1}`),
        value: asString(row.value, "—"),
        label: asString(row.label, "Stat"),
      };
    })
    .filter((item) => item.label);
}

function normalizeCredentials(input: unknown): ExpertCredential[] {
  const defaults = createDefaultExpertTemplateContent().about.credentials;
  if (!Array.isArray(input) || input.length === 0) return defaults;
  return input
    .slice(0, MAX.credentials)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `cred-${index + 1}`),
        text: asString(row.text, ""),
      };
    })
    .filter((item) => item.text);
}

function normalizeExpertise(input: unknown): ExpertExpertiseItem[] {
  const defaults = createDefaultExpertTemplateContent().expertise.items;
  if (!Array.isArray(input)) return defaults;
  return input
    .slice(0, MAX.expertise)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `exp-${index + 1}`),
        label: asString(row.label, "Expertise"),
        description: asString(row.description, ""),
        visible: asBoolean(row.visible, true),
      };
    })
    .filter((item) => item.label);
}

function normalizeProcess(input: unknown): ExpertProcessStep[] {
  const defaults = createDefaultExpertTemplateContent().process.steps;
  if (!Array.isArray(input) || input.length === 0) return defaults;
  return input
    .slice(0, MAX.process)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `step-${index + 1}`),
        title: asString(row.title, `Step ${index + 1}`),
        description: asString(row.description, ""),
      };
    })
    .filter((item) => item.title);
}

function normalizeResults(input: unknown): ExpertResultItem[] {
  const defaults = createDefaultExpertTemplateContent().results.items;
  if (!Array.isArray(input) || input.length === 0) return defaults;
  return input
    .slice(0, MAX.results)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `res-${index + 1}`),
        value: asString(row.value, "—"),
        label: asString(row.label, "Result"),
      };
    })
    .filter((item) => item.label);
}

function normalizeArticles(input: unknown): ExpertArticleItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, MAX.articles)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `article-${index + 1}`),
        title: asString(row.title, "Untitled article"),
        type: asArticleType(row.type),
        category: asString(row.category, ""),
        date: asString(row.date, ""),
        excerpt: asString(row.excerpt, ""),
        body: asString(row.body, ""),
        externalUrl: asString(row.externalUrl ?? row.external_url, ""),
        readingTime: asString(row.readingTime ?? row.reading_time, ""),
        featured: asBoolean(row.featured, false),
        coverImageUrl: asString(row.coverImageUrl ?? row.cover_image_url, ""),
        visible: asBoolean(row.visible, true),
      };
    })
    .filter((item) => item.title);
}

function normalizeWorks(input: unknown): ExpertWorkItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, MAX.works)
    .map((item, index) => {
      const row = obj(item);
      const metricsRaw = row.metrics;
      const metrics = Array.isArray(metricsRaw)
        ? metricsRaw.map((m) => asString(m).trim()).filter(Boolean).slice(0, MAX.metrics)
        : [];
      return {
        id: asString(row.id, `work-${index + 1}`),
        title: asString(row.title, "Untitled work"),
        clientName: asString(row.clientName ?? row.client_name, ""),
        category: asString(row.category, ""),
        year: asString(row.year ?? row.date, ""),
        shortDescription: asString(row.shortDescription ?? row.short_description, ""),
        challenge: asString(row.challenge, ""),
        result: asString(row.result, ""),
        linkUrl: asString(row.linkUrl ?? row.link_url, ""),
        coverImageUrl: asString(row.coverImageUrl ?? row.cover_image_url, ""),
        metrics,
        visible: asBoolean(row.visible, true),
      };
    })
    .filter((item) => item.title);
}

function normalizeTestimonials(input: unknown): ExpertTestimonialItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, MAX.testimonials)
    .map((item, index) => {
      const row = obj(item);
      const name = asString(row.name, "Client");
      const rating = Math.max(0, Math.min(5, Math.round(asNumber(row.rating, 5))));
      return {
        id: asString(row.id, `testimonial-${index + 1}`),
        name,
        role: asString(row.role ?? row.company, ""),
        quote: asString(row.quote, ""),
        rating,
        date: asString(row.date, ""),
        avatarInitials: asString(
          row.avatarInitials ?? row.avatar_initials,
          name
            .split(/\s+/)
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase() || "C",
        ),
        visible: asBoolean(row.visible, true),
      };
    })
    .filter((item) => item.quote);
}

function normalizeFaq(input: unknown): ExpertFaqItem[] {
  const defaults = createDefaultExpertTemplateContent().faq.items;
  if (!Array.isArray(input) || input.length === 0) return defaults;
  return input
    .slice(0, MAX.faq)
    .map((item, index) => {
      const row = obj(item);
      return {
        id: asString(row.id, `faq-${index + 1}`),
        question: asString(row.question, ""),
        answer: asString(row.answer, ""),
      };
    })
    .filter((item) => item.question);
}

function normalizeOrder(input: unknown): ExpertSectionId[] {
  const defaults = [...EXPERT_SECTION_IDS];
  if (!Array.isArray(input)) return defaults;
  const seen = new Set<string>();
  const ordered: ExpertSectionId[] = [];
  for (const raw of input) {
    const id = asString(raw);
    if ((EXPERT_SECTION_IDS as readonly string[]).includes(id) && !seen.has(id)) {
      seen.add(id);
      ordered.push(id as ExpertSectionId);
    }
  }
  for (const id of EXPERT_SECTION_IDS) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

function normalizeVisibility(input: unknown): Record<ExpertSectionId, boolean> {
  const defaults = createDefaultExpertTemplateContent().sectionVisibility;
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ...defaults };
  const source = input as Record<string, unknown>;
  const result = { ...defaults };
  for (const id of EXPERT_SECTION_IDS) {
    if (typeof source[id] === "boolean") result[id] = source[id];
  }
  return result;
}

export function normalizeExpertTemplateContent(input: unknown): ExpertTemplateContent {
  const defaults = createDefaultExpertTemplateContent();
  if (!input || typeof input !== "object" || Array.isArray(input)) return defaults;
  const source = input as Record<string, unknown>;
  const hero = obj(source.hero);
  const about = obj(source.about);
  const services = obj(source.services ?? source.servicesCatalog ?? source.services_catalog);
  const expertise = obj(source.expertise);
  const process = obj(source.process ?? source.howItWorks ?? source.how_it_works);
  const results = obj(source.results);
  const articles = obj(source.articles);
  const works = obj(source.works);
  const testimonials = obj(source.testimonials ?? source.reviews);
  const faq = obj(source.faq);
  const contact = obj(source.contactCta ?? source.contact_cta);
  const footer = obj(source.footer);

  const selectedIdsRaw = services.selectedServiceIds ?? services.selected_service_ids;
  const selectedServiceIds = Array.isArray(selectedIdsRaw)
    ? selectedIdsRaw.map((id) => asString(id).trim()).filter(Boolean)
    : [];

  const sourceModeRaw = asString(testimonials.source, "both");
  const sourceMode =
    sourceModeRaw === "approved" || sourceModeRaw === "manual" || sourceModeRaw === "both"
      ? sourceModeRaw
      : "both";

  const contactBg = asString(contact.backgroundStyle ?? contact.background_style, "primary");
  const contactBackgroundStyle =
    contactBg === "dark" || contactBg === "soft" || contactBg === "primary" ? contactBg : "primary";

  const badgesRaw = hero.trustBadges ?? hero.trust_badges;
  const trustBadges = Array.isArray(badgesRaw)
    ? badgesRaw
        .map((b) => (typeof b === "string" ? b : asString(obj(b).label)))
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, MAX.badges)
    : defaults.hero.trustBadges;

  return {
    themePreset: asPreset(source.themePreset ?? source.theme_preset),
    typography: normalizeExpertTypography(source.typography),
    hero: {
      eyebrow: asString(hero.eyebrow, defaults.hero.eyebrow),
      professionalTitle: asString(
        hero.professionalTitle ?? hero.professional_title,
        defaults.hero.professionalTitle,
      ),
      headline: asString(hero.headline, defaults.hero.headline),
      headlineHighlight: asString(
        hero.headlineHighlight ?? hero.headline_highlight,
        defaults.hero.headlineHighlight,
      ),
      subtitle: asString(hero.subtitle, defaults.hero.subtitle),
      trustBadges: trustBadges.length ? trustBadges : defaults.hero.trustBadges,
      primaryCtaLabel: asString(
        hero.primaryCtaLabel ?? hero.primary_cta_label,
        defaults.hero.primaryCtaLabel,
      ),
      primaryCtaAction: asCta(
        hero.primaryCtaAction ?? hero.primary_cta_action,
        defaults.hero.primaryCtaAction,
      ),
      secondaryCtaLabel: asString(
        hero.secondaryCtaLabel ?? hero.secondary_cta_label,
        defaults.hero.secondaryCtaLabel,
      ),
      secondaryCtaAction: asCta(
        hero.secondaryCtaAction ?? hero.secondary_cta_action,
        defaults.hero.secondaryCtaAction,
      ),
      showCallButton: asBoolean(
        hero.showCallButton ?? hero.show_call_button,
        defaults.hero.showCallButton,
      ),
      showWhatsappButton: asBoolean(
        hero.showWhatsappButton ?? hero.show_whatsapp_button,
        defaults.hero.showWhatsappButton,
      ),
      stats: normalizeStats(hero.stats),
    },
    about: {
      title: asString(about.title, defaults.about.title),
      subtitle: asString(about.subtitle, defaults.about.subtitle),
      bio: asString(about.bio ?? about.description, defaults.about.bio),
      credentials: normalizeCredentials(about.credentials),
      ctaLabel: asString(about.ctaLabel ?? about.cta_label, defaults.about.ctaLabel),
      ctaAction: asCta(about.ctaAction ?? about.cta_action, defaults.about.ctaAction),
      showCta: asBoolean(about.showCta ?? about.show_cta, defaults.about.showCta),
    },
    services: {
      title: asString(services.title, defaults.services.title),
      subtitle: asString(services.subtitle, defaults.services.subtitle),
      selectedServiceIds,
      showImage: asBoolean(services.showImage ?? services.show_image, defaults.services.showImage),
      showPrice: asBoolean(services.showPrice ?? services.show_price, defaults.services.showPrice),
      showDuration: asBoolean(
        services.showDuration ?? services.show_duration,
        defaults.services.showDuration,
      ),
      showDescription: asBoolean(
        services.showDescription ?? services.show_description,
        defaults.services.showDescription,
      ),
      buttonLabel: asString(
        services.buttonLabel ?? services.button_label,
        defaults.services.buttonLabel,
      ),
    },
    expertise: {
      title: asString(expertise.title, defaults.expertise.title),
      subtitle: asString(expertise.subtitle, defaults.expertise.subtitle),
      items: normalizeExpertise(expertise.items),
    },
    process: {
      title: asString(process.title, defaults.process.title),
      subtitle: asString(process.subtitle, defaults.process.subtitle),
      steps: normalizeProcess(process.steps),
      showNumbering: asBoolean(
        process.showNumbering ?? process.show_numbering,
        defaults.process.showNumbering,
      ),
    },
    results: {
      title: asString(results.title, defaults.results.title),
      subtitle: asString(results.subtitle, defaults.results.subtitle),
      items: normalizeResults(results.items),
    },
    articles: {
      title: asString(articles.title, defaults.articles.title),
      subtitle: asString(articles.subtitle, defaults.articles.subtitle),
      items: normalizeArticles(articles.items),
    },
    works: {
      title: asString(works.title, defaults.works.title),
      subtitle: asString(works.subtitle, defaults.works.subtitle),
      items: normalizeWorks(works.items),
    },
    testimonials: {
      title: asString(testimonials.title, defaults.testimonials.title),
      subtitle: asString(testimonials.subtitle, defaults.testimonials.subtitle),
      source: sourceMode,
      maxCount: Math.max(1, Math.min(12, asNumber(testimonials.maxCount ?? testimonials.max_count, 6))),
      showRating: asBoolean(
        testimonials.showRating ?? testimonials.show_rating,
        defaults.testimonials.showRating,
      ),
      items: normalizeTestimonials(testimonials.items ?? testimonials.customTestimonials),
    },
    faq: {
      title: asString(faq.title, defaults.faq.title),
      subtitle: asString(faq.subtitle, defaults.faq.subtitle),
      items: normalizeFaq(faq.items),
    },
    contactCta: {
      headline: asString(contact.headline, defaults.contactCta.headline),
      subtitle: asString(contact.subtitle, defaults.contactCta.subtitle),
      primaryCtaLabel: asString(
        contact.primaryCtaLabel ?? contact.primary_cta_label,
        defaults.contactCta.primaryCtaLabel,
      ),
      primaryCtaAction: asCta(
        contact.primaryCtaAction ?? contact.primary_cta_action,
        defaults.contactCta.primaryCtaAction,
      ),
      secondaryCtaLabel: asString(
        contact.secondaryCtaLabel ?? contact.secondary_cta_label,
        defaults.contactCta.secondaryCtaLabel,
      ),
      secondaryCtaAction: asCta(
        contact.secondaryCtaAction ?? contact.secondary_cta_action,
        defaults.contactCta.secondaryCtaAction,
      ),
      showPhone: asBoolean(contact.showPhone ?? contact.show_phone, defaults.contactCta.showPhone),
      showEmail: asBoolean(contact.showEmail ?? contact.show_email, defaults.contactCta.showEmail),
      showLocation: asBoolean(
        contact.showLocation ?? contact.show_location,
        defaults.contactCta.showLocation,
      ),
      backgroundStyle: contactBackgroundStyle,
    },
    footer: {
      description: asString(footer.description, defaults.footer.description),
      showQuickLinks: asBoolean(
        footer.showQuickLinks ?? footer.show_quick_links,
        defaults.footer.showQuickLinks,
      ),
      showServicesLinks: asBoolean(
        footer.showServicesLinks ?? footer.show_services_links,
        defaults.footer.showServicesLinks,
      ),
      showSocialLinks: asBoolean(
        footer.showSocialLinks ?? footer.show_social_links,
        defaults.footer.showSocialLinks,
      ),
      showContactInfo: asBoolean(
        footer.showContactInfo ?? footer.show_contact_info,
        defaults.footer.showContactInfo,
      ),
      copyrightText: asString(footer.copyrightText ?? footer.copyright_text, ""),
    },
    sectionOrder: normalizeOrder(source.sectionOrder ?? source.section_order),
    sectionVisibility: normalizeVisibility(
      source.sectionVisibility ?? source.section_visibility,
    ),
  };
}

export function getExpertTemplateContent(config: MiniSiteConfig): ExpertTemplateContent {
  return normalizeExpertTemplateContent(config.templateContent.expert);
}

export function setExpertTemplateContent(
  config: MiniSiteConfig,
  content: ExpertTemplateContent,
): MiniSiteConfig {
  return {
    ...config,
    templateContent: {
      ...config.templateContent,
      expert: normalizeExpertTemplateContent(content) as unknown as Record<string, unknown>,
    },
  };
}

export function applyExpertThemePreset(
  config: MiniSiteConfig,
  presetId: ExpertThemePresetId,
): MiniSiteConfig {
  const preset = EXPERT_THEME_PRESETS[presetId] ?? EXPERT_THEME_PRESETS.calm_green;
  const withContent = setExpertTemplateContent(config, {
    ...getExpertTemplateContent(config),
    themePreset: preset.id,
  });
  return {
    ...withContent,
    theme: {
      ...withContent.theme,
      template: "expert",
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      backgroundStyle: preset.backgroundStyle,
      buttonStyle: preset.buttonStyle,
    },
  };
}

export function getEnabledExpertSections(content: ExpertTemplateContent): ExpertSectionId[] {
  return content.sectionOrder.filter((id) => content.sectionVisibility[id] !== false);
}

export function orderExpertServices(
  services: PublicService[],
  selectedServiceIds: string[],
): PublicService[] {
  return orderPublicServicesBySelection(services, selectedServiceIds);
}
