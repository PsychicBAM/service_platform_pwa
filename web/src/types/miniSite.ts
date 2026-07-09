export const MINI_SITE_TEMPLATES = [
  "clean",
  "service",
  "expert",
  "clinic",
  "portfolio",
  "teacher",
] as const;

export type MiniSiteTemplate = (typeof MINI_SITE_TEMPLATES)[number];

export const MINI_SITE_BACKGROUND_STYLES = ["light", "soft", "dark"] as const;

export type MiniSiteBackgroundStyle = (typeof MINI_SITE_BACKGROUND_STYLES)[number];

export const MINI_SITE_BUTTON_STYLES = ["rounded", "pill", "square"] as const;

export type MiniSiteButtonStyle = (typeof MINI_SITE_BUTTON_STYLES)[number];

export interface MiniSiteTheme {
  template: MiniSiteTemplate;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: MiniSiteBackgroundStyle;
  buttonStyle: MiniSiteButtonStyle;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

export const MINI_SITE_SECTION_TYPES = [
  "hero",
  "about",
  "services",
  "benefits",
  "trust",
  "gallery",
  "pricing",
  "faq",
  "contact",
  "booking_cta",
] as const;

export type MiniSiteSectionType = (typeof MINI_SITE_SECTION_TYPES)[number];

export interface MiniSiteSectionItem {
  label?: string;
  title?: string;
  body?: string;
  value?: string;
}

export interface MiniSiteSection {
  id: string;
  type: MiniSiteSectionType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  body?: string;
  items?: MiniSiteSectionItem[];
  order: number;
}

export interface MiniSiteSocialLinks {
  website?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  tiktok?: string;
  telegram?: string;
}

export interface MiniSiteTrustCard {
  title: string;
  subtitle: string;
}

export interface MiniSiteFaqItem {
  question: string;
  answer: string;
}

export interface MiniSiteCopy {
  heroBadgeText: string;
  trustCards: [MiniSiteTrustCard, MiniSiteTrustCard, MiniSiteTrustCard];
  benefitsSectionTitle: string;
  benefitsItems: [string, string, string];
  servicesSectionTitle: string;
  servicesSectionBadgeText: string;
  contactSectionTitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  faqSectionTitle: string;
  faqItems: [MiniSiteFaqItem, MiniSiteFaqItem, MiniSiteFaqItem];
}

export const MINI_SITE_CONFIG_VERSION = 1 as const;

export type MiniSiteConfigVersion = typeof MINI_SITE_CONFIG_VERSION;

export interface MiniSiteConfig {
  version: MiniSiteConfigVersion;
  theme: MiniSiteTheme;
  sections: MiniSiteSection[];
  socialLinks: MiniSiteSocialLinks;
  copy: MiniSiteCopy;
}
