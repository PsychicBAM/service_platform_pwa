import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMiniSiteVideoMediaFromUrl,
  getTemplateVideoSlots,
  isAllowedMiniSiteVideoEmbedUrl,
  MINI_SITE_VIDEO_INVALID_URL_MESSAGE,
  normalizeMiniSiteVideoMedia,
  parseMiniSiteVideoUrl,
} from "@/lib/miniSiteVideo";

describe("miniSiteVideo helpers", () => {
  it("allows safe video iframe providers in nginx CSP", () => {
    const nginxConfig = readFileSync(resolve(process.cwd(), "nginx.conf"), "utf8");
    expect(nginxConfig).toContain("frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com");
    expect(nginxConfig).toContain("child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com");
    expect(nginxConfig).not.toContain("frame-src 'none'");
  });

  it("parses YouTube watch links", () => {
    expect(parseMiniSiteVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("parses youtu.be links", () => {
    expect(parseMiniSiteVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      url: "https://youtu.be/dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("parses YouTube embed links", () => {
    expect(parseMiniSiteVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("parses Vimeo links", () => {
    expect(parseMiniSiteVideoUrl("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      url: "https://vimeo.com/123456789",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
  });

  it("returns null for unsupported URLs", () => {
    expect(parseMiniSiteVideoUrl("https://example.com/video.mp4")).toBeNull();
    expect(buildMiniSiteVideoMediaFromUrl("https://evil.com/embed/x")).toBeNull();
    expect(MINI_SITE_VIDEO_INVALID_URL_MESSAGE).toBe("Use a YouTube or Vimeo link.");
  });

  it("normalizes stored video metadata from wire shape", () => {
    expect(
      normalizeMiniSiteVideoMedia({
        kind: "video",
        url: "https://youtu.be/abc123XYZ12",
        provider: "youtube",
        embed_url: "https://www.youtube.com/embed/abc123XYZ12",
        title: "Intro",
      }),
    ).toEqual({
      kind: "video",
      url: "https://youtu.be/abc123XYZ12",
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ12",
      title: "Intro",
    });
  });

  it("rejects arbitrary embed URLs from unknown hosts", () => {
    expect(
      normalizeMiniSiteVideoMedia({
        kind: "video",
        url: "https://evil.com/watch?v=1",
        provider: "youtube",
        embed_url: "https://evil.com/embed/1",
      }),
    ).toBeNull();
    expect(isAllowedMiniSiteVideoEmbedUrl("https://evil.com/embed/1")).toBe(false);
    expect(isAllowedMiniSiteVideoEmbedUrl("https://www.youtube-nocookie.com/embed/abc")).toBe(true);
  });

  it("getTemplateVideoSlots returns only valid video media", () => {
    const slots = getTemplateVideoSlots(
      {
        clinic: {
          introVideo: {
            kind: "video",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            provider: "youtube",
            embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            title: "",
          },
          heroImage: {
            kind: "image",
            url: "/uploads/mini_site/1/hero.webp",
            alt: "",
            filename: "hero.webp",
            contentType: "image/webp",
            size: 1,
            thumbnailUrl: "",
            originalSize: 0,
            width: 0,
            height: 0,
          },
          brokenVideo: {
            kind: "video",
            url: "https://example.com/not-a-video",
          },
        },
      },
      "clinic",
    );

    expect(slots.introVideo?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(slots.heroImage).toBeUndefined();
    expect(slots.brokenVideo).toBeUndefined();
  });
});
