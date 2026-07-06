import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  MINI_SITE_CONFIG_VERSION,
  MINI_SITE_SECTION_TYPES,
  MINI_SITE_TEMPLATES,
  type MiniSiteBackgroundStyle,
  type MiniSiteButtonStyle,
  type MiniSiteConfig,
  type MiniSiteSection,
  type MiniSiteSectionItem,
  type MiniSiteSectionType,
  type MiniSiteSocialLinks,
  type MiniSiteTemplate,
  type MiniSiteTheme,
} from "@/types/miniSite";

const HTML_TAG_RE = /<[^>]*>/g;

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
  gallery: 4,
  pricing: 5,
  faq: 6,
  contact: 7,
  booking_cta: 8,
};

const DEFAULT_THEME: MiniSiteTheme = {
  template: "clean",
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
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
  const gallery = createDefaultSection("gallery", DEFAULT_SECTION_ORDERS.gallery);
  return [...required, gallery].sort((left, right) => left.order - right.order);
}

export const DEFAULT_MINI_SITE_CONFIG: MiniSiteConfig = {
  version: MINI_SITE_CONFIG_VERSION,
  theme: { ...DEFAULT_THEME },
  sections: buildDefaultSections(),
  socialLinks: {},
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

  const stripped = value.replace(HTML_TAG_RE, "").trim();
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

function normalizeTheme(input: unknown): MiniSiteTheme {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    template: isMiniSiteTemplate(source.template) ? source.template : DEFAULT_THEME.template,
    primaryColor: sanitizeText(source.primaryColor) ?? DEFAULT_THEME.primaryColor,
    accentColor: sanitizeText(source.accentColor) ?? DEFAULT_THEME.accentColor,
    backgroundStyle: isMiniSiteBackgroundStyle(source.backgroundStyle)
      ? source.backgroundStyle
      : DEFAULT_THEME.backgroundStyle,
    buttonStyle: isMiniSiteButtonStyle(source.buttonStyle)
      ? source.buttonStyle
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
    };
  }

  if (typeof input !== "object") {
    return normalizeMiniSiteConfig(null);
  }

  const source = input as Record<string, unknown>;
  const version = source.version === MINI_SITE_CONFIG_VERSION ? MINI_SITE_CONFIG_VERSION : MINI_SITE_CONFIG_VERSION;

  return {
    version,
    theme: normalizeTheme(source.theme),
    sections: normalizeSections(source.sections),
    socialLinks: normalizeSocialLinks(source.socialLinks),
  };
}

export function getEnabledMiniSiteSections(config: MiniSiteConfig): MiniSiteSection[] {
  return config.sections
    .filter((section) => section.enabled)
    .slice()
    .sort((left, right) => left.order - right.order);
}
