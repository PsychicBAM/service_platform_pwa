import type { ServiceTypographySettings } from "@/types/serviceTemplate";

export const PORTFOLIO_THEME_PRESET_IDS = [
  "neon_noir", "creative_purple", "minimal_white", "gallery_cream",
  "ocean_studio", "warm_editorial", "graphite",
] as const;
export type PortfolioThemePresetId = (typeof PORTFOLIO_THEME_PRESET_IDS)[number];

export const PORTFOLIO_SECTION_IDS = [
  "hero", "projects", "about", "skills", "services", "process",
  "testimonials", "contact", "footer",
] as const;
export type PortfolioSectionId = (typeof PORTFOLIO_SECTION_IDS)[number];
export type PortfolioCtaAction =
  | "projects"
  | "contact"
  | "about"
  | "booking"
  | "request"
  | "services"
  | "call"
  | "whatsapp"
  | "external";
export type PortfolioTypographySettings = ServiceTypographySettings;

export type PortfolioProjectItem = { id: string; title: string; category: string; shortDescription: string; fullDescription: string; clientName: string; year: string; role: string; tags: string[]; metrics: string[]; externalUrl: string; coverImageUrl: string; featured: boolean; visible: boolean };
export type PortfolioSkillItem = { id: string; label: string; description: string; visible: boolean };
export type PortfolioProcessStep = { id: string; title: string; description: string };
export type PortfolioTestimonialItem = { id: string; name: string; role: string; quote: string; rating: number; date: string; avatarInitials: string; avatarUrl: string; visible: boolean };
export type PortfolioHeroStat = { id: string; value: string; label: string };
export type PortfolioHighlight = { id: string; text: string };

export type PortfolioHeroSettings = { eyebrow: string; creativeTitle: string; headline: string; headlineHighlight: string; subtitle: string; trustBadges: string[]; primaryCtaLabel: string; primaryCtaAction: PortfolioCtaAction; secondaryCtaLabel: string; secondaryCtaAction: PortfolioCtaAction; showCallButton: boolean; showWhatsappButton: boolean; stats: PortfolioHeroStat[] };
export type PortfolioAboutSettings = { title: string; subtitle: string; bio: string; highlights: PortfolioHighlight[]; ctaLabel: string; ctaAction: PortfolioCtaAction; showCta: boolean };
export type PortfolioSkillsSettings = { title: string; subtitle: string; items: PortfolioSkillItem[] };
export type PortfolioServicesSettings = { title: string; subtitle: string; selectedServiceIds: string[]; showImage: boolean; showPrice: boolean; showDuration: boolean; showDescription: boolean; buttonLabel: string };
export type PortfolioProcessSettings = { title: string; subtitle: string; steps: PortfolioProcessStep[]; showNumbering: boolean };
export type PortfolioProjectsSettings = { title: string; subtitle: string; items: PortfolioProjectItem[]; showCategoryFilter: boolean };
export type PortfolioTestimonialsSettings = { title: string; subtitle: string; source: "approved" | "manual" | "both"; maxCount: number; showRating: boolean; items: PortfolioTestimonialItem[] };
export type PortfolioContactCtaSettings = { headline: string; subtitle: string; primaryCtaLabel: string; primaryCtaAction: PortfolioCtaAction; secondaryCtaLabel: string; secondaryCtaAction: PortfolioCtaAction; showPhone: boolean; showEmail: boolean; showLocation: boolean; backgroundStyle: "primary" | "soft" | "dark" };
export type PortfolioFooterSettings = { description: string; copyrightText: string; showQuickLinks: boolean; showProjectsLinks: boolean; showSocialLinks: boolean; showContactInfo: boolean };

export type PortfolioTemplateContent = {
  themePreset: PortfolioThemePresetId; typography: PortfolioTypographySettings; hero: PortfolioHeroSettings;
  projects: PortfolioProjectsSettings; about: PortfolioAboutSettings; skills: PortfolioSkillsSettings;
  services: PortfolioServicesSettings; process: PortfolioProcessSettings; testimonials: PortfolioTestimonialsSettings;
  contactCta: PortfolioContactCtaSettings; footer: PortfolioFooterSettings;
  sectionOrder: PortfolioSectionId[]; sectionVisibility: Record<PortfolioSectionId, boolean>;
};
