import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/api/client";
import {
  getMiniSiteConfig,
  mapMiniSiteConfigFromWire,
  mapMiniSiteConfigToWire,
  updateMiniSiteConfig,
  type MiniSiteConfigWire,
} from "@/api/miniSiteApi";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { apiClient } from "@/api/client";

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      put: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";

const wireConfig: MiniSiteConfigWire = {
  version: 1,
  theme: {
    template: "service",
    primary_color: "#111111",
    accent_color: "#222222",
    background_color: "#f1f5f9",
    background_style: "soft",
    button_style: "pill",
    logo_url: null,
    cover_image_url: null,
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      order: 0,
      title: "Welcome",
      subtitle: null,
      body: null,
      items: null,
    },
  ],
  social_links: {
    website: "https://example.com",
    instagram: null,
    facebook: null,
    whatsapp: null,
    tiktok: null,
    telegram: null,
  },
  copy: {
    hero_badge_text: "Service business",
    trust_cards: [
      { title: "Same-week", subtitle: "Service availability" },
      { title: "Free quote", subtitle: "No obligation" },
      { title: "Local", subtitle: "Trusted nearby" },
    ],
    benefits_section_title: "Why choose us",
    benefits_items: ["Fast response", "Transparent pricing", "Reliable local service"],
    services_section_title: "Our services",
    services_section_badge_text: "{count} available",
    contact_section_title: "Contact & details",
    primary_cta_label: "Book now",
    secondary_cta_label: "Submit a request",
  },
};

describe("miniSiteApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mapMiniSiteConfigToWire converts backgroundColor to background_color", () => {
    const wire = mapMiniSiteConfigToWire({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: {
        ...DEFAULT_MINI_SITE_CONFIG.theme,
        backgroundColor: "#abc123",
      },
    });

    expect(wire.theme.background_color).toBe("#abc123");
  });

  it("mapMiniSiteConfigFromWire converts background_color to backgroundColor", () => {
    const config = mapMiniSiteConfigFromWire({
      ...wireConfig,
      theme: {
        ...wireConfig.theme,
        background_color: "#334455",
      },
    });

    expect(config.theme.backgroundColor).toBe("#334455");
  });

  it("mapMiniSiteConfigToWire includes FAQ copy fields", () => {
    const wire = mapMiniSiteConfigToWire(DEFAULT_MINI_SITE_CONFIG);

    expect(wire.copy?.faq_section_title).toBe("Frequently asked questions");
    expect(wire.copy?.faq_items).toHaveLength(3);
    expect(wire.copy?.faq_items?.[0]?.question).toBe("How do I book?");
  });

  it("getMiniSiteConfig calls the correct endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(wireConfig);

    await getMiniSiteConfig(BUSINESS_ID);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/businesses/${BUSINESS_ID}/mini-site-config`,
    );
  });

  it("getMiniSiteConfig returns MiniSiteConfig shape", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(wireConfig);

    const config = await getMiniSiteConfig(BUSINESS_ID);

    expect(config.version).toBe(1);
    expect(config.theme.primaryColor).toBe("#111111");
    expect(config.theme.backgroundColor).toBe("#f1f5f9");
    expect(config.theme.backgroundStyle).toBe("soft");
    expect(config.socialLinks.website).toBe("https://example.com");
    expect(config.sections[0]?.type).toBe("hero");
  });

  it("updateMiniSiteConfig calls the correct endpoint with wire payload", async () => {
    vi.mocked(apiClient.put).mockResolvedValue(wireConfig);
    const config = mapMiniSiteConfigFromWire(wireConfig);

    await updateMiniSiteConfig(BUSINESS_ID, config);

    expect(apiClient.put).toHaveBeenCalledWith(
      `/businesses/${BUSINESS_ID}/mini-site-config`,
      mapMiniSiteConfigToWire(config),
    );
  });

  it("updateMiniSiteConfig returns MiniSiteConfig shape", async () => {
    vi.mocked(apiClient.put).mockResolvedValue(wireConfig);
    const config = DEFAULT_MINI_SITE_CONFIG;

    const saved = await updateMiniSiteConfig(BUSINESS_ID, config);

    expect(saved.version).toBe(1);
    expect(saved.theme.template).toBe("service");
    expect(saved.sections[0]?.title).toBe("Welcome");
  });

  it("propagates ApiClientError from getMiniSiteConfig", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiClientError(403, "FORBIDDEN", "Forbidden"));

    await expect(getMiniSiteConfig(BUSINESS_ID)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("propagates ApiClientError from updateMiniSiteConfig", async () => {
    vi.mocked(apiClient.put).mockRejectedValue(new ApiClientError(401, "UNAUTHORIZED", "Unauthorized"));

    await expect(
      updateMiniSiteConfig(BUSINESS_ID, DEFAULT_MINI_SITE_CONFIG),
    ).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });
});
