import { describe, expect, it } from "vitest";
import {
  DEFAULT_MINI_SITE_CONFIG,
  getEnabledMiniSiteSections,
  isMiniSiteSectionType,
  isMiniSiteTemplate,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";

describe("mini-site config helpers", () => {
  it("DEFAULT_MINI_SITE_CONFIG includes copy defaults", () => {
    expect(DEFAULT_MINI_SITE_CONFIG.copy.heroBadgeText).toBe("Welcome");
    expect(DEFAULT_MINI_SITE_CONFIG.copy.trustCards).toHaveLength(3);
  });

  it("normalizeMiniSiteConfig adds copy for legacy configs", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: DEFAULT_MINI_SITE_CONFIG.sections,
      socialLinks: {},
    });
    expect(config.copy.heroBadgeText).toBe("Welcome");
    expect(config.copy.trustCards[0]?.title).toBeTruthy();
  });

  it("DEFAULT_MINI_SITE_CONFIG includes backgroundColor default", () => {
    expect(DEFAULT_MINI_SITE_CONFIG.theme.backgroundColor).toBe("#f8fafc");
  });

  it("normalizeMiniSiteConfig keeps valid backgroundColor", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        ...DEFAULT_MINI_SITE_CONFIG.theme,
        backgroundColor: "#e2e8f0",
      },
      sections: DEFAULT_MINI_SITE_CONFIG.sections,
      socialLinks: {},
    });

    expect(config.theme.backgroundColor).toBe("#e2e8f0");
  });

  it("normalizeMiniSiteConfig keeps valid background_color from wire shape", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        template: "clean",
        primary_color: "#111111",
        accent_color: "#222222",
        background_color: "#ddeeff",
        background_style: "light",
        button_style: "rounded",
      },
      sections: DEFAULT_MINI_SITE_CONFIG.sections,
      social_links: {},
    });

    expect(config.theme.backgroundColor).toBe("#ddeeff");
  });

  it("normalizeMiniSiteConfig falls back for malformed backgroundColor", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        ...DEFAULT_MINI_SITE_CONFIG.theme,
        backgroundColor: "not-a-color",
      },
      sections: DEFAULT_MINI_SITE_CONFIG.sections,
      socialLinks: {},
    });

    expect(config.theme.backgroundColor).toBe("#f8fafc");
  });

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

  it("normalizeMiniSiteConfig adds trust section enabled by default (backward compatible)", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0 },
        { id: "about", type: "about", enabled: true, order: 1 },
        { id: "services", type: "services", enabled: true, order: 2 },
        { id: "contact", type: "contact", enabled: true, order: 7 },
        { id: "booking_cta", type: "booking_cta", enabled: true, order: 8 },
      ],
      socialLinks: {},
    });

    expect(config.sections.some((section) => section.type === "trust")).toBe(true);
    expect(config.sections.find((section) => section.type === "trust")?.enabled).toBe(true);
  });

  it("DEFAULT_MINI_SITE_CONFIG includes faq copy defaults with section disabled", () => {
    expect(DEFAULT_MINI_SITE_CONFIG.copy.faqSectionTitle).toBe("Frequently asked questions");
    expect(DEFAULT_MINI_SITE_CONFIG.copy.faqItems).toHaveLength(3);
    expect(DEFAULT_MINI_SITE_CONFIG.sections.find((section) => section.type === "faq")?.enabled).toBe(
      false,
    );
  });

  it("normalizeMiniSiteConfig adds faq section disabled by default for legacy configs", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0 },
        { id: "about", type: "about", enabled: true, order: 1 },
        { id: "services", type: "services", enabled: true, order: 2 },
        { id: "contact", type: "contact", enabled: true, order: 7 },
        { id: "booking_cta", type: "booking_cta", enabled: true, order: 8 },
      ],
      socialLinks: {},
    });

    expect(config.sections.some((section) => section.type === "faq")).toBe(true);
    expect(config.sections.find((section) => section.type === "faq")?.enabled).toBe(false);
    expect(config.copy.faqSectionTitle).toBe("Frequently asked questions");
    expect(config.copy.faqItems).toHaveLength(3);
    expect(config.copy.faqItems[0]?.question).toBe("How do I book?");
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
    expect(enabled.map((section) => section.type)).toEqual(["hero", "trust", "contact"]);
  });

  it("preserves custom order for core sections including trust", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 10 },
        { id: "about", type: "about", enabled: true, order: 3 },
        { id: "services", type: "services", enabled: true, order: 1 },
        { id: "trust", type: "trust", enabled: true, order: 2 },
        { id: "contact", type: "contact", enabled: true, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
        { id: "gallery", type: "gallery", enabled: false, order: 6 },
      ],
      socialLinks: {},
    });

    const enabled = getEnabledMiniSiteSections(config);

    // Hero is always pinned first, but the other sections keep their configured order.
    expect(enabled.map((section) => section.type)).toEqual(["hero", "services", "trust", "about", "contact"]);
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

  it("removes HTML delimiter characters from text fields during normalization", () => {
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
    expect(hero?.title).toBe("scriptalert(1)/scriptSafe title");
    expect(hero?.body).toBe("bHello/b world");
    expect(hero?.title).not.toMatch(/[<>]/);
    expect(hero?.body).not.toMatch(/[<>]/);
  });

  it("sanitizes malformed HTML delimiter input", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        {
          id: "hero",
          type: "hero",
          enabled: true,
          order: 0,
          title: "<script",
          body: "Hello <b",
        },
      ],
      socialLinks: {},
    });

    const hero = config.sections.find((section) => section.type === "hero");
    expect(hero?.title).toBe("script");
    expect(hero?.body).toBe("Hello b");
    expect(hero?.title).not.toMatch(/[<>]/);
    expect(hero?.body).not.toMatch(/[<>]/);
  });
});
