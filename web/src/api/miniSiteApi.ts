import { apiClient } from "@/api/client";
import { normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import {
  mapMiniSiteImageMediaFromWire,
  mapMiniSiteImageMediaToWire,
  normalizeMiniSiteImageMedia,
} from "@/lib/miniSiteMedia";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteConfig,
  MiniSiteCopy,
  MiniSiteFaqItem,
  MiniSiteSection,
  MiniSiteSectionItem,
  MiniSiteSectionType,
  MiniSiteSocialLinks,
  MiniSiteTemplate,
  MiniSiteTemplateFoundationMap,
  MiniSiteTheme,
  MiniSiteTrustCard,
} from "@/types/miniSite";

type MiniSiteSectionItemWire = {
  label?: string | null;
  title?: string | null;
  body?: string | null;
  value?: string | null;
};

type MiniSiteSectionWire = {
  id: string;
  type: MiniSiteSectionType;
  enabled: boolean;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  items?: MiniSiteSectionItemWire[] | null;
  order: number;
};

type MiniSiteTrustCardWire = {
  title: string;
  subtitle: string;
};

type MiniSiteFaqItemWire = {
  question: string;
  answer: string;
};

type MiniSiteCopyWire = {
  hero_badge_text?: string;
  trust_cards?: MiniSiteTrustCardWire[];
  benefits_section_title?: string;
  benefits_items?: string[];
  services_section_title?: string;
  services_section_badge_text?: string;
  contact_section_title?: string;
  primary_cta_label?: string;
  secondary_cta_label?: string;
  faq_section_title?: string;
  faq_items?: MiniSiteFaqItemWire[];
};

type MiniSiteThemeWire = {
  template: MiniSiteTemplate;
  primary_color: string;
  accent_color: string;
  background_color: string;
  background_style: MiniSiteBackgroundStyle;
  button_style: MiniSiteButtonStyle;
  logo_url?: string | null;
  cover_image_url?: string | null;
};

type MiniSiteSocialLinksWire = {
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  tiktok?: string | null;
  telegram?: string | null;
};

export type MiniSiteConfigWire = {
  version: 1;
  theme: MiniSiteThemeWire;
  sections: MiniSiteSectionWire[];
  social_links: MiniSiteSocialLinksWire;
  copy?: MiniSiteCopyWire;
  template_content?: MiniSiteTemplateFoundationMap;
  template_media?: MiniSiteTemplateFoundationMap;
};

function mapTemplateContentMapToWire(
  map: MiniSiteTemplateFoundationMap,
): MiniSiteTemplateFoundationMap {
  const result: MiniSiteTemplateFoundationMap = {};
  for (const [template, bucket] of Object.entries(map)) {
    result[template as MiniSiteTemplate] = { ...bucket };
  }
  return result;
}

function mapTemplateMediaMapFromWire(map: MiniSiteTemplateFoundationMap | undefined): MiniSiteTemplateFoundationMap {
  if (!map) {
    return {};
  }
  const result: MiniSiteTemplateFoundationMap = {};
  for (const [template, bucket] of Object.entries(map)) {
    if (!bucket || typeof bucket !== "object") {
      continue;
    }
    const normalizedBucket: Record<string, unknown> = {};
    for (const [slot, value] of Object.entries(bucket)) {
      const media = mapMiniSiteImageMediaFromWire(value);
      if (media) {
        normalizedBucket[slot] = media;
      }
    }
    result[template as MiniSiteTemplate] = normalizedBucket;
  }
  return result;
}

function mapTemplateMediaMapToWire(map: MiniSiteTemplateFoundationMap): MiniSiteTemplateFoundationMap {
  const result: MiniSiteTemplateFoundationMap = {};
  for (const [template, bucket] of Object.entries(map)) {
    if (!bucket || typeof bucket !== "object") {
      continue;
    }
    const wireBucket: Record<string, unknown> = {};
    for (const [slot, value] of Object.entries(bucket)) {
      const media = normalizeMiniSiteImageMedia(value);
      if (media) {
        wireBucket[slot] = mapMiniSiteImageMediaToWire(media);
      }
    }
    result[template as MiniSiteTemplate] = wireBucket;
  }
  return result;
}

function miniSiteConfigPath(businessId: string | number): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/mini-site-config`;
}

function mapSectionItemToWire(item: MiniSiteSectionItem): MiniSiteSectionItemWire {
  return {
    label: item.label ?? null,
    title: item.title ?? null,
    body: item.body ?? null,
    value: item.value ?? null,
  };
}

function mapSectionToWire(section: MiniSiteSection): MiniSiteSectionWire {
  return {
    id: section.id,
    type: section.type,
    enabled: section.enabled,
    order: section.order,
    title: section.title ?? null,
    subtitle: section.subtitle ?? null,
    body: section.body ?? null,
    items: section.items?.map(mapSectionItemToWire) ?? null,
  };
}

function mapTrustCardToWire(card: MiniSiteTrustCard): MiniSiteTrustCardWire {
  return { title: card.title, subtitle: card.subtitle };
}

function sanitizeFaqField(value: string): string {
  return value.trim();
}

function mapFaqItemToWire(item: MiniSiteFaqItem): MiniSiteFaqItemWire {
  return {
    question: sanitizeFaqField(item.question),
    answer: sanitizeFaqField(item.answer),
  };
}

function mapCopyToWire(copy: MiniSiteCopy): MiniSiteCopyWire {
  return {
    hero_badge_text: copy.heroBadgeText,
    trust_cards: copy.trustCards.map(mapTrustCardToWire),
    benefits_section_title: copy.benefitsSectionTitle,
    benefits_items: [...copy.benefitsItems],
    services_section_title: copy.servicesSectionTitle,
    services_section_badge_text: copy.servicesSectionBadgeText,
    contact_section_title: copy.contactSectionTitle,
    primary_cta_label: sanitizeFaqField(copy.primaryCtaLabel),
    secondary_cta_label: sanitizeFaqField(copy.secondaryCtaLabel),
    faq_section_title: copy.faqSectionTitle,
    faq_items: copy.faqItems.map(mapFaqItemToWire),
  };
}

function mapThemeToWire(theme: MiniSiteTheme): MiniSiteThemeWire {
  return {
    template: theme.template,
    primary_color: theme.primaryColor,
    accent_color: theme.accentColor,
    background_color: theme.backgroundColor,
    background_style: theme.backgroundStyle,
    button_style: theme.buttonStyle,
    logo_url: theme.logoUrl ?? null,
    cover_image_url: theme.coverImageUrl ?? null,
  };
}

function mapSocialLinkToWire(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapSocialLinksToWire(links: MiniSiteSocialLinks): MiniSiteSocialLinksWire {
  return {
    website: mapSocialLinkToWire(links.website),
    instagram: mapSocialLinkToWire(links.instagram),
    facebook: mapSocialLinkToWire(links.facebook),
    whatsapp: mapSocialLinkToWire(links.whatsapp),
    tiktok: mapSocialLinkToWire(links.tiktok),
    telegram: mapSocialLinkToWire(links.telegram),
  };
}

export function mapMiniSiteConfigFromWire(wire: MiniSiteConfigWire): MiniSiteConfig {
  return normalizeMiniSiteConfig({
    version: wire.version,
    theme: wire.theme,
    sections: wire.sections,
    social_links: wire.social_links,
    copy: wire.copy,
    template_content: wire.template_content,
    template_media: wire.template_media,
  });
}

export function mapMiniSiteConfigToWire(config: MiniSiteConfig): MiniSiteConfigWire {
  return {
    version: config.version,
    theme: mapThemeToWire(config.theme),
    sections: config.sections.map(mapSectionToWire),
    social_links: mapSocialLinksToWire(config.socialLinks),
    copy: mapCopyToWire(config.copy),
    template_content: mapTemplateContentMapToWire(config.templateContent),
    template_media: mapTemplateMediaMapToWire(config.templateMedia),
  };
}

export function getMiniSiteConfig(businessId: string | number): Promise<MiniSiteConfig> {
  return apiClient
    .get<MiniSiteConfigWire>(miniSiteConfigPath(businessId))
    .then(mapMiniSiteConfigFromWire);
}

export function updateMiniSiteConfig(
  businessId: string | number,
  config: MiniSiteConfig,
): Promise<MiniSiteConfig> {
  return apiClient
    .put<MiniSiteConfigWire>(miniSiteConfigPath(businessId), mapMiniSiteConfigToWire(config))
    .then(mapMiniSiteConfigFromWire);
}
