import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { AdminMiniSitePage } from "@/pages/admin/AdminMiniSitePage";
import * as adminApi from "@/api/adminApi";
import * as miniSiteApi from "@/api/miniSiteApi";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { mockAdminBusiness, mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";
import { MINI_SITE_UPGRADE_HREF } from "@/lib/miniSitePlanAccess";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi");
vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

function businessWithPlan(plan: string, public_page_variant: "standard" | "mini_site" = "standard") {
  return {
    ...mockAdminBusiness,
    public_page_variant,
    subscription: {
      ...mockAdminBusiness.subscription!,
      plan,
      status: "active" as const,
    },
  };
}

function renderMiniSitePage(
  plan: string,
  public_page_variant: "standard" | "mini_site" = "standard",
) {
  vi.mocked(adminApi.getBusiness).mockResolvedValue(businessWithPlan(plan, public_page_variant));
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminMiniSitePage />
    </AdminBusinessProvider>,
    { route: "/admin/mini-site", path: "/admin/mini-site" },
  );
}

describe("Admin Mini-site Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) => config);
    vi.mocked(adminApi.updatePublicPageVariant).mockImplementation(async (_id, variant) =>
      businessWithPlan("business", variant),
    );
  });

  it("shows Mini-site sidebar link", () => {
    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </AdminBusinessProvider>,
      { route: "/admin", path: "/admin/*" },
    );

    expect(screen.getByTestId("admin-mini-site-sidebar-link")).toHaveTextContent("Mini-site");
    expect(screen.getByTestId("admin-mini-site-sidebar-link")).toHaveAttribute(
      "href",
      "/admin/mini-site",
    );
  });

  it("renders /admin/mini-site page shell", async () => {
    renderMiniSitePage("pro");

    expect(await screen.findByTestId("admin-mini-site-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-mini-site-header")).toHaveTextContent("Mini-site Builder");
    expect(screen.getByTestId("admin-mini-site-plan-badge")).toHaveTextContent("PRO");
    expect(screen.getByTestId("admin-mini-site-status-strip")).toBeInTheDocument();
    expect(screen.getByTestId("admin-mini-site-analytics-note")).toHaveTextContent(
      "Analytics coming soon",
    );
    expect(screen.queryByText(/Visitors:\s*\d+/i)).not.toBeInTheDocument();
  });

  it("shows Default business profile as the first library option", async () => {
    renderMiniSitePage("business");

    const cards = await screen.findAllByTestId("admin-mini-site-template-card");
    expect(cards[0]).toHaveAttribute("data-template", "standard");
    expect(screen.getByTestId("admin-mini-site-template-default")).toBeInTheDocument();
    expect(screen.queryByText("Appearance settings")).not.toBeInTheDocument();
  });

  it("Free plan: Default available, Clean and other templates locked", async () => {
    renderMiniSitePage("free");

    expect(await screen.findByTestId("admin-mini-site-default-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("mini-site-editor")).not.toBeInTheDocument();

    const defaultCard = screen.getByTestId("admin-mini-site-template-default").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    expect(defaultCard).toHaveAttribute("data-locked", "false");
    expect(within(defaultCard as HTMLElement).getByTestId("admin-mini-site-template-current")).toBeInTheDocument();

    const cleanCard = screen.getByTestId("admin-mini-site-template-clean").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    expect(cleanCard).toHaveAttribute("data-locked", "true");

    const lockedCards = screen
      .getAllByTestId("admin-mini-site-template-card")
      .filter((card) => card.getAttribute("data-template") !== "standard");
    expect(lockedCards.every((card) => card.getAttribute("data-locked") === "true")).toBe(true);

    const upgradeLinks = screen.getAllByTestId("admin-mini-site-upgrade-to-pro");
    expect(upgradeLinks[0]).toHaveAttribute("href", MINI_SITE_UPGRADE_HREF);
  });

  it("Starter plan matches Free for Default / locked templates", async () => {
    renderMiniSitePage("starter");

    expect(await screen.findByTestId("admin-mini-site-default-preview")).toBeInTheDocument();
    const defaultCard = screen.getByTestId("admin-mini-site-template-default").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    expect(defaultCard).toHaveAttribute("data-locked", "false");
    const lockedCards = screen
      .getAllByTestId("admin-mini-site-template-card")
      .filter((card) => card.getAttribute("data-template") !== "standard");
    expect(lockedCards.every((card) => card.getAttribute("data-locked") === "true")).toBe(true);
  });

  it("Business plan: Default and Clean selectable; other templates locked", async () => {
    const user = userEvent.setup();
    renderMiniSitePage("business", "mini_site");

    expect(await screen.findByTestId("admin-mini-site-editor-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("mini-site-editor")).toBeInTheDocument();

    const defaultCard = screen.getByTestId("admin-mini-site-template-default").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    const cleanCard = screen.getByTestId("admin-mini-site-template-clean").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    expect(defaultCard).toHaveAttribute("data-locked", "false");
    expect(cleanCard).toHaveAttribute("data-locked", "false");

    const lockedCards = screen
      .getAllByTestId("admin-mini-site-template-card")
      .filter(
        (card) =>
          card.getAttribute("data-template") !== "clean" &&
          card.getAttribute("data-template") !== "standard",
      );
    expect(lockedCards.length).toBeGreaterThan(0);
    expect(lockedCards.every((card) => card.getAttribute("data-locked") === "true")).toBe(true);

    const templateSelect = await screen.findByTestId("mini-site-template");
    expect(templateSelect).toHaveValue("clean");

    const serviceCard = lockedCards.find((card) => card.getAttribute("data-template") === "service");
    expect(serviceCard).toBeTruthy();
    await user.click(within(serviceCard!).getByTestId("admin-mini-site-template-locked"));
    expect(templateSelect).toHaveValue("clean");
  });

  it("lets Business save Clean and shows live Clean preview", async () => {
    const user = userEvent.setup();
    renderMiniSitePage("business", "mini_site");

    expect(await screen.findByTestId("mini-site-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute("data-template", "clean");
    expect(screen.getByTestId("mini-site-preview-hero-title")).toBeInTheDocument();

    await user.clear(await screen.findByTestId("mini-site-hero-title"));
    await user.type(screen.getByTestId("mini-site-hero-title"), "Business Clean Hero");
    expect(screen.getByTestId("mini-site-preview-hero-title")).toHaveTextContent("Business Clean Hero");

    await user.click(screen.getByTestId("public-profile-save-button"));
    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalled();
    });
    const saved = vi.mocked(miniSiteApi.updateMiniSiteConfig).mock.calls.at(-1)?.[1];
    expect(saved?.theme.template).toBe("clean");
    expect(await screen.findByTestId("mini-site-editor-save-success")).toBeInTheDocument();
  });

  it("Business can switch to Default without deleting mini_site_config", async () => {
    const user = userEvent.setup();
    const customConfig = {
      ...DEFAULT_MINI_SITE_CONFIG,
      copy: {
        ...DEFAULT_MINI_SITE_CONFIG.copy,
        heroBadgeText: "KeepMe",
      },
    };
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(customConfig);
    renderMiniSitePage("business", "mini_site");

    expect(await screen.findByTestId("mini-site-editor")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-mini-site-select-default"));
    expect(await screen.findByTestId("admin-mini-site-default-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("mini-site-editor")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("admin-mini-site-default-save"));
    await waitFor(() => {
      expect(adminApi.updatePublicPageVariant).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        "standard",
      );
    });
    expect(miniSiteApi.updateMiniSiteConfig).not.toHaveBeenCalled();
    expect(vi.mocked(miniSiteApi.getMiniSiteConfig)).toHaveBeenCalled();
  });

  it("Clean → Default → Clean keeps existing config available", async () => {
    const user = userEvent.setup();
    const customConfig = {
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "clean" as const },
      copy: {
        ...DEFAULT_MINI_SITE_CONFIG.copy,
        heroBadgeText: "PreservedClean",
      },
    };
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(customConfig);
    renderMiniSitePage("business", "mini_site");

    expect(await screen.findByTestId("mini-site-hero-title")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-mini-site-select-default"));
    expect(await screen.findByTestId("admin-mini-site-default-preview")).toBeInTheDocument();

    const cleanCard = screen.getByTestId("admin-mini-site-template-clean").closest(
      "[data-testid=admin-mini-site-template-card]",
    );
    await user.click(within(cleanCard as HTMLElement).getByRole("button", { name: /Use template/i }));
    expect(await screen.findByTestId("mini-site-editor")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute("data-template", "clean");
  });

  it("coerces Business editor to Clean when stored template is locked", async () => {
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: {
        ...DEFAULT_MINI_SITE_CONFIG.theme,
        template: "service",
      },
    });
    renderMiniSitePage("business", "mini_site");

    expect(await screen.findByTestId("mini-site-template")).toHaveValue("clean");
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute("data-template", "clean");
    expect(screen.getByTestId("admin-mini-site-locked-template-warning")).toBeInTheDocument();
  });

  it("unlocks Default, Clean, and all templates for Pro", async () => {
    renderMiniSitePage("pro", "mini_site");

    expect(await screen.findByTestId("mini-site-editor")).toBeInTheDocument();
    expect(screen.getByTestId("admin-mini-site-upgrade-banner")).toHaveAttribute("data-plan", "pro");
    const cards = screen.getAllByTestId("admin-mini-site-template-card");
    expect(cards.every((card) => card.getAttribute("data-locked") === "false")).toBe(true);
    expect(screen.queryByTestId("admin-mini-site-template-locked")).not.toBeInTheDocument();
  });

  it("routes upgrade CTA to Payments & Billing", async () => {
    renderMiniSitePage("free");

    const links = await screen.findAllByTestId("admin-mini-site-upgrade-to-pro");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/admin/settings?tab=payments");
    }
  });

  it("shows real public link and QR when slug exists", async () => {
    renderMiniSitePage("pro");

    expect(await screen.findByTestId("admin-mini-site-public-link")).toBeInTheDocument();
    expect(screen.getByTestId("admin-mini-site-qr-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-mini-site-view-button")).toHaveAttribute(
      "href",
      `/b/${mockAdminBusiness.slug}`,
    );
    expect(screen.getByTestId("admin-mini-site-preview-button")).toBeEnabled();
    expect(screen.getByTestId("admin-mini-site-share-button")).toBeEnabled();
  });
});
