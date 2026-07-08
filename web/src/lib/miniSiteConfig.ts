import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  MINI_SITE_CONFIG_VERSION,
  MINI_SITE_SECTION_TYPES,
  MINI_SITE_TEMPLATES,
  type MiniSiteBackgroundStyle,
  type MiniSiteButtonStyle,
  type MiniSiteConfig,
  type MiniSiteCopy,
  type MiniSiteSection,
  type MiniSiteSectionItem,
  type MiniSiteSectionType,
  type MiniSiteSocialLinks,
  type MiniSiteTemplate,
  type MiniSiteTheme,
  type MiniSiteTrustCard,
} from "@/types/miniSite";
import { normalizeHexColorInput } from "./miniSiteTemplatePresentation";

function sanitizePlainText(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}

export const REQUIRED_MINI_SITE_SECTION_TYPES: MiniSiteSectionType[] = [
  "hero",
  "about",
  "services",
  "contact",
  "booking_cta",
];

const DEFAULT_SECTION_ORDERS: Record<MiniSiteSectionType, number> = {
  hero: 0,
  about: 1,
  services: 2,
  benefits: 3,
  trust: 2,
  gallery: 4,
  pricing: 5,
  faq: 6,
  contact: 7,
  booking_cta: 8,
};

export const DEFAULT_MINI_SITE_BACKGROUND_COLOR = "#f8fafc";

export function getDefaultCopyForTemplate(template: MiniSiteTemplate): MiniSiteCopy {
  switch (template) {
    case "service":
      return {
        heroBadgeText: "Service business",
        trustCards: [
          { title: "Same-week", subtitle: "Service availability" },
          { title: "Free quote", subtitle: "No obligation" },
          { title: "Local", subtitle: "Trusted nearby" },
        ],
        benefitsSectionTitle: "Why choose us",
        benefitsItems: ["Fast response", "Transparent pricing", "Reliable local service"],
        servicesSectionTitle: "Our services",
        servicesSectionBadgeText: "{count} available",
        contactSectionTitle: "Contact & details",
        primaryCtaLabel: "Book now",
        secondaryCtaLabel: "Submit a request",
      };
    case "expert":
      return {
        heroBadgeText: "Expert profile",
        trustCards: [
          { title: "1:1", subtitle: "Personal guidance" },
          { title: "Proven", subtitle: "Approach" },
          { title: "Clear", subtitle: "Next steps" },
        ],
        benefitsSectionTitle: "Why work with me",
        benefitsItems: ["Focused expertise", "Clear recommendations", "Practical next steps"],
        servicesSectionTitle: "Services & sessions",
        servicesSectionBadgeText: "{count} available",
        contactSectionTitle: "Get in touch",
        primaryCtaLabel: "Book a session",
        secondaryCtaLabel: "Send a request",
      };
    case "clinic":
      return {
        heroBadgeText: "Care & wellness",
        trustCards: [
          { title: "Flexible", subtitle: "Appointments" },
          { title: "Patient-first", subtitle: "Experience" },
          { title: "Clear", subtitle: "Contact info" },
        ],
        benefitsSectionTitle: "Why patients choose us",
        benefitsItems: [
          "Flexible scheduling",
          "Clear contact details",
          "Calm, professional experience",
        ],
        servicesSectionTitle: "Services & care",
        servicesSectionBadgeText: "{count} available",
        contactSectionTitle: "Contact & location",
        primaryCtaLabel: "Request appointment",
        secondaryCtaLabel: "Ask a question",
      };
    case "portfolio":
      return {
        heroBadgeText: "Creative portfolio",
        trustCards: [
          { title: "Premium", subtitle: "Quality work" },
          { title: "Curated", subtitle: "Showcase" },
          { title: "Bold", subtitle: "Visual style" },
        ],
        benefitsSectionTitle: "What to expect",
        benefitsItems: ["Distinctive work", "Clear process", "Premium presentation"],
        servicesSectionTitle: "Services",
        servicesSectionBadgeText: "{count} available",
        contactSectionTitle: "Contact",
        primaryCtaLabel: "Start a project",
        secondaryCtaLabel: "Send inquiry",
      };
    case "clean":
    default:
      return {
        heroBadgeText: "Welcome",
        trustCards: [
          { title: "Professional", subtitle: "Service quality" },
          { title: "Easy", subtitle: "Online booking" },
          { title: "Local", subtitle: "Trusted business" },
        ],
        benefitsSectionTitle: "Why choose us",
        benefitsItems: ["Quality service", "Easy booking", "Trusted locally"],
        servicesSectionTitle: "Our services",
        servicesSectionBadgeText: "{count} available",
        contactSectionTitle: "Contact & details",
        primaryCtaLabel: "Book now",
        secondaryCtaLabel: "Submit a request",
      };
  }
}

export function formatServicesSectionBadge(text: string, count: number): string | null {
  if (!text.trim()) {
    return count > 0 ? `${count} available` : null;
  }
  if (text.includes("{count}")) {
    return text.replace("{count}", String(count));
  }
  return text;
}

const DEFAULT_THEME: MiniSiteTheme = {
  template: "clean",
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
  backgroundColor: DEFAULT_MINI_SITE_BACKGROUND_COLOR,
  backgroundStyle: "light",
  buttonStyle: "rounded",
  logoUrl: null,
  coverImageUrl: null,
};

function createDefaultSection(type: MiniSiteSectionType, order: number): MiniSiteSection {
  const base: MiniSiteSection = {
    id: type,
    type,
    enabled: REQUIRED_MINI_SITE_SECTION_TYPES.includes(type),
    order,
  };

  switch (type) {
    case "hero":
      return {
        ...base,
        title: "Welcome",
        subtitle: "Quality service you can trust",
      };
    case "about":
      return {
        ...base,
        title: "About us",
        body: "Tell visitors what makes your business special.",
      };
    case "services":
      return {
        ...base,
        title: "Our services",
        subtitle: "Explore what we offer",
      };
    case "gallery":
      return {
        ...base,
        enabled: false,
        title: "Gallery",
        subtitle: "Coming soon",
      };
    case "contact":
      return {
        ...base,
        title: "Contact",
        subtitle: "Get in touch",
      };
    case "booking_cta":
      return {
        ...base,
        title: "Book now",
        subtitle: "Schedule your next visit",
      };
    case "benefits":
      return {
        ...base,
        enabled: false,
        title: "Why choose us",
      };
    case "trust":
      return {
        ...base,
        enabled: true,
        title: "Trust",
      };
    case "pricing":
      return {
        ...base,
        enabled: false,
        title: "Pricing",
      };
    case "faq":
      return {
        ...base,
        enabled: false,
        title: "FAQ",
      };
    default:
      return base;
  }
}

function buildDefaultSections(): MiniSiteSection[] {
  const required = REQUIRED_MINI_SITE_SECTION_TYPES.map((type) =>
    createDefaultSection(type, DEFAULT_SECTION_ORDERS[type]),
  );
  const trust = createDefaultSection("trust", DEFAULT_SECTION_ORDERS.trust);
  const gallery = createDefaultSection("gallery", DEFAULT_SECTION_ORDERS.gallery);
  return [...required, trust, gallery].sort((left, right) => left.order - right.order);
}

export const DEFAULT_MINI_SITE_CONFIG: MiniSiteConfig = {
  version: MINI_SITE_CONFIG_VERSION,
  theme: { ...DEFAULT_THEME },
  sections: buildDefaultSections(),
  socialLinks: {},
  copy: getDefaultCopyForTemplate(DEFAULT_THEME.template),
};

export function isMiniSiteTemplate(value: unknown): value is MiniSiteTemplate {
  return typeof value === "string" && (MINI_SITE_TEMPLATES as readonly string[]).includes(value);
}

export function isMiniSiteSectionType(value: unknown): value is MiniSiteSectionType {
  return typeof value === "string" && (MINI_SITE_SECTION_TYPES as readonly string[]).includes(value);
}

function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const stripped = sanitizePlainText(value);
  return stripped.length > 0 ? stripped : undefined;
}

function sanitizeOptionalUrl(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  return sanitizeText(value);
}

function isMiniSiteBackgroundStyle(value: unknown): value is MiniSiteBackgroundStyle {
  return typeof value === "string" && (MINI_SITE_BACKGROUND_STYLES as readonly string[]).includes(value);
}

function isMiniSiteButtonStyle(value: unknown): value is MiniSiteButtonStyle {
  return typeof value === "string" && (MINI_SITE_BUTTON_STYLES as readonly string[]).includes(value);
}

function normalizeTrustCard(value: unknown, fallback: MiniSiteTrustCard): MiniSiteTrustCard {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  return {
    title: sanitizeText(record.title) ?? fallback.title,
    subtitle: sanitizeText(record.subtitle) ?? fallback.subtitle,
  };
}

function normalizeBenefitsItems(value: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return [0, 1, 2].map((index) => sanitizeText(value[index]) ?? fallback[index]) as [
    string,
    string,
    string,
  ];
}

function normalizeCopy(input: unknown, template: MiniSiteTemplate): MiniSiteCopy {
  const defaults = getDefaultCopyForTemplate(template);
  if (!input || typeof input !== "object") {
    return defaults;
  }

  const source = input as Record<string, unknown>;
  const trustSource = (source.trustCards ?? source.trust_cards) as unknown;
  const trustDefaults = defaults.trustCards;
  const trustCards = [0, 1, 2].map((index) => {
    const entry = Array.isArray(trustSource) ? trustSource[index] : undefined;
    return normalizeTrustCard(entry, trustDefaults[index]);
  }) as [MiniSiteTrustCard, MiniSiteTrustCard, MiniSiteTrustCard];

  const benefitsSource = source.benefitsItems ?? source.benefits_items;

  return {
    heroBadgeText:
      sanitizeText(source.heroBadgeText ?? source.hero_badge_text) ?? defaults.heroBadgeText,
    trustCards,
    benefitsSectionTitle:
      sanitizeText(source.benefitsSectionTitle ?? source.benefits_section_title) ??
      defaults.benefitsSectionTitle,
    benefitsItems: normalizeBenefitsItems(benefitsSource, defaults.benefitsItems),
    servicesSectionTitle:
      sanitizeText(source.servicesSectionTitle ?? source.services_section_title) ??
      defaults.servicesSectionTitle,
    servicesSectionBadgeText:
      sanitizeText(source.servicesSectionBadgeText ?? source.services_section_badge_text) ??
      defaults.servicesSectionBadgeText,
    contactSectionTitle:
      sanitizeText(source.contactSectionTitle ?? source.contact_section_title) ??
      defaults.contactSectionTitle,
    primaryCtaLabel:
      sanitizeText(source.primaryCtaLabel ?? source.primary_cta_label) ?? defaults.primaryCtaLabel,
    secondaryCtaLabel:
      sanitizeText(source.secondaryCtaLabel ?? source.secondary_cta_label) ??
      defaults.secondaryCtaLabel,
  };
}

function normalizeTheme(input: unknown): MiniSiteTheme {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    template: isMiniSiteTemplate(source.template) ? source.template : DEFAULT_THEME.template,
    primaryColor: sanitizeText(source.primaryColor ?? source.primary_color) ?? DEFAULT_THEME.primaryColor,
    accentColor: sanitizeText(source.accentColor ?? source.accent_color) ?? DEFAULT_THEME.accentColor,
    backgroundColor: (() => {
      const raw = sanitizeText(source.backgroundColor ?? source.background_color);
      if (!raw) {
        return DEFAULT_THEME.backgroundColor;
      }
      return normalizeHexColorInput(raw, DEFAULT_THEME.backgroundColor);
    })(),
    backgroundStyle: isMiniSiteBackgroundStyle(source.backgroundStyle ?? source.background_style)
      ? ((source.backgroundStyle ?? source.background_style) as MiniSiteBackgroundStyle)
      : DEFAULT_THEME.backgroundStyle,
    buttonStyle: isMiniSiteButtonStyle(source.buttonStyle ?? source.button_style)
      ? ((source.buttonStyle ?? source.button_style) as MiniSiteButtonStyle)
      : DEFAULT_THEME.buttonStyle,
    logoUrl:
      source.logoUrl === null
        ? null
        : sanitizeOptionalUrl(source.logoUrl) ?? DEFAULT_THEME.logoUrl ?? null,
    coverImageUrl:
      source.coverImageUrl === null
        ? null
        : sanitizeOptionalUrl(source.coverImageUrl) ?? DEFAULT_THEME.coverImageUrl ?? null,
  };
}

function normalizeSectionItem(value: unknown): MiniSiteSectionItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const item: MiniSiteSectionItem = {};
  const label = sanitizeText(record.label);
  const title = sanitizeText(record.title);
  const body = sanitizeText(record.body);
  const itemValue = sanitizeText(record.value);

  if (label) item.label = label;
  if (title) item.title = title;
  if (body) item.body = body;
  if (itemValue) item.value = itemValue;

  return Object.keys(item).length > 0 ? item : null;
}

function normalizeSectionItems(value: unknown): MiniSiteSectionItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry) => normalizeSectionItem(entry))
    .filter((entry): entry is MiniSiteSectionItem => entry !== null);

  return items.length > 0 ? items : undefined;
}

function normalizeSection(value: unknown, fallbackOrder: number): MiniSiteSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!isMiniSiteSectionType(record.type)) {
    return null;
  }

  const type = record.type;
  const id = sanitizeText(record.id) ?? type;
  const order =
    typeof record.order === "number" && Number.isFinite(record.order) ? record.order : fallbackOrder;
  const enabled = typeof record.enabled === "boolean" ? record.enabled : createDefaultSection(type, order).enabled;

  return {
    id,
    type,
    enabled,
    order,
    title: sanitizeText(record.title),
    subtitle: sanitizeText(record.subtitle),
    body: sanitizeText(record.body),
    items: normalizeSectionItems(record.items),
  };
}

function normalizeSocialLinks(input: unknown): MiniSiteSocialLinks {
  if (!input || typeof input !== "object") {
    return {};
  }

  const source = input as Record<string, unknown>;
  const links: MiniSiteSocialLinks = {};

  for (const key of ["website", "instagram", "facebook", "whatsapp", "tiktok", "telegram"] as const) {
    const value = sanitizeOptionalUrl(source[key]);
    if (value) {
      links[key] = value;
    }
  }

  return links;
}

function ensureRequiredSections(sections: MiniSiteSection[]): MiniSiteSection[] {
  const byType = new Map<MiniSiteSectionType, MiniSiteSection>();

  for (const section of sections) {
    if (!byType.has(section.type)) {
      byType.set(section.type, section);
    }
  }

  for (const type of REQUIRED_MINI_SITE_SECTION_TYPES) {
    if (!byType.has(type)) {
      byType.set(type, createDefaultSection(type, DEFAULT_SECTION_ORDERS[type]));
    }
  }

  // Backward-compatible: older configs may not have the `trust` section yet.
  if (!byType.has("trust")) {
    byType.set("trust", createDefaultSection("trust", DEFAULT_SECTION_ORDERS.trust));
  }

  return Array.from(byType.values()).sort((left, right) => left.order - right.order);
}

function normalizeSections(input: unknown): MiniSiteSection[] {
  if (!Array.isArray(input)) {
    return buildDefaultSections();
  }

  const sections = input
    .map((entry, index) => normalizeSection(entry, index))
    .filter((entry): entry is MiniSiteSection => entry !== null);

  if (sections.length === 0) {
    return buildDefaultSections();
  }

  return ensureRequiredSections(sections);
}

export function normalizeMiniSiteConfig(input: unknown): MiniSiteConfig {
  if (input === null || input === undefined) {
    return {
      version: MINI_SITE_CONFIG_VERSION,
      theme: { ...DEFAULT_THEME },
      sections: buildDefaultSections(),
      socialLinks: {},
      copy: getDefaultCopyForTemplate(DEFAULT_THEME.template),
    };
  }

  if (typeof input !== "object") {
    return normalizeMiniSiteConfig(null);
  }

  const source = input as Record<string, unknown>;
  const version = source.version === MINI_SITE_CONFIG_VERSION ? MINI_SITE_CONFIG_VERSION : MINI_SITE_CONFIG_VERSION;
  const theme = normalizeTheme(source.theme);

  return {
    version,
    theme,
    sections: normalizeSections(source.sections),
    socialLinks: normalizeSocialLinks(source.socialLinks ?? source.social_links),
    copy: normalizeCopy(source.copy, theme.template),
  };
}

export function getEnabledMiniSiteSections(config: MiniSiteConfig): MiniSiteSection[] {
  return config.sections
    .filter((section) => section.enabled && section.type !== "trust")
    .slice()
    .sort((left, right) => left.order - right.order);
}
