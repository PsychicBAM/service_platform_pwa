import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceTemplatePublicView } from "@/components/public/ServiceTemplatePublicView";
import {
  applyServiceThemePreset,
  createDefaultServiceTemplateContent,
  createDefaultServiceTypography,
  getServicePresetVisuals,
  getServiceTemplateContent,
  normalizeServiceTemplateContent,
  orderPublicServicesBySelection,
  resolveServicePresetVisuals,
  resolveServiceTypography,
  sanitizeCustomFontFamily,
  sanitizeOptionalHexColor,
  setServiceTemplateContent,
  SERVICE_THEME_PRESETS,
} from "@/lib/serviceTemplateConfig";
import { DEFAULT_MINI_SITE_CONFIG, normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import { mockBookingService, mockOrderService, mockPublicBusiness } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";
import * as miniSiteApi from "@/api/miniSiteApi";
import * as adminApi from "@/api/adminApi";
import { ServiceTemplateEditor } from "@/components/admin/miniSiteBuilder/ServiceTemplateEditor";
import { getAvailableSectionsForTemplate } from "@/lib/miniSiteTemplateBuilders";

vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

vi.mock("@/api/adminApi", () => ({
  listAdminServices: vi.fn(),
}));

describe("serviceTemplateConfig", () => {
  it("normalizes missing service content to defaults with all theme presets", () => {
    const content = normalizeServiceTemplateContent(undefined);
    expect(content.themePreset).toBe("premium_dark");
    expect(content.typography.headingFontPreset).toBe("system_sans");
    expect(content.typography.bodyColor).toBe("");
    expect(content.howItWorks.steps.length).toBeGreaterThanOrEqual(4);
    expect(content.pricingPackages.packages.some((pkg) => pkg.popular)).toBe(true);
    expect(Object.keys(SERVICE_THEME_PRESETS)).toEqual(
      expect.arrayContaining([
        "modern_green",
        "premium_dark",
        "ocean_blue",
        "royal_purple",
        "warm_orange",
        "clean_white",
      ]),
    );
  });

  it("sanitizes custom font family and optional hex colors safely", () => {
    const cleaned = sanitizeCustomFontFamily(
      `Avenir, Helvetica, sans-serif; } body { color:red`,
    );
    expect(cleaned).toContain("Avenir");
    expect(cleaned).not.toMatch(/[;{}]/);
    expect(sanitizeCustomFontFamily("url(https://evil)")).toBe("");
    expect(sanitizeCustomFontFamily("x".repeat(120)).length).toBeLessThanOrEqual(80);
    expect(sanitizeOptionalHexColor("#abc")).toBe("#aabbcc");
    expect(sanitizeOptionalHexColor("#112233")).toBe("#112233");
    expect(sanitizeOptionalHexColor("not-a-color")).toBe("");
    expect(sanitizeOptionalHexColor("")).toBe("");
  });

  it("resolves typography fonts and color overrides", () => {
    const resolved = resolveServiceTypography({
      ...createDefaultServiceTypography(),
      headingFontPreset: "elegant_serif",
      bodyFontPreset: "custom",
      buttonFontPreset: "mono_tech",
      customFontFamily: "Avenir, Helvetica, sans-serif",
      headingColor: "#112233",
      bodyColor: "bad",
      heroHeadingColor: "#fff",
      accentTextColor: "#ff5500",
      mutedColor: "#667788",
    });
    expect(resolved.headingFontFamily).toContain("Georgia");
    expect(resolved.bodyFontFamily).toContain("Avenir");
    expect(resolved.buttonFontFamily).toContain("Consolas");
    expect(resolved.headingColor).toBe("#112233");
    expect(resolved.bodyColor).toBeNull();
    expect(resolved.heroHeadingColor).toBe("#ffffff");
    expect(resolved.statValueColor).toBe("#ff5500");
    expect(resolved.statLabelColor).toBe("#667788");
  });

  it("maps legacy font presets to reliable stacks", () => {
    const resolved = resolveServiceTypography({
      ...createDefaultServiceTypography(),
      headingFontPreset: "playfair_display" as never,
      bodyFontPreset: "poppins" as never,
      buttonFontPreset: "merriweather" as never,
    });
    expect(resolved.presets.headingFontPreset).toBe("editorial_serif");
    expect(resolved.presets.bodyFontPreset).toBe("modern_sans");
    expect(resolved.presets.buttonFontPreset).toBe("elegant_serif");
    expect(resolved.headingFontFamily).toContain("Palatino");
  });

  it("orders selected services and falls back to all when empty", () => {
    const services = [mockBookingService, mockOrderService];
    expect(orderPublicServicesBySelection(services, []).map((s) => s.id)).toEqual([
      mockBookingService.id,
      mockOrderService.id,
    ]);
    expect(
      orderPublicServicesBySelection(services, [mockOrderService.id, mockBookingService.id]).map(
        (s) => s.id,
      ),
    ).toEqual([mockOrderService.id, mockBookingService.id]);
  });

  it("applies theme presets onto mini_site theme colors and distinct visual moods", () => {
    const dark = applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "premium_dark");
    const white = applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "clean_white");
    expect(getServiceTemplateContent(dark).themePreset).toBe("premium_dark");
    expect(getServiceTemplateContent(white).themePreset).toBe("clean_white");
    expect(getServicePresetVisuals("premium_dark").mood).toBe("dark");
    expect(getServicePresetVisuals("clean_white").mood).toBe("light");
    expect(getServicePresetVisuals("premium_dark").heroClass).not.toEqual(
      getServicePresetVisuals("clean_white").heroClass,
    );
    expect(getServicePresetVisuals("ocean_blue").heroClass).not.toEqual(
      getServicePresetVisuals("royal_purple").heroClass,
    );
    expect(getServicePresetVisuals("warm_orange").ctaClass).not.toEqual(
      getServicePresetVisuals("clean_white").ctaClass,
    );
    expect(dark.theme.primaryColor).toBe(SERVICE_THEME_PRESETS.premium_dark.primaryColor);
  });

  it("resolves light/soft/dark background styles into distinct public classes", () => {
    const light = resolveServicePresetVisuals("modern_green", "light");
    const soft = resolveServicePresetVisuals("modern_green", "soft");
    const dark = resolveServicePresetVisuals("modern_green", "dark");
    expect(light.resolvedBackgroundStyle).toBe("light");
    expect(soft.resolvedBackgroundStyle).toBe("soft");
    expect(dark.resolvedBackgroundStyle).toBe("dark");
    expect(light.sectionAltClass).toBe("bg-slate-50");
    expect(soft.sectionAltClass).toContain("emerald");
    expect(soft.sectionAltClass).not.toEqual(light.sectionAltClass);
    expect(soft.pageBg).not.toEqual(light.pageBg);
    expect(light.pageShellClass).toBe("service-bg-light");
    expect(soft.pageShellClass).toBe("service-bg-soft");
    expect(dark.pageShellClass).toBe("service-bg-dark");
    expect(dark.pageBg).not.toEqual(light.pageBg);
    expect(dark.cardBg).toContain("bg-slate-800");
    expect(dark.pricingCardText).toBe("text-slate-50");
    expect(dark.bodyText).toBe("text-slate-50");
    expect(dark.surfaceMode).toBe("dark");
    expect(light.bodyText).toBe("text-slate-950");
    expect(light.surfaceMode).toBe("light");
  });

  it("keeps readable contrast across theme + backgroundStyle combinations", () => {
    const premiumLight = resolveServicePresetVisuals("premium_dark", "light");
    expect(premiumLight.surfaceMode).toBe("light");
    expect(premiumLight.bodyText).toBe("text-slate-950");
    expect(premiumLight.cardText).toBe("text-slate-950");
    expect(premiumLight.pricingCardText).toBe("text-slate-950");
    expect(premiumLight.pricingCardBg).toContain("bg-white");

    const premiumDark = resolveServicePresetVisuals("premium_dark", "dark");
    expect(premiumDark.surfaceMode).toBe("dark");
    expect(premiumDark.bodyText).toBe("text-slate-50");
    expect(premiumDark.cardText).toBe("text-slate-50");
    expect(premiumDark.pricingCardText).toBe("text-slate-50");

    const cleanDark = resolveServicePresetVisuals("clean_white", "dark");
    expect(cleanDark.surfaceMode).toBe("dark");
    expect(cleanDark.bodyText).toBe("text-slate-50");
    expect(cleanDark.cardText).toBe("text-slate-50");

    const royalLight = resolveServicePresetVisuals("royal_purple", "light");
    expect(royalLight.surfaceMode).toBe("light");
    expect(royalLight.bodyText).toBe("text-slate-950");
    expect(royalLight.cardText).toBe("text-slate-950");

    const royalDark = resolveServicePresetVisuals("royal_purple", "dark");
    expect(royalDark.surfaceMode).toBe("dark");
    expect(royalDark.bodyText).toBe("text-slate-50");
    expect(royalDark.cardText).toBe("text-slate-50");

    const oceanSoft = resolveServicePresetVisuals("ocean_blue", "soft");
    expect(oceanSoft.surfaceMode).toBe("light");
    expect(oceanSoft.bodyText).toBe("text-slate-950");
    expect(oceanSoft.cardText).toBe("text-slate-950");
    expect(oceanSoft.pricingCardText).toBe("text-slate-950");

    for (const preset of ["premium_dark", "royal_purple", "ocean_blue"] as const) {
      const dark = resolveServicePresetVisuals(preset, "dark");
      expect(dark.cardText).toBe("text-slate-50");
      expect(dark.sectionMainClass).not.toContain("bg-black");
      expect(dark.heroClass.length).toBeGreaterThan(0);
    }
  });

  it("round-trips service content through mini_site_config normalize", () => {
    const seeded = setServiceTemplateContent(DEFAULT_MINI_SITE_CONFIG, {
      ...createDefaultServiceTemplateContent(),
      hero: {
        ...createDefaultServiceTemplateContent().hero,
        headline: "Saved Service Headline",
      },
    });
    const normalized = normalizeMiniSiteConfig({
      ...seeded,
      theme: { ...seeded.theme, template: "service" },
    });
    expect(getServiceTemplateContent(normalized).hero.headline).toBe("Saved Service Headline");
  });
});

describe("ServiceTemplatePublicView", () => {
  it("renders all core Service sections without Coming soon", () => {
    const config = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService, mockOrderService]}
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-template", "service");
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-preset", "premium_dark");
    expect(screen.getByTestId("service-site-hero")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-services")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-how-it-works")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-why-choose-us")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-pricing")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-faq")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-contact")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-footer")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(mockBookingService.name).length).toBeGreaterThan(0);

    const cards = screen.getAllByTestId("service-site-service-card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    for (const card of cards) {
      expect(card.className).toMatch(/h-full/);
      expect(card.className).toMatch(/flex-col/);
      const cta = card.querySelector("a, button");
      expect(cta?.className).toMatch(/mt-auto/);
      expect(cta?.className).toMatch(/w-full/);
    }
    expect(screen.getByTestId("service-site-services-grid").className).toMatch(/items-stretch/);
  });

  it("hides Pricing when sectionVisibility.pricing is false", () => {
    const config = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
      templateContent: {
        service: {
          sectionVisibility: {
            ...createDefaultServiceTemplateContent().sectionVisibility,
            pricing: false,
          },
        },
      },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService]}
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("service-site-pricing")).not.toBeInTheDocument();
  });

  it("uses Clean White preset classes differently from Premium Dark", () => {
    const dark = normalizeMiniSiteConfig({
      ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "premium_dark"),
      theme: {
        ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "premium_dark").theme,
        template: "service",
      },
    });
    const { unmount } = renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={dark}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-preset", "premium_dark");
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-mood", "dark");
    unmount();

    const white = normalizeMiniSiteConfig({
      ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "clean_white"),
      theme: {
        ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "clean_white").theme,
        template: "service",
      },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={white}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-preset", "clean_white");
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-mood", "light");
  });

  it("applies light/soft/dark background style on the public layout", () => {
    const soft = normalizeMiniSiteConfig({
      ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "ocean_blue"),
      theme: {
        ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "ocean_blue").theme,
        template: "service",
        backgroundStyle: "soft",
      },
    });
    const { unmount } = renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={soft}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute(
      "data-background-style",
      "soft",
    );
    expect(screen.getByTestId("service-site-layout")).toHaveClass("service-bg-soft");
    unmount();

    const dark = normalizeMiniSiteConfig({
      ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "modern_green"),
      theme: {
        ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "modern_green").theme,
        template: "service",
        backgroundStyle: "dark",
      },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={dark}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute(
      "data-background-style",
      "dark",
    );
    expect(screen.getByTestId("service-site-layout")).toHaveClass("service-bg-dark");
  });

  it("uses a polished gradient fallback when whyChooseUs image is missing", () => {
    const config = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
      templateMedia: {},
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-why-choose-us-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("service-site-template-whyChooseUsImage")).not.toBeInTheDocument();
  });

  it("maps each Service media slot to its intended section only", () => {
    const image = (name: string) => ({
      kind: "image" as const,
      url: `/uploads/mini_site/test/${name}.webp`,
      thumbnailUrl: `/uploads/mini_site/test/${name}.webp`,
      alt: name,
      filename: `${name}.webp`,
      contentType: "image/webp",
      size: 1000,
      originalSize: 1000,
      width: 1200,
      height: 800,
    });
    const config = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
      templateMedia: {
        service: {
          heroImage: image("hero"),
          serviceImage: image("service"),
          whyChooseUsImage: image("why"),
          requestImage: image("request"),
          introVideo: {
            kind: "video",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            provider: "youtube",
            embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
            title: "Intro",
          },
        },
      },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("service-site-template-heroImage")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-template-serviceImage")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-template-whyChooseUsImage")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-template-requestImage")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-template-introVideo")).toBeInTheDocument();
    expect(screen.getByTestId("service-site-hero-overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("service-site-why-choose-us-fallback")).not.toBeInTheDocument();

    expect(
      screen.getByTestId("service-site-services").querySelector(
        "[data-testid='service-site-template-serviceImage']",
      ),
    ).not.toBeNull();
    expect(
      screen.getByTestId("service-site-why-choose-us").querySelector(
        "[data-testid='service-site-template-serviceImage']",
      ),
    ).toBeNull();
    expect(
      screen.getByTestId("service-site-hero").querySelector(
        "[data-testid='service-site-template-serviceImage']",
      ),
    ).toBeNull();
    expect(
      screen.getByTestId("service-site-services").querySelector(
        "[data-testid='service-site-template-requestImage']",
      ),
    ).toBeNull();
    expect(
      screen.getByTestId("service-site-why-choose-us").querySelector(
        "[data-testid='service-site-template-requestImage']",
      ),
    ).toBeNull();
  });

  it("hides intro video when not configured", () => {
    const config = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
      templateMedia: {},
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.queryByTestId("service-site-template-introVideo")).not.toBeInTheDocument();
  });

  it("renders Premium Dark + light with light surface text tokens", () => {
    const config = normalizeMiniSiteConfig({
      ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "premium_dark"),
      theme: {
        ...applyServiceThemePreset(DEFAULT_MINI_SITE_CONFIG, "premium_dark").theme,
        template: "service",
        backgroundStyle: "light",
      },
    });
    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute("data-surface-mode", "light");
    expect(screen.getByTestId("service-site-layout")).toHaveAttribute(
      "data-background-style",
      "light",
    );
  });
});

describe("ServiceTemplateEditor UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(
      normalizeMiniSiteConfig({
        ...DEFAULT_MINI_SITE_CONFIG,
        theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
      }),
    );
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) => config);
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 100, offset: 0 },
    } as never);
  });

  it("uses visibility switches (not checkboxes), device preview, and hides Pricing", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("service");
    renderRoute(
      <ServiceTemplateEditor
        businessId="biz-1"
        activeSectionId="pricing"
        onSelectSection={() => undefined}
        sections={sections}
        templateLabel="Service"
      />,
      { route: "/admin/mini-site", path: "/admin/mini-site" },
    );

    expect(await screen.findByTestId("service-editor")).toBeInTheDocument();
    const pricingSwitch = screen.getByTestId("service-section-visibility-pricing");
    expect(pricingSwitch).toHaveAttribute("role", "switch");
    expect(pricingSwitch.tagName.toLowerCase()).toBe("button");
    expect(pricingSwitch).not.toHaveAttribute("type", "checkbox");
    expect(screen.queryByRole("checkbox", { name: /pricing/i })).not.toBeInTheDocument();

    expect(screen.getByTestId("service-preview-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("service-preview-scroll")).toHaveAttribute("data-max-height", "700");
    expect(screen.getByTestId("service-preview-device-desktop")).toBeInTheDocument();
    expect(screen.getByTestId("service-preview-device-tablet")).toBeInTheDocument();
    expect(screen.getByTestId("service-preview-device-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-pricing")).toBeInTheDocument();

    await user.click(pricingSwitch);
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-pricing")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("service-section-hidden-banner")).toBeInTheDocument();
    expect(pricingSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(pricingSwitch);
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-pricing")).toBeInTheDocument();
    });
    expect(pricingSwitch).toHaveAttribute("aria-checked", "true");

    // Default side panel is mobile (compact phone frame)
    expect(screen.getByTestId("service-preview-viewport")).toHaveAttribute("data-device", "mobile");
    expect(screen.getByTestId("service-preview-frame")).toHaveAttribute("data-frame-width", "390");
    expect(screen.getByTestId("service-preview-frame")).toHaveAttribute("data-device-mode", "mobile");
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute(
      "data-preview-device",
      "mobile",
    );
    expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
      "data-preview-device",
      "mobile",
    );
    expect(screen.getByTestId("mini-site-preview-how-it-works").querySelector(".grid")).toHaveClass(
      "grid-cols-1",
    );
    expect(screen.getByTestId("service-desktop-preview-hint")).toBeInTheDocument();
    expect(screen.queryByTestId("service-desktop-preview-modal")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("service-preview-device-tablet"));
    expect(screen.getByTestId("service-preview-frame")).toHaveAttribute("data-frame-width", "768");
    expect(screen.getByTestId("service-preview-frame")).toHaveAttribute("data-device-mode", "tablet");
    expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
      "data-preview-device",
      "tablet",
    );
    // Side panel never hosts clipped desktop content
    expect(screen.getByTestId("service-preview-frame")).not.toHaveAttribute(
      "data-device-mode",
      "desktop",
    );

    await user.click(screen.getByTestId("service-preview-device-desktop"));
    expect(await screen.findByTestId("service-desktop-preview-modal")).toBeInTheDocument();
    expect(screen.getByTestId("service-desktop-preview-frame")).toHaveAttribute(
      "data-frame-width",
      "1120",
    );
    expect(screen.getByTestId("service-desktop-preview-frame")).toHaveAttribute(
      "data-device-mode",
      "desktop",
    );
    expect(screen.getByTestId("service-desktop-preview-scroll")).toBeInTheDocument();
    // Side panel stays mobile/tablet — not a squeezed desktop site
    expect(screen.getByTestId("service-preview-frame")).toHaveAttribute("data-device-mode", "tablet");
    expect(screen.getByTestId("service-preview-frame")).not.toHaveAttribute(
      "data-frame-width",
      "1120",
    );

    await user.click(screen.getByTestId("service-desktop-preview-close"));
    await waitFor(() => {
      expect(screen.queryByTestId("service-desktop-preview-modal")).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId("service-desktop-preview-open"));
    expect(await screen.findByTestId("service-desktop-preview-modal")).toBeInTheDocument();
    const builderGrid = screen.getByTestId("service-editor").querySelector(".grid");
    expect(builderGrid?.className).toMatch(
      /xl:grid-cols-\[220px_minmax\(420px,1fr\)_minmax\(340px,360px\)\]/,
    );
  });

  it("shows background style tooltip help without a static helper paragraph", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("service");
    renderRoute(
      <ServiceTemplateEditor
        businessId="biz-1"
        activeSectionId="settings"
        onSelectSection={() => undefined}
        sections={sections}
        templateLabel="Service"
      />,
      { route: "/admin/mini-site", path: "/admin/mini-site" },
    );

    expect(await screen.findByTestId("service-editor-background-style")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-background-style-help")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-background-style-tooltip")).toBeInTheDocument();
    expect(
      screen.queryByText(/Light = clean white\. Soft = tinted sections/i),
    ).not.toBeInTheDocument();
    await user.hover(screen.getByTestId("service-editor-background-style-help"));
    expect(screen.getByTestId("service-editor-background-style-tooltip")).toHaveTextContent(
      /Light/i,
    );
    expect(screen.getByTestId("service-editor-background-style-tooltip")).toHaveTextContent(
      /Soft/i,
    );
    expect(screen.getByTestId("service-editor-background-style-tooltip")).toHaveTextContent(
      /Dark/i,
    );
  });

  it("renders typography controls and applies fonts/colors live in preview", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("service");
    renderRoute(
      <ServiceTemplateEditor
        businessId="biz-1"
        activeSectionId="settings"
        onSelectSection={() => undefined}
        sections={sections}
        templateLabel="Service"
      />,
      { route: "/admin/mini-site", path: "/admin/mini-site" },
    );

    expect(await screen.findByTestId("service-editor-typography")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-heading-font")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-body-font")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-button-font")).toBeInTheDocument();
    expect(screen.queryByTestId("service-editor-custom-font")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId("service-editor-heading-font"), "elegant_serif");
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
        "data-heading-font",
        "elegant_serif",
      );
      expect(
        screen.getByTestId("mini-site-preview-hero-title").style.fontFamily,
      ).toMatch(/Georgia/i);
    });

    await user.selectOptions(screen.getByTestId("service-editor-body-font"), "mono_tech");
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
        "data-body-font",
        "mono_tech",
      );
      expect(screen.getByTestId("mini-site-preview-layout").style.fontFamily).toMatch(
        /Consolas|monospace/i,
      );
    });

    await user.selectOptions(screen.getByTestId("service-editor-button-font"), "custom");
    expect(await screen.findByTestId("service-editor-custom-font")).toBeInTheDocument();
    expect(screen.getByTestId("service-editor-heading-font-sample")).toHaveTextContent(
      "Professional services",
    );
    await user.clear(screen.getByTestId("service-editor-custom-font"));
    await user.type(screen.getByTestId("service-editor-custom-font"), "Avenir, Helvetica, sans-serif");
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
        "data-button-font",
        "custom",
      );
    });

    fireEvent.change(screen.getByTestId("service-editor-heading-color"), {
      target: { value: "#224466" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("service-editor-heading-color")).toHaveValue("#224466");
      expect(screen.getByTestId("mini-site-preview-typography-style").innerHTML).toContain(
        "--service-heading-color",
      );
      expect(screen.getByTestId("mini-site-preview-services-title")).toHaveStyle({
        color: "#224466",
      });
    });

    fireEvent.change(screen.getByTestId("service-editor-hero-heading-color"), {
      target: { value: "#ff0000" },
    });
    fireEvent.change(screen.getByTestId("service-editor-accent-text-color"), {
      target: { value: "#00ff00" },
    });
    fireEvent.change(screen.getByTestId("service-editor-muted-color"), {
      target: { value: "#888888" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-hero-title")).toHaveStyle({ color: "#ff0000" });
      expect(screen.getByTestId("mini-site-preview-hero-accent")).toHaveStyle({ color: "#00ff00" });
      const statValues = screen.getAllByTestId("mini-site-preview-hero-stat-value");
      expect(statValues.length).toBeGreaterThan(0);
      for (const value of statValues) {
        expect(value).toHaveStyle({ color: "#00ff00" });
      }
      const statLabels = screen.getAllByTestId("mini-site-preview-hero-stat-label");
      for (const label of statLabels) {
        expect(label).toHaveStyle({ color: "#888888" });
      }
    });

    await user.click(screen.getByTestId("service-editor-typography-reset"));
    await waitFor(() => {
      expect(screen.getByTestId("service-editor-heading-font")).toHaveValue("system_sans");
      expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
        "data-heading-font",
        "system_sans",
      );
      expect(screen.queryByTestId("service-editor-custom-font")).not.toBeInTheDocument();
      const resetValues = screen.getAllByTestId("mini-site-preview-hero-stat-value");
      for (const value of resetValues) {
        expect(value).not.toHaveStyle({ color: "#00ff00" });
      }
    });
  });

  it("save/reload preserves typography config", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("service");
    let saved: ReturnType<typeof normalizeMiniSiteConfig> | null = null;
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) => {
      saved = normalizeMiniSiteConfig(config);
      return saved;
    });

    renderRoute(
      <ServiceTemplateEditor
        businessId="biz-1"
        activeSectionId="settings"
        onSelectSection={() => undefined}
        sections={sections}
        templateLabel="Service"
      />,
      { route: "/admin/mini-site", path: "/admin/mini-site" },
    );

    expect(await screen.findByTestId("service-editor-typography")).toBeInTheDocument();
    await user.selectOptions(screen.getByTestId("service-editor-heading-font"), "display_bold");
    fireEvent.change(screen.getByTestId("service-editor-body-color"), {
      target: { value: "#334455" },
    });
    expect(screen.getByTestId("service-editor-body-color")).toHaveValue("#334455");
    await user.click(screen.getByTestId("service-editor-save"));

    await waitFor(() => {
      expect(saved).not.toBeNull();
    });
    const typography = getServiceTemplateContent(saved!).typography;
    expect(typography.headingFontPreset).toBe("display_bold");
    expect(typography.bodyColor).toBe("#334455");

    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(saved!);
    renderRoute(
      <ServiceTemplateEditor
        businessId="biz-1"
        activeSectionId="settings"
        onSelectSection={() => undefined}
        sections={sections}
        templateLabel="Service"
      />,
      { route: "/admin/mini-site", path: "/admin/mini-site" },
    );
    expect(await screen.findByTestId("service-editor-heading-font")).toHaveValue("display_bold");
    expect(screen.getByTestId("service-editor-body-color")).toHaveValue("#334455");
  });
});

describe("ServiceTemplatePublicView typography", () => {
  it("applies heading/body/hero/accent/card/button color overrides on real DOM styles", () => {
    const base = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
    });
    const config = setServiceTemplateContent(base, {
      ...getServiceTemplateContent(base),
      typography: {
        ...createDefaultServiceTypography(),
        headingFontPreset: "elegant_serif",
        bodyFontPreset: "mono_tech",
        buttonFontPreset: "display_bold",
        headingColor: "#111111",
        bodyColor: "#222222",
        mutedColor: "#333333",
        heroHeadingColor: "#abcdef",
        heroBodyColor: "#fedcba",
        accentTextColor: "#00aa55",
        buttonTextColor: "#010101",
        cardTextColor: "#020202",
      },
    });

    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService]}
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    const layout = screen.getByTestId("service-site-layout");
    expect(layout).toHaveAttribute("data-heading-font", "elegant_serif");
    expect(layout).toHaveAttribute("data-body-font", "mono_tech");
    expect(layout).toHaveAttribute("data-button-font", "display_bold");
    expect(layout).toHaveAttribute("data-has-hero-heading-color", "true");
    expect(layout).toHaveAttribute("data-has-accent-text-color", "true");
    expect(layout.style.fontFamily).toMatch(/Consolas|monospace/i);
    expect(layout.style.color).toBe("rgb(34, 34, 34)");
    expect(layout.style.getPropertyValue("--service-hero-heading-color")).toBe("#abcdef");
    expect(layout.style.getPropertyValue("--service-accent-text-color")).toBe("#00aa55");
    expect(layout.style.getPropertyValue("--service-stat-value-color")).toBe("#00aa55");
    expect(layout.style.getPropertyValue("--service-stat-label-color")).toBe("#333333");

    expect(screen.getByTestId("service-site-hero-title")).toHaveStyle({ color: "#abcdef" });
    expect(screen.getByTestId("service-site-hero-subtitle")).toHaveStyle({ color: "#fedcba" });
    expect(screen.getByTestId("service-site-hero-accent")).toHaveStyle({ color: "#00aa55" });
    expect(screen.getByTestId("service-site-services-title")).toHaveStyle({ color: "#111111" });
    expect(screen.getByTestId("service-site-services-subtitle")).toHaveStyle({ color: "#333333" });
    expect(screen.getByTestId("service-site-how-it-works-title")).toHaveStyle({ color: "#111111" });
    expect(screen.getByTestId("service-site-pricing-title")).toHaveStyle({ color: "#111111" });
    expect(screen.getByTestId("service-site-faq-title")).toHaveStyle({ color: "#111111" });

    const statValues = screen.getAllByTestId("service-site-hero-stat-value");
    expect(statValues.length).toBeGreaterThanOrEqual(4);
    for (const value of statValues) {
      expect(value).toHaveStyle({ color: "#00aa55" });
    }
    const statLabels = screen.getAllByTestId("service-site-hero-stat-label");
    for (const label of statLabels) {
      expect(label).toHaveStyle({ color: "#333333" });
    }

    const serviceCardTitle = screen
      .getByTestId("service-site-services")
      .querySelector("[data-service-card-text='true']");
    expect(serviceCardTitle).toHaveStyle({ color: "#020202" });

    const primaryCta = screen.getByTestId("service-site-book-cta");
    expect(primaryCta).toHaveStyle({ color: "#010101" });

    const css = screen.getByTestId("service-site-typography-style").innerHTML;
    expect(css).toContain("--service-heading-color");
    expect(css).toContain("--service-hero-heading-color");
    expect(css).toContain("--service-stat-value-color");
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("uses headingColor for stats values when accentTextColor is empty", () => {
    const base = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
    });
    const config = setServiceTemplateContent(base, {
      ...getServiceTemplateContent(base),
      typography: {
        ...createDefaultServiceTypography(),
        headingColor: "#445566",
        accentTextColor: "",
        mutedColor: "",
      },
    });

    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    for (const value of screen.getAllByTestId("service-site-hero-stat-value")) {
      expect(value).toHaveStyle({ color: "#445566" });
    }
  });

  it("falls back to theme tokens when color overrides are empty or invalid", () => {
    const base = normalizeMiniSiteConfig({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "service" },
    });
    const config = setServiceTemplateContent(base, {
      ...getServiceTemplateContent(base),
      typography: {
        ...createDefaultServiceTypography(),
        headingColor: "",
        heroHeadingColor: "not-a-color",
        accentTextColor: "red",
        bodyColor: "",
      },
    });

    renderRoute(
      <ServiceTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService]}
        config={config}
        testIdPrefix="service-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    const layout = screen.getByTestId("service-site-layout");
    expect(layout).toHaveAttribute("data-has-hero-heading-color", "false");
    expect(layout).toHaveAttribute("data-has-accent-text-color", "false");
    expect(layout.style.getPropertyValue("--service-hero-heading-color")).toBe("");
    expect(screen.getByTestId("service-site-hero-title").getAttribute("style") || "").not.toMatch(
      /color:\s*not-a-color/i,
    );
    // Accent falls back to theme primary (inline), not an invalid override
    expect(screen.getByTestId("service-site-hero-accent")).toHaveStyle({
      color: config.theme.primaryColor,
    });
  });
});
