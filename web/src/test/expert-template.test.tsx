import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpertTemplatePublicView } from "@/components/public/ExpertTemplatePublicView";
import { ExpertTemplateEditor } from "@/components/admin/miniSiteBuilder/ExpertTemplateEditor";
import {
  applyExpertThemePreset,
  createDefaultExpertTemplateContent,
  createDefaultExpertTypography,
  getExpertTemplateContent,
  normalizeExpertTemplateContent,
  resolveExpertPresetVisuals,
  resolveExpertTypography,
  setExpertTemplateContent,
  EXPERT_THEME_PRESETS,
} from "@/lib/expertTemplateConfig";
import { buildExpertItemImageSlot } from "@/lib/expertItemMediaSlots";
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
import { EXPERT_THEME_PRESET_IDS } from "@/types/expertTemplate";

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

function expertConfig(overrides: Record<string, unknown> = {}) {
  return normalizeMiniSiteConfig({
    ...DEFAULT_MINI_SITE_CONFIG,
    theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "expert" },
    templateContent: {
      expert: {
        ...createDefaultExpertTemplateContent(),
        ...overrides,
      },
    },
  });
}

describe("expertTemplateConfig", () => {
  it("normalizes missing expert content and resolves all presets", () => {
    const content = normalizeExpertTemplateContent(undefined);
    expect(content.themePreset).toBe("calm_green");
    expect(content.articles.items).toEqual([]);
    expect(content.works.items).toEqual([]);
    expect(content.testimonials.items).toEqual([]);
    expect(Object.keys(EXPERT_THEME_PRESETS)).toEqual(
      expect.arrayContaining([...EXPERT_THEME_PRESET_IDS]),
    );
    for (const id of EXPERT_THEME_PRESET_IDS) {
      const visuals = resolveExpertPresetVisuals(id, "light");
      expect(visuals.cardText).toBeTruthy();
      expect(visuals.bodyText).toBeTruthy();
      expect(resolveExpertPresetVisuals(id, "soft").surfaceMode).toBe("light");
      expect(resolveExpertPresetVisuals(id, "dark").surfaceMode).toBe("dark");
    }
  });

  it("applies typography color overrides", () => {
    const resolved = resolveExpertTypography({
      ...createDefaultExpertTypography(),
      headingColor: "#112233",
      accentTextColor: "#445566",
      cardTextColor: "#778899",
      buttonTextColor: "#aabbcc",
    });
    expect(resolved.headingColor).toBe("#112233");
    expect(resolved.accentTextColor).toBe("#445566");
  });
});

describe("Expert registry and plan gating", () => {
  it("registers Expert in template registry", () => {
    const def = getMiniSiteTemplateEditorDefinition("expert");
    expect(def.label).toBe("Expert");
    expect(def.imageMediaSlots.map((s) => s.id)).toEqual(
      expect.arrayContaining(["profileImage", "heroImage", "servicesImage", "bookingImage"]),
    );
  });

  it("locks Expert for Free/Starter/Business and allows Pro", () => {
    expect(getAllowedMiniSiteTemplates("free")).not.toContain("expert");
    expect(getAllowedMiniSiteTemplates("starter")).not.toContain("expert");
    expect(canUseTemplate("business", "expert")).toBe(false);
    expect(canUseTemplate("pro", "expert")).toBe(true);
    expect(getAllowedMiniSiteTemplates("pro")).toContain("expert");
  });

  it("builder sections are all editable with no Coming soon", () => {
    const sections = getAvailableSectionsForTemplate("expert");
    const labels = sections.map((s) => s.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Hero",
        "About",
        "Services",
        "Expertise",
        "Process",
        "Results",
        "Articles",
        "Works",
        "Reviews",
        "FAQ",
        "Contact",
        "Footer",
        "Settings",
      ]),
    );
    expect(sections.every((s) => s.mode === "editable")).toBe(true);
    expect(sections.some((s) => s.mode === "coming_soon")).toBe(false);
  });
});

describe("ExpertTemplatePublicView", () => {
  it("renders all core sections without Coming soon", () => {
    renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService, mockOrderService]}
        config={expertConfig()}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("expert-site-layout")).toHaveAttribute("data-template", "expert");
    for (const id of [
      "hero",
      "about",
      "services",
      "expertise",
      "process",
      "results",
      "articles",
      "works",
      "testimonials",
      "faq",
      "contact",
      "footer",
    ]) {
      expect(screen.getByTestId(`expert-site-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("uses real services with equal-height cards and bottom CTA", () => {
    renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        services={[mockBookingService, mockOrderService]}
        config={expertConfig()}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    const cards = screen.getAllByTestId("expert-site-service-card");
    expect(cards.length).toBe(2);
    for (const card of cards) {
      expect(card.className).toMatch(/h-full/);
      const cta = card.querySelector("a, button");
      expect(cta?.className).toMatch(/mt-auto/);
    }
    expect(screen.getByTestId("expert-site-services-grid").className).toMatch(/items-stretch/);
    expect(screen.getAllByTestId("expert-site-service-card-fallback").length).toBeGreaterThan(0);
  });

  it("renders article and work cards with links and compact empty states", () => {
    const withContent = expertConfig({
      articles: {
        title: "Articles",
        subtitle: "Sub",
        items: [
          {
            id: "a1",
            title: "External piece",
            type: "article",
            category: "Growth",
            date: "2026-01-01",
            excerpt: "Short excerpt",
            body: "Body",
            externalUrl: "https://example.com/post",
            readingTime: "5 min",
            featured: true,
            coverImageUrl: "",
            visible: true,
          },
          {
            id: "a2",
            title: "Inline piece",
            type: "guide",
            category: "Guide",
            date: "2026-02-01",
            excerpt: "Another",
            body: "Full body text",
            externalUrl: "",
            readingTime: "",
            featured: false,
            coverImageUrl: "",
            visible: true,
          },
        ],
      },
      works: {
        title: "Works",
        subtitle: "Sub",
        items: [
          {
            id: "w1",
            title: "Case A",
            clientName: "Acme",
            category: "Coaching",
            year: "2025",
            shortDescription: "Short",
            challenge: "Challenge",
            result: "+40% bookings",
            linkUrl: "https://example.com/case",
            coverImageUrl: "",
            metrics: ["+40% bookings", "3 months"],
            visible: true,
          },
        ],
      },
    });

    const { unmount } = renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={withContent}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getAllByTestId("expert-site-article-card").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId("expert-site-article-cover-fallback").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Read more/ })).toHaveAttribute(
      "href",
      "https://example.com/post",
    );
    expect(screen.getByTestId("expert-site-work-card")).toBeInTheDocument();
    expect(screen.getByTestId("expert-site-work-cover-fallback")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View case/ })).toHaveAttribute(
      "href",
      "https://example.com/case",
    );
    expect(screen.getAllByText("+40% bookings").length).toBeGreaterThan(0);
    unmount();

    renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={expertConfig()}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("expert-site-articles-empty")).toHaveTextContent(
      /Articles and publications will appear here soon/i,
    );
    expect(screen.getByTestId("expert-site-works-empty")).toHaveTextContent(
      /Works and case studies will appear here soon/i,
    );
  });

  it("renders manual testimonials and compact empty reviews state", () => {
    const withManual = expertConfig({
      testimonials: {
        title: "Reviews",
        subtitle: "Sub",
        source: "manual",
        maxCount: 6,
        showRating: true,
        items: [
          {
            id: "t1",
            name: "Jordan",
            role: "Founder",
            quote: "Clear and practical guidance.",
            rating: 5,
            date: "2026-03-01",
            avatarInitials: "J",
            avatarUrl: "",
            visible: true,
          },
        ],
      },
    });
    const { unmount } = renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={withManual}
        reviews={[]}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("expert-site-testimonial-card")).toHaveTextContent(
      /Clear and practical guidance/i,
    );
    expect(screen.getByTestId("expert-site-testimonial-initials")).toHaveTextContent("J");
    unmount();

    renderRoute(
      <ExpertTemplatePublicView
        business={{ ...mockPublicBusiness, average_rating: null, review_count: 0 }}
        publicSlug="demo-business"
        config={expertConfig({
          testimonials: {
            ...createDefaultExpertTemplateContent().testimonials,
            source: "approved",
            items: [],
          },
        })}
        reviews={[]}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("expert-site-testimonials-empty")).toHaveTextContent(
      /Reviews will appear here after clients leave feedback/i,
    );
  });

  it("maps media slots to intended sections only", () => {
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
      ...expertConfig(),
      templateMedia: {
        expert: {
          profileImage: image("profile"),
          heroImage: image("hero"),
          servicesImage: image("services"),
          bookingImage: image("booking"),
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
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={config}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("expert-site-template-heroImage")).toBeInTheDocument();
    expect(screen.getByTestId("expert-site-template-profileImage")).toBeInTheDocument();
    expect(screen.getByTestId("expert-site-template-servicesImage")).toBeInTheDocument();
    expect(screen.getByTestId("expert-site-template-bookingImage")).toBeInTheDocument();
    expect(screen.getByTestId("expert-site-template-introVideo")).toBeInTheDocument();

    expect(
      screen.getByTestId("expert-site-services").querySelector(
        "[data-testid='expert-site-template-bookingImage']",
      ),
    ).toBeNull();
    expect(
      screen.getByTestId("expert-site-contact").querySelector(
        "[data-testid='expert-site-template-servicesImage']",
      ),
    ).toBeNull();
  });

  it("applies typography overrides to hero and cards", () => {
    const base = applyExpertThemePreset(DEFAULT_MINI_SITE_CONFIG, "calm_green");
    const config = setExpertTemplateContent(base, {
      ...getExpertTemplateContent(base),
      typography: {
        ...createDefaultExpertTypography(),
        headingColor: "#111111",
        accentTextColor: "#222222",
        bodyColor: "#333333",
        cardTextColor: "#444444",
        buttonTextColor: "#555555",
        heroHeadingColor: "#666666",
      },
      articles: {
        title: "A",
        subtitle: "B",
        items: [
          {
            id: "a1",
            title: "Typed article",
            type: "article",
            category: "Cat",
            date: "2026",
            excerpt: "Ex",
            body: "Body",
            externalUrl: "",
            readingTime: "",
            featured: false,
            coverImageUrl: "",
            visible: true,
          },
        ],
      },
    });
    const normalized = normalizeMiniSiteConfig({
      ...config,
      theme: { ...config.theme, template: "expert" },
    });
    renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={normalized}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );
    expect(screen.getByTestId("expert-site-hero-title")).toHaveStyle({ color: "#666666" });
    expect(screen.getByTestId("expert-site-hero-accent")).toHaveStyle({ color: "#222222" });
    expect(screen.getByTestId("expert-site-about-title")).toHaveStyle({ color: "#111111" });
  });
});

describe("ExpertTemplateEditor", () => {
  beforeEach(() => {
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(expertConfig());
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) =>
      normalizeMiniSiteConfig(config),
    );
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      items: [
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
      total: 1,
    } as never);
  });

  it("keeps Expert draft template even when requestedTemplate is stale", async () => {
    const sections = getAvailableSectionsForTemplate("expert");
    renderRoute(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="hero"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
        requestedTemplate="clean"
        previewBadge="Expert preview"
      />,
    );
    expect(await screen.findByTestId("expert-editor")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute("data-template", "expert");
    expect(screen.getByTestId("service-preview-viewport")).toHaveAttribute(
      "data-side-panel-mode",
      "mobile",
    );
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute(
      "data-preview-device",
      "mobile",
    );
  });

  it("renders section navigation and article CRUD", async () => {
    const user = userEvent.setup();
    const sections = getAvailableSectionsForTemplate("expert");
    let active = "hero";
    const { rerender } = renderRoute(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId={active}
        onSelectSection={(id) => {
          active = id;
        }}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
        previewBadge="Expert preview"
      />,
    );

    expect(await screen.findByTestId("expert-editor")).toBeInTheDocument();
    const nav = screen.getByTestId("admin-mini-site-template-section-nav");
    expect(nav).toHaveTextContent("Articles");
    expect(nav).toHaveTextContent("Works");
    expect(nav).toHaveTextContent("Reviews");
    expect(nav).not.toHaveTextContent("Soon");
    expect(screen.getByTestId("service-preview-viewport")).toBeInTheDocument();

    const articlesNav = screen
      .getAllByTestId("admin-mini-site-builder-section")
      .find((el) => el.getAttribute("data-section") === "articles");
    expect(articlesNav).toBeTruthy();
    await user.click(articlesNav!);

    rerender(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="articles"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("expert-editor")).toHaveAttribute("data-section", "articles");
    await user.click(screen.getByTestId("expert-article-add"));
    await waitFor(() => {
      expect(screen.getAllByTestId("expert-article-item").length).toBeGreaterThan(0);
    });
  });

  it("uses compact image uploads instead of Cover/Avatar URL fields", async () => {
    const user = userEvent.setup();
    const uploadedUrl = "/uploads/mini_site/biz-1/article-cover.webp";
    vi.mocked(miniSiteMediaApi.uploadMiniSiteMedia).mockResolvedValue({
      template: "expert",
      slot: "articleCover__article1",
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

    const seeded = expertConfig({
      articles: {
        title: "Articles",
        subtitle: "",
        items: [
          {
            id: "article1",
            title: "Seeded article",
            type: "article",
            category: "",
            date: "",
            excerpt: "",
            body: "",
            externalUrl: "https://example.com/seeded",
            readingTime: "",
            featured: false,
            coverImageUrl: "",
            visible: true,
          },
        ],
      },
      works: {
        title: "Works",
        subtitle: "",
        items: [
          {
            id: "work1",
            title: "Seeded work",
            clientName: "",
            category: "",
            year: "",
            shortDescription: "",
            challenge: "",
            result: "",
            linkUrl: "https://example.com/work",
            coverImageUrl: "/uploads/mini_site/biz-1/work-a.webp",
            metrics: [],
            visible: true,
          },
          {
            id: "work2",
            title: "Second work",
            clientName: "",
            category: "",
            year: "",
            shortDescription: "",
            challenge: "",
            result: "",
            linkUrl: "",
            coverImageUrl: "/uploads/mini_site/biz-1/work-b.webp",
            metrics: [],
            visible: true,
          },
        ],
      },
      testimonials: {
        ...createDefaultExpertTemplateContent().testimonials,
        source: "manual",
        items: [
          {
            id: "testimonial1",
            name: "Alex",
            role: "CEO",
            quote: "Great help.",
            rating: 5,
            date: "",
            avatarInitials: "A",
            avatarUrl: "",
            visible: true,
          },
        ],
      },
    });
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(seeded);

    const sections = getAvailableSectionsForTemplate("expert");
    const { rerender } = renderRoute(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="articles"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
      />,
    );

    expect(await screen.findByTestId("expert-article-cover-article1")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Cover image URL/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Image URL/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Avatar URL/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("External URL")).toHaveValue("https://example.com/seeded");

    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", { type: "image/png" });
    await user.upload(screen.getByTestId("expert-article-cover-article1-input"), file);
    await waitFor(() => {
      expect(miniSiteMediaApi.uploadMiniSiteMedia).toHaveBeenCalledWith(
        "biz-1",
        file,
        expect.objectContaining({
          template: "expert",
          slot: buildExpertItemImageSlot("articleCover", "article1"),
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("expert-article-cover-article1").querySelector("img")).toHaveAttribute(
        "src",
        uploadedUrl,
      );
    });
    expect(screen.getByTestId("service-preview-viewport")).toBeInTheDocument();
    await waitFor(() => {
      const preview = screen.getByTestId("service-preview-viewport");
      expect(within(preview).getByTestId("mini-site-preview-article-cover")).toHaveAttribute(
        "src",
        uploadedUrl,
      );
    });

    await user.click(screen.getByTestId("expert-article-cover-article1-remove"));
    await waitFor(() => {
      expect(miniSiteMediaApi.removeMiniSiteMedia).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("expert-article-cover-article1").querySelector("img")).toBeNull();
    });

    rerender(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="works"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
      />,
    );
    expect(await screen.findByTestId("expert-work-cover-work1")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Link URL")[0]).toHaveValue("https://example.com/work");
    expect(screen.queryByPlaceholderText(/Cover image URL/i)).not.toBeInTheDocument();

    const workItems = screen.getAllByTestId("expert-work-item");
    expect(within(workItems[0]).getByTestId("expert-work-cover-work1").querySelector("img")).toHaveAttribute(
      "src",
      "/uploads/mini_site/biz-1/work-a.webp",
    );
    expect(within(workItems[1]).getByTestId("expert-work-cover-work2").querySelector("img")).toHaveAttribute(
      "src",
      "/uploads/mini_site/biz-1/work-b.webp",
    );
    await user.click(within(workItems[1]).getByRole("button", { name: /Move up/i }));
    const reordered = screen.getAllByTestId("expert-work-item");
    expect(within(reordered[0]).getByTestId("expert-work-cover-work2").querySelector("img")).toHaveAttribute(
      "src",
      "/uploads/mini_site/biz-1/work-b.webp",
    );
    expect(within(reordered[1]).getByTestId("expert-work-cover-work1").querySelector("img")).toHaveAttribute(
      "src",
      "/uploads/mini_site/biz-1/work-a.webp",
    );

    rerender(
      <ExpertTemplateEditor
        businessId="biz-1"
        businessName="Demo"
        activeSectionId="testimonials"
        onSelectSection={() => undefined}
        sections={sections}
        allowedTemplates={["expert", "service", "clean"]}
      />,
    );
    expect(await screen.findByTestId("expert-testimonial-avatar-testimonial1")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Avatar URL/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Save changes/i }));
    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalled();
    });
    const saved = vi.mocked(miniSiteApi.updateMiniSiteConfig).mock.calls.at(-1)?.[1];
    const expert = getExpertTemplateContent(normalizeMiniSiteConfig(saved!));
    expect(expert.works.items.map((item) => item.id)).toEqual(["work2", "work1"]);
    expect(expert.works.items[0].coverImageUrl).toBe("/uploads/mini_site/biz-1/work-b.webp");
    expect(expert.works.items[1].coverImageUrl).toBe("/uploads/mini_site/biz-1/work-a.webp");
    expect(expert.articles.items[0].externalUrl).toBe("https://example.com/seeded");
  });
});

describe("Expert public uploaded images", () => {
  it("renders uploaded article/work covers and testimonial avatars", () => {
    const withMedia = expertConfig({
      articles: {
        title: "Articles",
        subtitle: "",
        items: [
          {
            id: "a1",
            title: "Covered article",
            type: "article",
            category: "",
            date: "",
            excerpt: "Excerpt",
            body: "",
            externalUrl: "https://example.com/a",
            readingTime: "",
            featured: true,
            coverImageUrl: "/uploads/mini_site/1/article.webp",
            visible: true,
          },
        ],
      },
      works: {
        title: "Works",
        subtitle: "",
        items: [
          {
            id: "w1",
            title: "Covered work",
            clientName: "",
            category: "",
            year: "",
            shortDescription: "",
            challenge: "",
            result: "",
            linkUrl: "",
            coverImageUrl: "/uploads/mini_site/1/work.webp",
            metrics: [],
            visible: true,
          },
        ],
      },
      testimonials: {
        title: "Reviews",
        subtitle: "",
        source: "manual",
        maxCount: 6,
        showRating: true,
        items: [
          {
            id: "t1",
            name: "Sam",
            role: "Lead",
            quote: "Excellent.",
            rating: 5,
            date: "",
            avatarInitials: "S",
            avatarUrl: "/uploads/mini_site/1/avatar.webp",
            visible: true,
          },
        ],
      },
    });

    renderRoute(
      <ExpertTemplatePublicView
        business={mockPublicBusiness}
        publicSlug="demo-business"
        config={withMedia}
        reviews={[]}
        testIdPrefix="expert-site"
      />,
      { route: "/b/demo-business", path: "/b/:slug" },
    );

    expect(screen.getByTestId("expert-site-article-cover")).toHaveAttribute(
      "src",
      "/uploads/mini_site/1/article.webp",
    );
    expect(screen.getByTestId("expert-site-work-cover")).toHaveAttribute(
      "src",
      "/uploads/mini_site/1/work.webp",
    );
    expect(screen.getByTestId("expert-site-testimonial-avatar")).toHaveAttribute(
      "src",
      "/uploads/mini_site/1/avatar.webp",
    );
    expect(screen.getByRole("link", { name: /Read more/ })).toHaveAttribute(
      "href",
      "https://example.com/a",
    );
  });
});
