import { apiClient } from "@/api/client";
import type {
  MiniSiteBackgroundStyle,
  MiniSiteButtonStyle,
  MiniSiteConfig,
  MiniSiteSection,
  MiniSiteSectionItem,
  MiniSiteSectionType,
  MiniSiteSocialLinks,
  MiniSiteTemplate,
  MiniSiteTheme,
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
};

function miniSiteConfigPath(businessId: string | number): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/mini-site-config`;
}

function mapSectionItemFromWire(item: MiniSiteSectionItemWire): MiniSiteSectionItem {
  const mapped: MiniSiteSectionItem = {};
  if (item.label) mapped.label = item.label;
  if (item.title) mapped.title = item.title;
  if (item.body) mapped.body = item.body;
  if (item.value) mapped.value = item.value;
  return mapped;
}

function mapSectionItemToWire(item: MiniSiteSectionItem): MiniSiteSectionItemWire {
  return {
    label: item.label ?? null,
    title: item.title ?? null,
    body: item.body ?? null,
    value: item.value ?? null,
  };
}

function mapSectionFromWire(section: MiniSiteSectionWire): MiniSiteSection {
  return {
    id: section.id,
    type: section.type,
    enabled: section.enabled,
    order: section.order,
    title: section.title ?? undefined,
    subtitle: section.subtitle ?? undefined,
    body: section.body ?? undefined,
    items: section.items?.map(mapSectionItemFromWire),
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

function mapThemeFromWire(theme: MiniSiteThemeWire): MiniSiteTheme {
  return {
    template: theme.template,
    primaryColor: theme.primary_color,
    accentColor: theme.accent_color,
    backgroundColor: theme.background_color,
    backgroundStyle: theme.background_style,
    buttonStyle: theme.button_style,
    logoUrl: theme.logo_url ?? null,
    coverImageUrl: theme.cover_image_url ?? null,
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

function mapSocialLinksFromWire(links: MiniSiteSocialLinksWire): MiniSiteSocialLinks {
  const mapped: MiniSiteSocialLinks = {};
  if (links.website) mapped.website = links.website;
  if (links.instagram) mapped.instagram = links.instagram;
  if (links.facebook) mapped.facebook = links.facebook;
  if (links.whatsapp) mapped.whatsapp = links.whatsapp;
  if (links.tiktok) mapped.tiktok = links.tiktok;
  if (links.telegram) mapped.telegram = links.telegram;
  return mapped;
}

function mapSocialLinksToWire(links: MiniSiteSocialLinks): MiniSiteSocialLinksWire {
  return {
    website: links.website ?? null,
    instagram: links.instagram ?? null,
    facebook: links.facebook ?? null,
    whatsapp: links.whatsapp ?? null,
    tiktok: links.tiktok ?? null,
    telegram: links.telegram ?? null,
  };
}

export function mapMiniSiteConfigFromWire(wire: MiniSiteConfigWire): MiniSiteConfig {
  return {
    version: wire.version,
    theme: mapThemeFromWire(wire.theme),
    sections: wire.sections.map(mapSectionFromWire),
    socialLinks: mapSocialLinksFromWire(wire.social_links),
  };
}

export function mapMiniSiteConfigToWire(config: MiniSiteConfig): MiniSiteConfigWire {
  return {
    version: config.version,
    theme: mapThemeToWire(config.theme),
    sections: config.sections.map(mapSectionToWire),
    social_links: mapSocialLinksToWire(config.socialLinks),
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
