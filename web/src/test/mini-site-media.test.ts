import { describe, expect, it } from "vitest";
import {
  mapMiniSiteImageMediaFromWire,
  mapMiniSiteImageMediaToWire,
  MINI_SITE_IMAGE_MAX_BYTES,
  MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
  MINI_SITE_IMAGE_UPLOAD_HINT,
  normalizeMiniSiteImageMedia,
  normalizeTemplateMediaMap,
  resolveMiniSiteMediaEditorPreviewUrl,
  resolveMiniSiteMediaUrl,
  updateTemplateMediaSlot,
} from "@/lib/miniSiteMedia";

const EMPTY_MEDIA_FIELDS = {
  thumbnailUrl: "",
  originalSize: 0,
  width: 0,
  height: 0,
};

describe("miniSiteMedia helpers", () => {
  it("normalizes legacy string media values", () => {
    expect(normalizeMiniSiteImageMedia("https://example.com/hero.jpg")).toEqual({
      kind: "image",
      url: "https://example.com/hero.jpg",
      alt: "",
      filename: "",
      contentType: "",
      size: 0,
      ...EMPTY_MEDIA_FIELDS,
    });
  });

  it("normalizes structured media metadata from wire shape", () => {
    expect(
      mapMiniSiteImageMediaFromWire({
        kind: "image",
        url: "/uploads/mini_site/123/abc.webp",
        thumbnail_url: "/uploads/mini_site/123/abc_thumb.webp",
        alt: "Hero",
        filename: "hero.webp",
        content_type: "image/webp",
        size: 1200,
        original_size: 4500000,
        width: 1600,
        height: 900,
      }),
    ).toEqual({
      kind: "image",
      url: "/uploads/mini_site/123/abc.webp",
      thumbnailUrl: "/uploads/mini_site/123/abc_thumb.webp",
      alt: "Hero",
      filename: "hero.webp",
      contentType: "image/webp",
      size: 1200,
      originalSize: 4500000,
      width: 1600,
      height: 900,
    });
  });

  it("normalizes legacy media with only url", () => {
    expect(
      normalizeMiniSiteImageMedia({
        kind: "image",
        url: "/uploads/mini_site/1/legacy.webp",
        alt: "Legacy",
      }),
    ).toEqual({
      kind: "image",
      url: "/uploads/mini_site/1/legacy.webp",
      alt: "Legacy",
      filename: "",
      contentType: "",
      size: 0,
      ...EMPTY_MEDIA_FIELDS,
    });
  });

  it("maps media metadata to wire shape", () => {
    expect(
      mapMiniSiteImageMediaToWire({
        kind: "image",
        url: "/uploads/mini_site/123/abc.webp",
        thumbnailUrl: "/uploads/mini_site/123/abc_thumb.webp",
        alt: "Hero",
        filename: "hero.webp",
        contentType: "image/webp",
        size: 1200,
        originalSize: 4500000,
        width: 1600,
        height: 900,
      }),
    ).toEqual({
      kind: "image",
      url: "/uploads/mini_site/123/abc.webp",
      thumbnail_url: "/uploads/mini_site/123/abc_thumb.webp",
      alt: "Hero",
      filename: "hero.webp",
      content_type: "image/webp",
      size: 1200,
      original_size: 4500000,
      width: 1600,
      height: 900,
    });
  });

  it("uses thumbnail for editor preview and url for public rendering", () => {
    const media = {
      kind: "image" as const,
      url: "/uploads/mini_site/123/abc.webp",
      thumbnailUrl: "/uploads/mini_site/123/abc_thumb.webp",
      alt: "Hero",
      filename: "hero.webp",
      contentType: "image/webp",
      size: 1200,
      originalSize: 4500000,
      width: 1600,
      height: 900,
    };

    expect(resolveMiniSiteMediaEditorPreviewUrl(media)).toBe("/uploads/mini_site/123/abc_thumb.webp");
    expect(resolveMiniSiteMediaUrl(media.url)).toBe("/uploads/mini_site/123/abc.webp");
    expect(resolveMiniSiteMediaEditorPreviewUrl({ ...media, thumbnailUrl: "" })).toBe(
      "/uploads/mini_site/123/abc.webp",
    );
  });

  it("preserves hidden template buckets when updating one slot", () => {
    const next = updateTemplateMediaSlot(
      {
        clinic: {
          heroImage: {
            kind: "image",
            url: "/uploads/mini_site/1/a.webp",
            thumbnailUrl: "/uploads/mini_site/1/a_thumb.webp",
            alt: "",
            filename: "a.webp",
            contentType: "image/webp",
            size: 1,
            originalSize: 100,
            width: 1600,
            height: 900,
          },
        },
        portfolio: {
          heroVisual: {
            kind: "image",
            url: "/uploads/mini_site/1/b.webp",
            thumbnailUrl: "/uploads/mini_site/1/b_thumb.webp",
            alt: "",
            filename: "b.webp",
            contentType: "image/webp",
            size: 2,
            originalSize: 100,
            width: 1600,
            height: 900,
          },
        },
      },
      "clinic",
      "doctorOrClinicImage",
      {
        kind: "image",
        url: "/uploads/mini_site/1/c.webp",
        thumbnailUrl: "/uploads/mini_site/1/c_thumb.webp",
        alt: "Doctor",
        filename: "c.webp",
        contentType: "image/webp",
        size: 3,
        originalSize: 100,
        width: 1600,
        height: 900,
      },
    );

    expect(next.clinic?.doctorOrClinicImage?.url).toBe("/uploads/mini_site/1/c.webp");
    expect(next.portfolio?.heroVisual?.url).toBe("/uploads/mini_site/1/b.webp");
  });

  it("normalizeTemplateMediaMap preserves explicit empty buckets", () => {
    expect(
      normalizeTemplateMediaMap({
        clinic: {},
      }),
    ).toEqual({ clinic: {} });
  });

  it("exposes twelve megabyte upload limit constants", () => {
    expect(MINI_SITE_IMAGE_MAX_BYTES).toBe(12 * 1024 * 1024);
    expect(MINI_SITE_IMAGE_UPLOAD_HINT).toContain("12 MB");
    expect(MINI_SITE_IMAGE_TOO_LARGE_MESSAGE).toContain("12 MB");
  });
});
