/** Typed Expert mini-site template content (stored in templateContent.expert). */

import type { ServiceTypographySettings } from "@/types/serviceTemplate";

export const EXPERT_THEME_PRESET_IDS = [
  "classic_cream",
  "premium_dark",
  "calm_green",
  "ocean_blue",
  "royal_purple",
  "warm_clay",
  "clean_white",
] as const;

export type ExpertThemePresetId = (typeof EXPERT_THEME_PRESET_IDS)[number];

export const EXPERT_SECTION_IDS = [
  "hero",
  "about",
  "services",
  "expertise",
  "process",
  "results",
  "articles",
  "works",
  "testimonials",
  "faq",
  "contact",
  "footer",
] as const;

export type ExpertSectionId = (typeof EXPERT_SECTION_IDS)[number];

export type ExpertCtaAction = "booking" | "request" | "services" | "call" | "whatsapp" | "external";

export type ExpertTypographySettings = ServiceTypographySettings;

export type ExpertArticleType = "article" | "publication" | "media" | "research" | "guide";

export type ExpertHeroStat = {
  id: string;
  value: string;
  label: string;
};

export type ExpertCredential = {
  id: string;
  text: string;
};

export type ExpertExpertiseItem = {
  id: string;
  label: string;
  description: string;
  visible: boolean;
};

export type ExpertProcessStep = {
  id: string;
  title: string;
  description: string;
};

export type ExpertResultItem = {
  id: string;
  value: string;
  label: string;
};

export type ExpertArticleItem = {
  id: string;
  title: string;
  type: ExpertArticleType;
  category: string;
  date: string;
  excerpt: string;
  body: string;
  externalUrl: string;
  readingTime: string;
  featured: boolean;
  coverImageUrl: string;
  visible: boolean;
};

export type ExpertWorkItem = {
  id: string;
  title: string;
  clientName: string;
  category: string;
  year: string;
  shortDescription: string;
  challenge: string;
  result: string;
  linkUrl: string;
  coverImageUrl: string;
  metrics: string[];
  visible: boolean;
};

export type ExpertTestimonialItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  date: string;
  avatarInitials: string;
  /** Optional uploaded avatar; when empty, public view uses initials. */
  avatarUrl: string;
  visible: boolean;
};

export type ExpertFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type ExpertHeroSettings = {
  eyebrow: string;
  professionalTitle: string;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  trustBadges: string[];
  primaryCtaLabel: string;
  primaryCtaAction: ExpertCtaAction;
  secondaryCtaLabel: string;
  secondaryCtaAction: ExpertCtaAction;
  showCallButton: boolean;
  showWhatsappButton: boolean;
  stats: ExpertHeroStat[];
};

export type ExpertAboutSettings = {
  title: string;
  subtitle: string;
  bio: string;
  credentials: ExpertCredential[];
  ctaLabel: string;
  ctaAction: ExpertCtaAction;
  showCta: boolean;
};

export type ExpertServicesSettings = {
  title: string;
  subtitle: string;
  selectedServiceIds: string[];
  showImage: boolean;
  showPrice: boolean;
  showDuration: boolean;
  showDescription: boolean;
  buttonLabel: string;
};

export type ExpertExpertiseSettings = {
  title: string;
  subtitle: string;
  items: ExpertExpertiseItem[];
};

export type ExpertProcessSettings = {
  title: string;
  subtitle: string;
  steps: ExpertProcessStep[];
  showNumbering: boolean;
};

export type ExpertResultsSettings = {
  title: string;
  subtitle: string;
  items: ExpertResultItem[];
};

export type ExpertArticlesSettings = {
  title: string;
  subtitle: string;
  items: ExpertArticleItem[];
};

export type ExpertWorksSettings = {
  title: string;
  subtitle: string;
  items: ExpertWorkItem[];
};

export type ExpertTestimonialsSettings = {
  title: string;
  subtitle: string;
  source: "approved" | "manual" | "both";
  maxCount: number;
  showRating: boolean;
  items: ExpertTestimonialItem[];
};

export type ExpertFaqSettings = {
  title: string;
  subtitle: string;
  items: ExpertFaqItem[];
};

export type ExpertContactCtaSettings = {
  headline: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaAction: ExpertCtaAction;
  secondaryCtaLabel: string;
  secondaryCtaAction: ExpertCtaAction;
  showPhone: boolean;
  showEmail: boolean;
  showLocation: boolean;
  backgroundStyle: "dark" | "primary" | "soft";
};

export type ExpertFooterSettings = {
  description: string;
  showQuickLinks: boolean;
  showServicesLinks: boolean;
  showSocialLinks: boolean;
  showContactInfo: boolean;
  copyrightText: string;
};

export type ExpertTemplateContent = {
  themePreset: ExpertThemePresetId;
  typography: ExpertTypographySettings;
  hero: ExpertHeroSettings;
  about: ExpertAboutSettings;
  services: ExpertServicesSettings;
  expertise: ExpertExpertiseSettings;
  process: ExpertProcessSettings;
  results: ExpertResultsSettings;
  articles: ExpertArticlesSettings;
  works: ExpertWorksSettings;
  testimonials: ExpertTestimonialsSettings;
  faq: ExpertFaqSettings;
  contactCta: ExpertContactCtaSettings;
  footer: ExpertFooterSettings;
  sectionOrder: ExpertSectionId[];
  sectionVisibility: Record<ExpertSectionId, boolean>;
};
