import type { MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteVideoProvider = "youtube" | "vimeo";

export type MiniSiteVideoMedia = {
  kind: "video";
  url: string;
  provider: MiniSiteVideoProvider;
  embedUrl: string;
  title: string;
};

export type MiniSiteVideoMediaWire = {
  kind: "video";
  url: string;
  provider: MiniSiteVideoProvider;
  embed_url: string;
  title?: string;
};

export const MINI_SITE_VIDEO_INVALID_URL_MESSAGE = "Use a YouTube or Vimeo link.";

const ALLOWED_EMBED_HOSTS = new Set(["www.youtube.com", "youtube.com", "player.vimeo.com"]);

export type MiniSiteTemplateVideos = Partial<Record<string, MiniSiteVideoMedia>>;

export function parseMiniSiteVideoUrl(input: string): Omit<MiniSiteVideoMedia, "kind" | "title"> | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (host === "www.youtube.com" || host === "youtube.com") {
    if (path.startsWith("/embed/")) {
      const videoId = path.slice("/embed/".length).split("/")[0]?.split("?")[0];
      if (videoId) {
        return youtubeResult(raw, videoId);
      }
    }
    if (path === "/watch" || path.startsWith("/watch/")) {
      const videoId = parsed.searchParams.get("v")?.split("&")[0];
      if (videoId) {
        return youtubeResult(raw, videoId);
      }
    }
  }

  if (host === "youtu.be") {
    const videoId = path.replace(/^\//, "").split("/")[0]?.split("?")[0];
    if (videoId) {
      return youtubeResult(raw, videoId);
    }
  }

  if (host === "www.vimeo.com" || host === "vimeo.com") {
    const match = path.match(/^\/(\d+)/);
    if (match?.[1]) {
      return {
        provider: "vimeo",
        url: raw,
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
      };
    }
  }

  return null;
}

function youtubeResult(url: string, videoId: string): Omit<MiniSiteVideoMedia, "kind" | "title"> {
  return {
    provider: "youtube",
    url,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}

export function isAllowedMiniSiteVideoEmbedUrl(embedUrl: string): boolean {
  try {
    const parsed = new URL(embedUrl);
    if (parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_EMBED_HOSTS.has(host)) {
      return false;
    }
    if (host === "www.youtube.com" || host === "youtube.com") {
      return parsed.pathname.startsWith("/embed/");
    }
    if (host === "player.vimeo.com") {
      return parsed.pathname.startsWith("/video/");
    }
    return false;
  } catch {
    return false;
  }
}

export function normalizeMiniSiteVideoMedia(value: unknown): MiniSiteVideoMedia | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (source.kind !== undefined && source.kind !== "video") {
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

  const parsed = parseMiniSiteVideoUrl(url);
  if (parsed) {
    return {
      kind: "video",
      url: parsed.url,
      provider: parsed.provider,
      embedUrl: parsed.embedUrl,
      title: typeof source.title === "string" ? source.title.trim() : "",
    };
  }

  const providerRaw = source.provider;
  const embedUrlRaw = source.embedUrl ?? source.embed_url;
  if (
    (providerRaw === "youtube" || providerRaw === "vimeo") &&
    typeof embedUrlRaw === "string" &&
    isAllowedMiniSiteVideoEmbedUrl(embedUrlRaw.trim())
  ) {
    return {
      kind: "video",
      url,
      provider: providerRaw,
      embedUrl: embedUrlRaw.trim(),
      title: typeof source.title === "string" ? source.title.trim() : "",
    };
  }

  return null;
}

export function mapMiniSiteVideoMediaToWire(media: MiniSiteVideoMedia): MiniSiteVideoMediaWire {
  return {
    kind: "video",
    url: media.url,
    provider: media.provider,
    embed_url: media.embedUrl,
    title: media.title || undefined,
  };
}

export function buildMiniSiteVideoMediaFromUrl(input: string, title = ""): MiniSiteVideoMedia | null {
  const parsed = parseMiniSiteVideoUrl(input);
  if (!parsed) {
    return null;
  }
  return {
    kind: "video",
    ...parsed,
    title: title.trim(),
  };
}

export function getTemplateVideoSlots(
  templateMedia: Partial<Record<MiniSiteTemplate, Record<string, unknown>>>,
  template: MiniSiteTemplate,
): MiniSiteTemplateVideos {
  const bucket = templateMedia[template];
  if (!bucket || typeof bucket !== "object") {
    return {};
  }

  const result: MiniSiteTemplateVideos = {};
  for (const [slotKey, slotValue] of Object.entries(bucket)) {
    const media = normalizeMiniSiteVideoMedia(slotValue);
    if (media) {
      result[slotKey] = media;
    }
  }
  return result;
}
