/** Typed Service mini-site template content (stored in templateContent.service). */

export const SERVICE_THEME_PRESET_IDS = [
  "modern_green",
  "premium_dark",
  "ocean_blue",
  "royal_purple",
  "warm_orange",
  "clean_white",
] as const;

export type ServiceThemePresetId = (typeof SERVICE_THEME_PRESET_IDS)[number];

export const SERVICE_SECTION_IDS = [
  "hero",
  "services",
  "how-it-works",
  "why-choose-us",
  "pricing",
  "reviews",
  "faq",
  "contact",
  "footer",
] as const;

export type ServiceSectionId = (typeof SERVICE_SECTION_IDS)[number];

export type ServiceCtaAction = "booking" | "request" | "services" | "call" | "whatsapp" | "external";

export type ServiceHeroTrustBadge = {
  id: string;
  label: string;
};

export type ServiceHeroStat = {
  id: string;
  value: string;
  label: string;
};

export type ServiceHowItWorksStep = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type ServiceBenefitItem = {
  id: string;
  text: string;
};

export type ServicePricingPackage = {
  id: string;
  name: string;
  price: string;
  billingLabel: string;
  description: string;
  includes: string[];
  popular: boolean;
  ctaLabel: string;
  ctaAction: ServiceCtaAction;
};

export type ServiceCustomTestimonial = {
  id: string;
  name: string;
  quote: string;
  rating: number;
};

export type ServiceFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type ServiceServicesCatalogSettings = {
  title: string;
  subtitle: string;
  /** Empty = show all active services (fallback). */
  selectedServiceIds: string[];
  showImage: boolean;
  showPrice: boolean;
  showDuration: boolean;
  showDescription: boolean;
  showCategory: boolean;
  cardStyle: "image_top" | "compact" | "premium";
  desktopColumns: 2 | 3 | 4;
  mobileStyle: "card_list" | "compact_list";
  buttonLabel: string;
};

export type ServiceHeroSettings = {
  eyebrow: string;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  trustBadges: ServiceHeroTrustBadge[];
  primaryCtaLabel: string;
  primaryCtaAction: ServiceCtaAction;
  secondaryCtaLabel: string;
  secondaryCtaAction: ServiceCtaAction;
  showCallButton: boolean;
  showWhatsappButton: boolean;
  ratingLine: string;
  stats: ServiceHeroStat[];
  layoutStyle: "split" | "overlay" | "centered";
};

export type ServiceHowItWorksSettings = {
  title: string;
  subtitle: string;
  steps: ServiceHowItWorksStep[];
  showNumbering: boolean;
  backgroundStyle: "light" | "soft" | "dark";
};

export type ServiceWhyChooseUsSettings = {
  title: string;
  subtitle: string;
  description: string;
  benefits: ServiceBenefitItem[];
  layout: "image_right" | "image_left" | "cards_grid";
  ctaLabel: string;
  ctaAction: ServiceCtaAction;
  showCta: boolean;
};

export type ServicePricingSettings = {
  title: string;
  subtitle: string;
  packages: ServicePricingPackage[];
  showComparison: boolean;
};

export type ServiceReviewsSettings = {
  title: string;
  subtitle: string;
  source: "approved" | "custom" | "both";
  maxCount: number;
  showRating: boolean;
  showAvatar: boolean;
  customTestimonials: ServiceCustomTestimonial[];
};

export type ServiceFaqSettings = {
  title: string;
  subtitle: string;
  items: ServiceFaqItem[];
  defaultOpenId: string | null;
};

export type ServiceContactCtaSettings = {
  headline: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaAction: ServiceCtaAction;
  secondaryCtaLabel: string;
  secondaryCtaAction: ServiceCtaAction;
  showPhone: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showHours: boolean;
  backgroundStyle: "dark" | "primary" | "soft";
};

export type ServiceFooterSettings = {
  description: string;
  showQuickLinks: boolean;
  showServicesLinks: boolean;
  showSocialLinks: boolean;
  showContactInfo: boolean;
  copyrightText: string;
};

export type ServiceFontPresetId =
  | "system_sans"
  | "inter"
  | "manrope"
  | "poppins"
  | "montserrat"
  | "roboto"
  | "lato"
  | "merriweather"
  | "playfair_display"
  | "custom";

/** Manual typography / text-color overrides under templateContent.service. */
export type ServiceTypographySettings = {
  headingFontPreset: ServiceFontPresetId;
  bodyFontPreset: ServiceFontPresetId;
  buttonFontPreset: ServiceFontPresetId;
  /** CSS font-family fragment when any preset is custom. Sanitized on normalize. */
  customFontFamily: string;
  headingWeight: 600 | 700 | 800 | 900;
  bodyWeight: 400 | 500;
  buttonWeight: 600 | 700;
  /** Empty = use theme/background tokens. */
  headingColor: string;
  bodyColor: string;
  mutedColor: string;
  heroHeadingColor: string;
  heroBodyColor: string;
  accentTextColor: string;
  buttonTextColor: string;
  cardTextColor: string;
};

export type ServiceTemplateContent = {
  themePreset: ServiceThemePresetId;
  typography: ServiceTypographySettings;
  hero: ServiceHeroSettings;
  servicesCatalog: ServiceServicesCatalogSettings;
  howItWorks: ServiceHowItWorksSettings;
  whyChooseUs: ServiceWhyChooseUsSettings;
  pricingPackages: ServicePricingSettings;
  reviews: ServiceReviewsSettings;
  faq: ServiceFaqSettings;
  contactCta: ServiceContactCtaSettings;
  footer: ServiceFooterSettings;
  sectionOrder: ServiceSectionId[];
  sectionVisibility: Record<ServiceSectionId, boolean>;
};
