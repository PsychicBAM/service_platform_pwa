import type { MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteImageMedia = {
  kind: "image";
  url: string;
  alt: string;
  filename: string;
  contentType: string;
  size: number;
};

export type MiniSiteImageMediaWire = {
  kind: "image";
  url: string;
  alt?: string;
  filename?: string;
  content_type?: string;
  size?: number;
};

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MINI_SITE_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const MINI_SITE_IMAGE_MAX_MB = 12;
export const MINI_SITE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MINI_SITE_IMAGE_TYPES_LABEL = "JPG, PNG, or WebP";
export const MINI_SITE_IMAGE_SIZE_LABEL = `up to ${MINI_SITE_IMAGE_MAX_MB} MB`;
export const MINI_SITE_IMAGE_UPLOAD_HINT = `${MINI_SITE_IMAGE_TYPES_LABEL} ${MINI_SITE_IMAGE_SIZE_LABEL}`;
export const MINI_SITE_IMAGE_TOO_LARGE_MESSAGE = `Image is too large. Maximum size is ${MINI_SITE_IMAGE_MAX_MB} MB.`;
export const MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE = `Only ${MINI_SITE_IMAGE_UPLOAD_HINT} are supported.`;

export type MiniSiteTemplateImages = Partial<Record<string, MiniSiteImageMedia>>;

/** Per-template media bucket keyed by slot id (e.g. heroImage). */
export type MiniSiteTemplateMediaBucket = Partial<Record<string, MiniSiteImageMedia>>;

/** Template-keyed media maps preserve uploads when switching templates. */
export type MiniSiteTemplateMediaMap = Partial<Record<MiniSiteTemplate, MiniSiteTemplateMediaBucket>>;

export function isAllowedMiniSiteImageFile(file: File): boolean {
  return ALLOWED_IMAGE_CONTENT_TYPES.has(file.type);
}

export function normalizeMiniSiteImageMedia(value: unknown): MiniSiteImageMedia | null {
  if (typeof value === "string") {
    const url = value.trim();
    if (!url) {
      return null;
    }
    return {
      kind: "image",
      url,
      alt: "",
      filename: "",
      contentType: "",
      size: 0,
    };
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (source.kind !== undefined && source.kind !== "image") {
    return null;
  }

  const urlRaw = source.url;
  if (typeof urlRaw !== "string") {
    return null;
  }
  const url = urlRaw.trim();
  if (!url) {
    return null;
  }

  const size = source.size;
  const contentTypeRaw = source.contentType ?? source.content_type;

  return {
    kind: "image",
    url,
    alt: typeof source.alt === "string" ? source.alt.trim() : "",
    filename: typeof source.filename === "string" ? source.filename.trim() : "",
    contentType: typeof contentTypeRaw === "string" ? contentTypeRaw.trim() : "",
    size: typeof size === "number" && size >= 0 ? size : 0,
  };
}

export function mapMiniSiteImageMediaFromWire(value: unknown): MiniSiteImageMedia | null {
  return normalizeMiniSiteImageMedia(value);
}

export function mapMiniSiteImageMediaToWire(media: MiniSiteImageMedia): MiniSiteImageMediaWire {
  return {
    kind: "image",
    url: media.url,
    alt: media.alt,
    filename: media.filename,
    content_type: media.contentType,
    size: media.size,
  };
}

export function normalizeTemplateMediaMap(input: unknown): MiniSiteTemplateMediaMap {
  if (input === null || input === undefined) {
    return {};
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const templates: MiniSiteTemplate[] = [
    "clean",
    "service",
    "expert",
    "clinic",
    "portfolio",
    "teacher",
    "coach",
  ];
  const result: MiniSiteTemplateMediaMap = {};

  for (const [key, bucket] of Object.entries(input as Record<string, unknown>)) {
    if (!templates.includes(key as MiniSiteTemplate)) {
      continue;
    }
    if (bucket === null) {
      result[key as MiniSiteTemplate] = {};
      continue;
    }
    if (typeof bucket !== "object" || Array.isArray(bucket)) {
      continue;
    }

    const normalizedBucket: Record<string, MiniSiteImageMedia> = {};
    for (const [slotKey, slotValue] of Object.entries(bucket as Record<string, unknown>)) {
      const media = normalizeMiniSiteImageMedia(slotValue);
      if (media) {
        normalizedBucket[slotKey] = media;
      }
    }
    result[key as MiniSiteTemplate] = normalizedBucket;
  }

  return result;
}

export function getTemplateImageSlots(
  templateMedia: MiniSiteTemplateMediaMap,
  template: MiniSiteTemplate,
): MiniSiteTemplateImages {
  const bucket = templateMedia[template];
  if (!bucket || typeof bucket !== "object") {
    return {};
  }

  const result: Partial<Record<string, MiniSiteImageMedia>> = {};
  for (const [slotKey, slotValue] of Object.entries(bucket)) {
    const media = normalizeMiniSiteImageMedia(slotValue);
    if (media) {
      result[slotKey] = media;
    }
  }
  return result;
}

export function resolveMiniSiteMediaUrl(url: string): string {
  if (!url) {
    return url;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return url;
  }
  return `/${url}`;
}

export function updateTemplateMediaSlot(
  templateMedia: MiniSiteTemplateMediaMap,
  template: MiniSiteTemplate,
  slot: string,
  media: MiniSiteImageMedia | null,
): MiniSiteTemplateMediaMap {
  const next = { ...templateMedia };
  const bucket = { ...(next[template] ?? {}) };

  if (media) {
    bucket[slot] = media;
    next[template] = bucket;
    return next;
  }

  delete bucket[slot];
  if (Object.keys(bucket).length > 0) {
    next[template] = bucket;
  } else {
    delete next[template];
  }
  return next;
}

export function updateTemplateMediaAlt(
  templateMedia: MiniSiteTemplateMediaMap,
  template: MiniSiteTemplate,
  slot: string,
  alt: string,
): MiniSiteTemplateMediaMap {
  const bucket = templateMedia[template];
  const existing = bucket?.[slot];
  const media = normalizeMiniSiteImageMedia(existing);
  if (!media) {
    return templateMedia;
  }
  return updateTemplateMediaSlot(templateMedia, template, slot, { ...media, alt: alt.trim() });
}
