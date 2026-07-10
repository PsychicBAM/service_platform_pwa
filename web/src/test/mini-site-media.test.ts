import { describe, expect, it } from "vitest";
import {
  mapMiniSiteImageMediaFromWire,
  mapMiniSiteImageMediaToWire,
  MINI_SITE_IMAGE_MAX_BYTES,
  MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
  MINI_SITE_IMAGE_UPLOAD_HINT,
  normalizeMiniSiteImageMedia,
  normalizeTemplateMediaMap,
  updateTemplateMediaSlot,
} from "@/lib/miniSiteMedia";

describe("miniSiteMedia helpers", () => {
  it("normalizes legacy string media values", () => {
    expect(normalizeMiniSiteImageMedia("https://example.com/hero.jpg")).toEqual({
      kind: "image",
      url: "https://example.com/hero.jpg",
      alt: "",
      filename: "",
      contentType: "",
      size: 0,
    });
  });

  it("normalizes structured media metadata from wire shape", () => {
    expect(
      mapMiniSiteImageMediaFromWire({
        kind: "image",
        url: "/uploads/mini_site/123/abc.webp",
        alt: "Hero",
        filename: "hero.webp",
        content_type: "image/webp",
        size: 1200,
      }),
    ).toEqual({
      kind: "image",
      url: "/uploads/mini_site/123/abc.webp",
      alt: "Hero",
      filename: "hero.webp",
      contentType: "image/webp",
      size: 1200,
    });
  });

  it("maps media metadata to wire shape", () => {
    expect(
      mapMiniSiteImageMediaToWire({
        kind: "image",
        url: "/uploads/mini_site/123/abc.webp",
        alt: "Hero",
        filename: "hero.webp",
        contentType: "image/webp",
        size: 1200,
      }),
    ).toEqual({
      kind: "image",
      url: "/uploads/mini_site/123/abc.webp",
      alt: "Hero",
      filename: "hero.webp",
      content_type: "image/webp",
      size: 1200,
    });
  });

  it("preserves hidden template buckets when updating one slot", () => {
    const next = updateTemplateMediaSlot(
      {
        clinic: {
          heroImage: {
            kind: "image",
            url: "/uploads/mini_site/1/a.webp",
            alt: "",
            filename: "a.webp",
            contentType: "image/webp",
            size: 1,
          },
        },
        portfolio: {
          heroVisual: {
            kind: "image",
            url: "/uploads/mini_site/1/b.webp",
            alt: "",
            filename: "b.webp",
            contentType: "image/webp",
            size: 2,
          },
        },
      },
      "clinic",
      "doctorOrClinicImage",
      {
        kind: "image",
        url: "/uploads/mini_site/1/c.webp",
        alt: "Doctor",
        filename: "c.webp",
        contentType: "image/webp",
        size: 3,
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
