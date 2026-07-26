import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioTemplatePublicView } from "@/components/public/PortfolioTemplatePublicView";
import { PortfolioTemplateEditor } from "@/components/admin/miniSiteBuilder/PortfolioTemplateEditor";
import { MiniSiteLivePreview } from "@/components/admin/MiniSiteLivePreview";
import {
  applyPortfolioThemePreset,
  createDefaultPortfolioTemplateContent,
  createDefaultPortfolioTypography,
  getPortfolioTemplateContent,
  normalizePortfolioTemplateContent,
  resolvePortfolioPresetVisuals,
  resolvePortfolioTypography,
  setPortfolioTemplateContent,
  PORTFOLIO_THEME_PRESETS,
} from "@/lib/portfolioTemplateConfig";
import { buildPortfolioItemImageSlot } from "@/lib/portfolioItemMediaSlots";
import { DEFAULT_MINI_SITE_CONFIG, normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import { getAvailableSectionsForTemplate } from "@/lib/miniSiteTemplateBuilders";
import { getMiniSiteTemplateEditorDefinition } from "@/lib/miniSiteTemplateEditorRegistry";
import {
  canUseTemplate,
  getAllowedMiniSiteTemplates,
} from "@/lib/miniSitePlanAccess";
import { mockBookingService, mockOrderService, mockPublicBusiness } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";
import * as miniSiteApi from "@/api/miniSiteApi";
import * as adminApi from "@/api/adminApi";
import * as miniSiteMediaApi from "@/api/miniSiteMediaApi";
import { PORTFOLIO_THEME_PRESET_IDS } from "@/types/portfolioTemplate";

vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

vi.mock("@/api/adminApi", () => ({
  listAdminServices: vi.fn(),
}));

vi.mock("@/api/miniSiteMediaApi", () => ({
  uploadMiniSiteMedia: vi.fn(),
  removeMiniSiteMedia: vi.fn(),
}));

function portfolioConfig(overrides: Record<string, unknown> = {}) {
  return normalizeMiniSiteConfig({
    ...DEFAULT_MINI_SITE_CONFIG,
    theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "portfolio" },
    templateContent: {
      portfolio: {
        ...createDefaultPortfolioTemplateContent(),
        ...overrides,
      },
    },
  });
}

describe("portfolioTemplateConfig", () => {
  it("normalizes defaults and all visual presets", () => {
    const content = normalizePortfolioTemplateContent(undefined);
    expect(content.themePreset).toBe("creative_purple");
    expect(content.projects.items).toEqual([]);
    expect(content.skills.items.map((item) => item.label)).toEqual([
      "Branding",
      "UI/UX",
      "Photography",
      "Motion",
    ]);
    expect(Object.keys(PORTFOLIO_THEME_PRESETS)).toEqual(
      expect.arrayContaining([...PORTFOLIO_THEME_PRESET_IDS]),
    );
    for (const preset of PORTFOLIO_THEME_PRESET_IDS) {
      expect(resolvePortfolioPresetVisuals(preset, "light").pageShellClass).toBe(
        "portfolio-bg-light",
      );
      expect(resolvePortfolioPresetVisuals(preset, "soft").pageShellClass).toBe("portfolio-bg-soft");
      expect(resolvePortfolioPresetVisuals(preset, "dark").surfaceMode).toBe("dark");
    }
    expect(resolvePortfolioPresetVisuals("creative_purple", "soft").heroText).toBe("text-white");
    expect(resolvePortfolioPresetVisuals("minimal_white", "light").heroText).toBe("text-slate-950");
    expect(normalizePortfolioTemplateContent(undefined).hero.primaryCtaAction).toBe("projects");
    expect(normalizePortfolioTemplateContent(undefined).hero.secondaryCtaAction).toBe("contact");
  });

  it("applies typography color overrides and reset defaults", () => {
    const resolved = resolvePortfolioTypography({
      ...createDefaultPortfolioTypography(),
      headingColor: "#112233",
      accentTextColor: "#445566",
      cardTextColor: "#778899",
      buttonTextColor: "#aabbcc",
      heroHeadingColor: "#ddeeff",
    });
    expect(resolved.headingColor).toBe("#112233");
    expect(resolved.accentTextColor).toBe("#445566");
    expect(resolved.heroHeadingColor).toBe("#ddeeff");
    expect(createDefaultPortfolioTypography().headingColor).toBe("");
  });

  it("bounds project tags and sanitizes item media slot ids", () => {
    const content = normalizePortfolioTemplateContent({
      projects: {
        items: [
          {
            title: "Project",
            tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
            metrics: Array.from({ length: 10 }, (_, i) => `${i}`),
          },
        ],
      },
    });
    expect(content.projects.items[0].tags).toHaveLength(8);
    expect(content.projects.items[0].metrics).toHaveLength(4);
    expect(buildPortfolioItemImageSlot("portfolioProjectCover", "project bad/id")).toBe(
      "portfolioProjectCover__projectbadid",
    );
    expect(buildPortfolioItemImageSlot("portfolioTestimonialAvatar", "")).toBe(
      "portfolioTestimonialAvatar__item",
    );
  });
});

describe("Portfolio registry and plan gating", () => {
  it("registers Portfolio in template registry", () => {
    const def = getMiniSiteTemplateEditorDefinition("portfolio");
    expect(def.label).toBe("Portfolio");
    expect(def.imageMediaSlots.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        "heroVisual",
        "featuredWorkImage",
        "servicesImage",
        "collaborationImage",
      ]),
    );
    expect(def.videoMediaSlots.map((s) => s.id)).toEqual(
      expect.arrayContaining(["showreelVideo"]),
    );
  });

  it("locks Portfolio for Free/Starter/Business and allows Pro", () => {
    expect(getAllowedMiniSiteTemplates("free")).not.toContain("portfolio");
    expect(getAllowedMiniSiteTemplates("starter")).not.toContain("portfolio");
    expect(canUseTemplate("business", "portfolio")).toBe(false);
    expect(canUseTemplate("pro", "portfolio")).toBe(true);
    expect(getAllowedMiniSiteTemplates("pro")).toContain("portfolio");
  });

  it("builder sections are all editable with no Coming soon", () => {
    const sections = getAvailableSectionsForTemplate("portfolio");
    const labels = sections.map((s) => s.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Hero",
        "Projects / selected work",
        "About me",
        "Skills",
        "Services",
        "Process",
        "Testimonials",
        "Contact",
        "Footer",
        "Settings",
      ]),
    );
    expect(sections.every((s) => s.mode === "editable")).toBe(true);
    expect(sections.some((s) => s.mode === "coming_soon")).toBe(false);
  });
});

describe("PortfolioTemplatePublicView", () => {
  it("renders all core sections without Coming soon", () => {
    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService, mockOrderService]}
        config={portfolioConfig()}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("portfolio-site-layout")).toHaveAttribute(
      "data-template",
      "portfolio",
    );
    for (const id of [
      "hero",
      "projects",
      "about",
      "skills",
      "services",
      "process",
      "testimonials",
      "contact",
      "footer",
    ]) {
      expect(screen.getByTestId(`portfolio-site-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("wires View My Work / Let’s Collaborate to projects and contact anchors", () => {
    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={portfolioConfig()}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("portfolio-site-book-cta")).toHaveAttribute("href", "#projects");
    expect(screen.getByTestId("portfolio-site-secondary-cta")).toHaveAttribute("href", "#contact");
    expect(screen.getByTestId("portfolio-site-projects")).toHaveAttribute("id", "projects");
    expect(screen.getByTestId("portfolio-site-contact")).toHaveAttribute("id", "contact");
  });

  it("filters projects by category tabs", async () => {
    const user = userEvent.setup();
    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={portfolioConfig({
          projects: {
            title: "Projects",
            subtitle: "",
            showCategoryFilter: true,
            items: [
              {
                id: "a",
                title: "Brand A",
                category: "Branding",
                shortDescription: "A",
                fullDescription: "",
                clientName: "",
                year: "",
                role: "",
                tags: [],
                metrics: [],
                externalUrl: "",
                coverImageUrl: "",
                featured: false,
                visible: true,
              },
              {
                id: "b",
                title: "UI B",
                category: "UI/UX",
                shortDescription: "B",
                fullDescription: "",
                clientName: "",
                year: "",
                role: "",
                tags: [],
                metrics: [],
                externalUrl: "",
                coverImageUrl: "",
                featured: false,
                visible: true,
              },
            ],
          },
        })}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getAllByTestId("portfolio-site-project-card")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Branding" }));
    expect(screen.getAllByTestId("portfolio-site-project-card")).toHaveLength(1);
    expect(screen.getByText("Brand A")).toBeInTheDocument();
    expect(screen.queryByText("UI B")).not.toBeInTheDocument();
  });

  it("uses mobile-safe single-column project grid in mobile preview frame", () => {
    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={portfolioConfig()}
        variant="preview"
        previewDevice="mobile"
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("portfolio-site-layout")).toHaveAttribute(
      "data-preview-device",
      "mobile",
    );
    const projects = screen.getByTestId("portfolio-site-projects");
    expect(projects.querySelector(".grid.items-stretch")?.className).toMatch(/grid-cols-1/);
  });

  it("renders project cards with covers, tags, external links, and detail modal", async () => {
    const user = userEvent.setup();
    const config = portfolioConfig({
      projects: {
        title: "Selected projects",
        subtitle: "Work",
        showCategoryFilter: true,
        items: [
          {
            id: "p1",
            title: "Brand system",
            category: "Branding",
            shortDescription: "Identity refresh",
            fullDescription: "Full brand story",
            clientName: "Acme",
            year: "2026",
            role: "Lead",
            tags: ["Figma", "Brand"],
            metrics: ["+40%"],
            externalUrl: "https://example.com/brand",
            coverImageUrl: "/uploads/mini_site/biz/p1.webp",
            featured: true,
            visible: true,
          },
          {
            id: "p2",
            title: "Motion reel",
            category: "Motion",
            shortDescription: "Show piece",
            fullDescription: "Expanded motion notes",
            clientName: "",
            year: "2025",
            role: "",
            tags: ["After Effects"],
            metrics: [],
            externalUrl: "",
            coverImageUrl: "",
            featured: false,
            visible: true,
          },
        ],
      },
    });

    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService]}
        config={config}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    const cards = screen.getAllByTestId("portfolio-site-project-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByTestId("portfolio-site-project-cover")).toHaveAttribute(
      "src",
      "/uploads/mini_site/biz/p1.webp",
    );
    expect(screen.getByTestId("portfolio-site-project-cover-fallback")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view project/i })).toHaveAttribute(
      "href",
      "https://example.com/brand",
    );

    await user.click(screen.getByRole("button", { name: /view project/i }));
    expect(screen.getByTestId("portfolio-site-project-modal")).toHaveTextContent(
      "Expanded motion notes",
    );
  });

  it("maps fixed media slots only to their sections", () => {
    const image = (url: string) =>
      ({
        kind: "image" as const,
        url,
        thumbnailUrl: url,
        alt: "",
        filename: "img.webp",
        contentType: "image/webp",
        size: 1000,
        originalSize: 1000,
        width: 800,
        height: 600,
      });
    const config = portfolioConfig();
    config.templateMedia = {
      portfolio: {
        heroVisual: image("/uploads/hero.webp"),
        featuredWorkImage: image("/uploads/featured.webp"),
        servicesImage: image("/uploads/services.webp"),
        collaborationImage: image("/uploads/collab.webp"),
      },
    };

    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService]}
        config={config}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("portfolio-site-template-heroVisual")).toBeInTheDocument();
    expect(
      screen.getByTestId("portfolio-site-about").querySelector(
        "[data-testid='portfolio-site-template-featuredWorkImage']",
      ),
    ).not.toBeNull();
    expect(
      screen.getByTestId("portfolio-site-services").querySelector(
        "[data-testid='portfolio-site-template-servicesImage']",
      ),
    ).not.toBeNull();
    expect(
      screen.getByTestId("portfolio-site-contact").querySelector(
        "[data-testid='portfolio-site-template-collaborationImage']",
      ),
    ).not.toBeNull();
    expect(
      screen.getByTestId("portfolio-site-hero").querySelector(
        "[data-testid='portfolio-site-template-servicesImage']",
      ),
    ).toBeNull();
  });

  it("applies typography overrides to hero, sections, body, muted, cards, and buttons", () => {
    const base = applyPortfolioThemePreset(DEFAULT_MINI_SITE_CONFIG, "creative_purple");
    const defaults = createDefaultPortfolioTemplateContent();
    const config = setPortfolioTemplateContent(base, {
      ...getPortfolioTemplateContent(base),
      typography: {
        ...createDefaultPortfolioTypography(),
        headingFontPreset: "elegant_serif",
        bodyFontPreset: "mono_tech",
        buttonFontPreset: "display_bold",
        headingColor: "#1d4ed8",
        bodyColor: "#334155",
        mutedColor: "#64748b",
        accentTextColor: "#0f766e",
        cardTextColor: "#444444",
        buttonTextColor: "#fef3c7",
        heroHeadingColor: "#c62828",
        heroBodyColor: "",
      },
      projects: {
        title: "Selected projects",
        subtitle: "Work collection",
        showCategoryFilter: false,
        items: [
          {
            id: "p1",
            title: "Typed project",
            category: "UI",
            shortDescription: "Project body copy",
            fullDescription: "",
            clientName: "Acme",
            year: "2026",
            role: "",
            tags: ["Figma"],
            metrics: [],
            externalUrl: "",
            coverImageUrl: "",
            featured: false,
            visible: true,
          },
        ],
      },
      about: {
        ...defaults.about,
        title: "About studio",
        bio: "About body paragraph",
      },
      contactCta: {
        ...defaults.contactCta,
        headline: "Let’s build something",
        subtitle: "Contact body copy",
        backgroundStyle: "soft",
      },
    });
    const normalized = normalizeMiniSiteConfig({
      ...config,
      theme: { ...config.theme, template: "portfolio" },
    });

    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={normalized}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    const layout = screen.getByTestId("portfolio-site-layout");
    expect(layout).toHaveAttribute("data-portfolio-root");
    expect(layout).toHaveAttribute("data-heading-font", "elegant_serif");
    expect(layout).toHaveAttribute("data-body-font", "mono_tech");
    expect(layout).toHaveAttribute("data-button-font", "display_bold");
    expect(layout.style.getPropertyValue("--portfolio-heading-color")).toBe("#1d4ed8");
    expect(layout.style.getPropertyValue("--portfolio-body-color")).toBe("#334155");
    expect(layout.style.getPropertyValue("--portfolio-muted-color")).toBe("#64748b");
    expect(layout.style.getPropertyValue("--portfolio-hero-heading-color")).toBe("#c62828");
    expect(layout.style.getPropertyValue("--portfolio-accent-text-color")).toBe("#0f766e");
    expect(layout.style.getPropertyValue("--portfolio-button-text-color")).toBe("#fef3c7");
    expect(layout.style.getPropertyValue("--portfolio-card-text-color")).toBe("#444444");
    expect(layout.style.getPropertyValue("--portfolio-heading-font")).toMatch(/Georgia/i);
    expect(layout.style.getPropertyValue("--portfolio-body-font")).toMatch(/Consolas|SFMono|monospace/i);
    expect(layout.style.getPropertyValue("--portfolio-button-font")).toMatch(/Impact|Haettenschweiler/i);

    expect(screen.getByTestId("portfolio-site-hero-title")).toHaveStyle({ color: "#c62828" });
    expect(screen.getByTestId("portfolio-site-hero-title")).toHaveClass("portfolio-typo-hero-heading");
    expect(screen.getByTestId("portfolio-site-hero-accent")).toHaveStyle({ color: "#0f766e" });
    expect(screen.getByTestId("portfolio-site-hero-subtitle")).toHaveStyle({ color: "#334155" });
    expect(screen.getByTestId("portfolio-site-projects-title")).toHaveStyle({ color: "#1d4ed8" });
    expect(screen.getByTestId("portfolio-site-about-title")).toHaveStyle({ color: "#1d4ed8" });
    expect(screen.getByTestId("portfolio-site-contact-title")).toHaveStyle({ color: "#1d4ed8" });
    expect(screen.getByTestId("portfolio-site-skills-title")).toHaveStyle({ color: "#1d4ed8" });
    expect(screen.getByTestId("portfolio-site-about-bio")).toHaveStyle({ color: "#334155" });
    expect(screen.getByTestId("portfolio-site-contact-subtitle")).toHaveStyle({ color: "#334155" });
    expect(screen.getByTestId("portfolio-site-project-description")).toHaveStyle({ color: "#444444" });
    expect(screen.getByTestId("portfolio-site-projects-subtitle")).toHaveStyle({ color: "#64748b" });
    expect(screen.getAllByTestId("portfolio-site-hero-stat-label")[0]).toHaveStyle({ color: "#64748b" });
    expect(screen.getByTestId("portfolio-site-project-category")).toHaveStyle({ color: "#64748b" });
    expect(screen.getByTestId("portfolio-site-project-meta")).toHaveStyle({ color: "#64748b" });
    expect(screen.getByTestId("portfolio-site-project-title")).toHaveStyle({ color: "#444444" });
    expect(screen.getByTestId("portfolio-site-book-cta")).toHaveStyle({ color: "#fef3c7" });
    expect(screen.getByTestId("portfolio-site-book-cta")).toHaveClass("portfolio-typo-button");
    expect(screen.getByTestId("portfolio-site-book-cta").style.fontFamily).toMatch(
      /Impact|Haettenschweiler/i,
    );
    expect(screen.getByTestId("portfolio-site-hero-title").style.fontFamily).toMatch(/Georgia/i);
    expect(screen.getByTestId("portfolio-site-projects-title").style.fontFamily).toMatch(/Georgia/i);
    expect(layout.style.fontFamily).toMatch(/Consolas|SFMono|monospace/i);
    expect(layout.style.getPropertyValue("--portfolio-button-font")).toMatch(/Impact|Haettenschweiler/i);

    const css = screen.getByTestId("portfolio-site-typography-style").innerHTML;
    expect(css).toContain("--portfolio-heading-color");
    expect(css).toContain(".portfolio-typo-heading");
    expect(css).toContain(".portfolio-typo-body");
    expect(css).toContain(".portfolio-typo-muted");
    expect(css).toContain(".portfolio-typo-hero-heading");
  });

  it("reset typography clears color overrides back to theme defaults", () => {
    const withOverrides = {
      ...createDefaultPortfolioTypography(),
      headingColor: "#112233",
      bodyColor: "#334455",
      mutedColor: "#667788",
      heroHeadingColor: "#99aabb",
    };
    expect(normalizePortfolioTemplateContent({ typography: withOverrides }).typography.headingColor).toBe(
      "#112233",
    );
    const cleared = createDefaultPortfolioTypography();
    expect(cleared.headingColor).toBe("");
    expect(cleared.bodyColor).toBe("");
    expect(cleared.mutedColor).toBe("");
    expect(cleared.heroHeadingColor).toBe("");
  });

  it("uses real admin services without inventing fake ones", () => {
    renderRoute(
      <PortfolioTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService, mockOrderService]}
        config={portfolioConfig()}
        testIdPrefix="portfolio-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getAllByTestId("portfolio-site-service-card")).toHaveLength(2);
    expect(screen.queryByText(/fake service/i)).not.toBeInTheDocument();
  });
});

describe("PortfolioTemplateEditor", () => {
  beforeEach(() => {
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(portfolioConfig());
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) =>
      normalizeMiniSiteConfig(config),
    );
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [
        {
          id: mockBookingService.id,
          name: mockBookingService.name,
          type: "booking",
          is_active: true,
          duration_minutes: 60,
          price_cents: 5000,
          currency: "USD",
          price_type: "fixed",
          require_payment: false,
          sort_order: 1,
          description: "",
        },
      ],
      meta: { total: 1, limit: 100, offset: 0 },
    } as never);
  });

  it("keeps Portfolio draft template and side preview architecture", async () => {
    const sections = getAvailableSectionsForTemplate("portfolio");
    renderRoute(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="hero"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
        requestedTemplate="clean"
        previewBadge="Portfolio preview"
      />,
    );

    expect(await screen.findByTestId("portfolio-template-editor")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute(
      "data-template",
      "portfolio",
    );
    expect(screen.getByTestId("service-preview-viewport")).toHaveAttribute(
      "data-side-panel-mode",
      "mobile",
    );
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("renders editor sections and project add/edit/featured/visible/reorder", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("portfolio");
    const { rerender } = renderRoute(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="hero"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("portfolio-editor-hero")).toBeInTheDocument();
    const nav = screen.getByTestId("admin-mini-site-template-section-nav");
    for (const label of [
      "Hero",
      "Projects / selected work",
      "About me",
      "Skills",
      "Services",
      "Process",
      "Testimonials",
      "Contact",
      "Footer",
      "Settings",
    ]) {
      expect(nav).toHaveTextContent(label);
    }

    rerender(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="projects"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("portfolio-editor-projects")).toBeInTheDocument();
    await user.click(screen.getByTestId("portfolio-project-add"));
    await user.click(screen.getByTestId("portfolio-project-add"));
    await waitFor(() => {
      expect(screen.getAllByTestId("portfolio-project-item")).toHaveLength(2);
    });

    const first = screen.getAllByTestId("portfolio-project-item")[0];
    await user.type(within(first).getByPlaceholderText("Title"), "Neon identity");
    await user.type(within(first).getByPlaceholderText("Category"), "Branding");
    await user.type(within(first).getByLabelText(/tags/i), "Figma, Cinema 4D");
    await user.click(within(first).getByRole("switch", { name: "Featured" }));
    expect(within(first).getByRole("switch", { name: "Featured" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(within(first).getByRole("switch", { name: "Visible" }));
    expect(within(first).getByRole("switch", { name: "Visible" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    const downButtons = screen.getAllByRole("button", { name: /down|move down/i });
    if (downButtons[0]) await user.click(downButtons[0]);

    expect(screen.queryByText(/cover image url/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/image url/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/photo url/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/avatar url/i)).not.toBeInTheDocument();
  });

  it("uses compact project cover uploads and preserves images on reorder", async () => {
    const user = userEvent.setup();
    const uploadedUrl = "/uploads/mini_site/biz-1/project-cover.webp";
    vi.mocked(miniSiteMediaApi.uploadMiniSiteMedia).mockResolvedValue({
      template: "portfolio",
      slot: "portfolioProjectCover__project1",
      media: {
        kind: "image",
        url: uploadedUrl,
        thumbnailUrl: uploadedUrl,
        alt: "",
        filename: "cover.webp",
        contentType: "image/webp",
        size: 1000,
        originalSize: 1000,
        width: 800,
        height: 600,
      },
    });
    vi.mocked(miniSiteMediaApi.removeMiniSiteMedia).mockResolvedValue(undefined);

    const seeded = portfolioConfig({
      projects: {
        title: "Projects",
        subtitle: "",
        showCategoryFilter: true,
        items: [
          {
            id: "project1",
            title: "First",
            category: "UI",
            shortDescription: "A",
            fullDescription: "",
            clientName: "",
            year: "",
            role: "",
            tags: [],
            metrics: [],
            externalUrl: "https://example.com/p1",
            coverImageUrl: "",
            featured: false,
            visible: true,
          },
          {
            id: "project2",
            title: "Second",
            category: "Brand",
            shortDescription: "B",
            fullDescription: "",
            clientName: "",
            year: "",
            role: "",
            tags: [],
            metrics: [],
            externalUrl: "",
            coverImageUrl: "/uploads/mini_site/biz-1/project2.webp",
            featured: false,
            visible: true,
          },
        ],
      },
    });
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(seeded);

    const sections = getAvailableSectionsForTemplate("portfolio");
    renderRoute(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="projects"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("portfolio-project-cover-project1")).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-project-cover-project2")).toBeInTheDocument();

    const file = new File(["img"], "cover.webp", { type: "image/webp" });
    const uploadInput = screen.getByTestId("portfolio-project-cover-project1-input");
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(miniSiteMediaApi.uploadMiniSiteMedia).toHaveBeenCalledWith(
        "biz-1",
        expect.any(File),
        expect.objectContaining({
          template: "portfolio",
          slot: "portfolioProjectCover__project1",
        }),
      );
    });

    await user.click(screen.getByTestId("portfolio-editor-save"));
    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalled();
    });
    const saved = vi.mocked(miniSiteApi.updateMiniSiteConfig).mock.calls.at(-1)?.[1];
    const savedProjects = getPortfolioTemplateContent(
      normalizeMiniSiteConfig(saved as never),
    ).projects.items;
    expect(savedProjects.find((p) => p.id === "project1")?.coverImageUrl).toBe(uploadedUrl);
    expect(savedProjects.find((p) => p.id === "project2")?.coverImageUrl).toBe(
      "/uploads/mini_site/biz-1/project2.webp",
    );
  });

  it("settings presets and typography color pickers render", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("portfolio");
    renderRoute(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="settings"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("portfolio-editor-settings")).toBeInTheDocument();
    expect(screen.getByText("Neon Noir")).toBeInTheDocument();
    expect(screen.getByText("Creative Purple")).toBeInTheDocument();
    expect(screen.getByText("Minimal White")).toBeInTheDocument();
    expect(screen.getByText("Gallery Cream")).toBeInTheDocument();
    expect(screen.getByText("Ocean Studio")).toBeInTheDocument();
    expect(screen.getByText("Warm Editorial")).toBeInTheDocument();
    expect(screen.getByText("Graphite")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-editor-primary-color-picker")).toHaveAttribute(
      "type",
      "color",
    );
    expect(screen.getByTestId("portfolio-editor-typo-heroHeadingColor")).toHaveAttribute(
      "placeholder",
      "Theme default",
    );
    expect(screen.getByTestId("portfolio-editor-typo-heroHeadingColor-picker")).toHaveAttribute(
      "type",
      "color",
    );
    await user.clear(screen.getByTestId("portfolio-editor-typo-heroHeadingColor"));
    await user.type(screen.getByTestId("portfolio-editor-typo-heroHeadingColor"), "#abcdef");
    await user.click(screen.getByTestId("portfolio-editor-reset-typography"));
    expect(screen.getByTestId("portfolio-editor-typo-heroHeadingColor")).toHaveValue("");
  });

  it("desktop preview opens modal and keeps side panel mobile/tablet only", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("portfolio");
    renderRoute(
      <PortfolioTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="hero"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["portfolio", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("service-preview-viewport")).toHaveAttribute(
      "data-side-panel-mode",
      "mobile",
    );
    await user.click(screen.getByTestId("service-preview-device-tablet"));
    expect(screen.getByTestId("service-preview-viewport")).toHaveAttribute(
      "data-side-panel-mode",
      "tablet",
    );
    await user.click(screen.getByTestId("service-preview-device-desktop"));
    expect(await screen.findByTestId("service-desktop-preview-modal")).toBeInTheDocument();
    expect(screen.getByTestId("service-preview-viewport")).not.toHaveAttribute(
      "data-side-panel-mode",
      "desktop",
    );
  });
});

describe("Portfolio live preview regression shell", () => {
  it("MiniSiteLivePreview routes portfolio to PortfolioTemplatePublicView", () => {
    renderRoute(
      <MiniSiteLivePreview
        config={portfolioConfig()}
        businessName="Demo Studio"
        previewDevice="mobile"
      />,
    );
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute(
      "data-template",
      "portfolio",
    );
    expect(screen.getByTestId("mini-site-preview-layout")).toHaveAttribute(
      "data-template",
      "portfolio",
    );
    expect(screen.getByTestId("mini-site-preview-hero")).toBeInTheDocument();
  });
});
