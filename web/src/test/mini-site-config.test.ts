import { describe, expect, it } from "vitest";
import {
  DEFAULT_MINI_SITE_CONFIG,
  getEnabledMiniSiteSections,
  isMiniSiteSectionType,
  isMiniSiteTemplate,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";

describe("mini-site config helpers", () => {
  it("DEFAULT_MINI_SITE_CONFIG has version 1", () => {
    expect(DEFAULT_MINI_SITE_CONFIG.version).toBe(1);
  });

  it("default config includes hero, services, contact, and booking_cta", () => {
    const types = DEFAULT_MINI_SITE_CONFIG.sections.map((section) => section.type);

    expect(types).toContain("hero");
    expect(types).toContain("services");
    expect(types).toContain("contact");
    expect(types).toContain("booking_cta");
  });

  it("normalizeMiniSiteConfig handles null, undefined, and bad input safely", () => {
    const fromNull = normalizeMiniSiteConfig(null);
    const fromUndefined = normalizeMiniSiteConfig(undefined);
    const fromString = normalizeMiniSiteConfig("not-json");
    const fromNumber = normalizeMiniSiteConfig(42);

    for (const config of [fromNull, fromUndefined, fromString, fromNumber]) {
      expect(config.version).toBe(1);
      expect(config.theme.template).toBe("clean");
      expect(config.sections.length).toBeGreaterThan(0);
      expect(config.socialLinks).toEqual({});
    }
  });

  it("unknown section types are ignored", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0, title: "Hi" },
        { id: "bad", type: "webflow_canvas", enabled: true, order: 1 },
        { id: "contact", type: "contact", enabled: true, order: 2 },
      ],
      socialLinks: {},
    });

    expect(config.sections.some((section) => section.type === ("webflow_canvas" as never))).toBe(false);
    expect(config.sections.some((section) => section.type === "hero")).toBe(true);
    expect(config.sections.some((section) => section.type === "contact")).toBe(true);
  });

  it("sections are sorted by order", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "contact", type: "contact", enabled: true, order: 20 },
        { id: "hero", type: "hero", enabled: true, order: 0 },
        { id: "services", type: "services", enabled: true, order: 10 },
      ],
      socialLinks: {},
    });

    const orders = config.sections.map((section) => section.order);
    expect(orders).toEqual([...orders].slice().sort((left, right) => left - right));
  });

  it("missing required sections are added", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [{ id: "hero", type: "hero", enabled: true, order: 0, title: "Only hero" }],
      socialLinks: {},
    });

    expect(config.sections.some((section) => section.type === "about")).toBe(true);
    expect(config.sections.some((section) => section.type === "services")).toBe(true);
    expect(config.sections.some((section) => section.type === "contact")).toBe(true);
    expect(config.sections.some((section) => section.type === "booking_cta")).toBe(true);
  });

  it("getEnabledMiniSiteSections returns only enabled sections in order", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0 },
        { id: "about", type: "about", enabled: false, order: 1 },
        { id: "services", type: "services", enabled: false, order: 2 },
        { id: "gallery", type: "gallery", enabled: false, order: 3 },
        { id: "contact", type: "contact", enabled: true, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
      ],
      socialLinks: {},
    });

    const enabled = getEnabledMiniSiteSections(config);

    expect(enabled.every((section) => section.enabled)).toBe(true);
    expect(enabled.map((section) => section.type)).toEqual(["hero", "contact"]);
  });

  it("template and section type guards work", () => {
    expect(isMiniSiteTemplate("clean")).toBe(true);
    expect(isMiniSiteTemplate("webflow")).toBe(false);
    expect(isMiniSiteTemplate(null)).toBe(false);

    expect(isMiniSiteSectionType("hero")).toBe(true);
    expect(isMiniSiteSectionType("booking_cta")).toBe(true);
    expect(isMiniSiteSectionType("canvas")).toBe(false);
    expect(isMiniSiteSectionType(undefined)).toBe(false);
  });

  it("strips HTML from text fields during normalization", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        {
          id: "hero",
          type: "hero",
          enabled: true,
          order: 0,
          title: "<script>alert(1)</script>Safe title",
          body: "<b>Hello</b> world",
        },
      ],
      socialLinks: {},
    });

    const hero = config.sections.find((section) => section.type === "hero");
    expect(hero?.title).toBe("alert(1)Safe title");
    expect(hero?.body).toBe("Hello world");
  });
});
