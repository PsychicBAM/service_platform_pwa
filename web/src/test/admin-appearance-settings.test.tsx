import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as miniSiteApi from "@/api/miniSiteApi";
import * as miniSiteMediaApi from "@/api/miniSiteMediaApi";
import { PublicProfileSettingsCard } from "@/components/admin/PublicProfileSettingsCard";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { BUSINESS_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

vi.mock("@/api/miniSiteMediaApi", () => ({
  uploadMiniSiteMedia: vi.fn(),
  removeMiniSiteMedia: vi.fn(),
}));

function renderAppearanceEditor(slug = "demo-biz") {
  return renderRoute(
    <PublicProfileSettingsCard
      businessId={BUSINESS_ID}
      businessName="Demo Biz"
      businessSlug={slug}
      currentPlan="pro"
    />,
    {
      route: "/admin/settings?tab=appearance",
      path: "/admin/settings",
    },
  );
}

describe("Appearance mini-site builder layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) => config);
    vi.mocked(miniSiteMediaApi.uploadMiniSiteMedia).mockResolvedValue({
      template: "clinic",
      slot: "heroImage",
      media: {
        kind: "image",
        url: "/uploads/mini_site/test/hero.webp",
        thumbnailUrl: "/uploads/mini_site/test/hero_thumb.webp",
        alt: "",
        filename: "hero.webp",
        contentType: "image/webp",
        size: 100,
        originalSize: 5000,
        width: 1600,
        height: 900,
      },
    });
    vi.mocked(miniSiteMediaApi.removeMiniSiteMedia).mockResolvedValue(undefined);
  });

  it("renders two-column editor and live preview layout", async () => {
    renderAppearanceEditor();

    await screen.findByTestId("admin-appearance-settings-page");
    expect(screen.getByTestId("admin-appearance-editor-column")).toBeInTheDocument();
    expect(screen.getByTestId("admin-appearance-preview-column")).toBeInTheDocument();
    expect(screen.getByTestId("admin-appearance-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-live-preview")).toBeInTheDocument();

    const page = screen.getByTestId("admin-appearance-settings-page");
    expect(page.className).toMatch(/lg:grid-cols-/);
    expect(screen.queryByText("Choose what appears on your Pro mini-site")).not.toBeInTheDocument();
  });

  it("keeps live preview beside the editor, not only as a trailing block", async () => {
    renderAppearanceEditor();

    const page = await screen.findByTestId("admin-appearance-settings-page");
    const editor = within(page).getByTestId("admin-appearance-editor-column");
    const preview = within(page).getByTestId("admin-appearance-preview-column");
    expect(editor.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(preview.className).not.toMatch(/order-first/);
  });

  it("puts section toggle, reorder, and collapse controls in each section header", async () => {
    renderAppearanceEditor();

    await screen.findByTestId("admin-appearance-section-active-list");
    const aboutHeader = screen
      .getAllByTestId("admin-appearance-section-header")
      .find((node) => node.getAttribute("data-section-header") === "about");
    expect(aboutHeader).toBeTruthy();
    expect(within(aboutHeader!).getByTestId("mini-site-toggle-about")).toBeInTheDocument();
    expect(within(aboutHeader!).getByTestId("mini-site-move-up-about")).toBeInTheDocument();
    expect(within(aboutHeader!).getByTestId("mini-site-move-down-about")).toBeInTheDocument();
    expect(within(aboutHeader!).getByTestId("admin-appearance-section-collapse")).toBeInTheDocument();
  });

  it("moves a disabled section to the disabled list and hides it from preview", async () => {
    const user = userEvent.setup();
    renderAppearanceEditor();

    await screen.findByTestId("mini-site-preview-about");
    await user.click(screen.getByTestId("mini-site-toggle-about"));

    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-about")).not.toBeInTheDocument();
    });

    const disabledList = screen.getByTestId("admin-appearance-section-disabled-list");
    expect(within(disabledList).getByTestId("admin-appearance-section-about")).toBeInTheDocument();
    expect(within(disabledList).getAllByTestId("admin-appearance-section-disabled").length).toBeGreaterThan(0);
  });

  it("re-enables a section back into the active list", async () => {
    const user = userEvent.setup();
    renderAppearanceEditor();

    await screen.findByTestId("mini-site-toggle-faq");
    expect(screen.getByTestId("admin-appearance-section-disabled-list")).toBeInTheDocument();

    await user.click(screen.getByTestId("mini-site-toggle-faq"));

    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-faq")).toBeInTheDocument();
    });

    const activeList = screen.getByTestId("admin-appearance-section-active-list");
    expect(within(activeList).getByTestId("admin-appearance-section-faq")).toBeInTheDocument();
  });

  it("reorders active sections with up/down and disables edge buttons", async () => {
    const user = userEvent.setup();
    renderAppearanceEditor();

    await screen.findByTestId("admin-appearance-section-active-list");

    const aboutUp = screen.getByTestId("mini-site-move-up-about");
    expect(aboutUp).toBeDisabled();

    const contactDown = screen.getByTestId("mini-site-move-down-contact");
    expect(contactDown).toBeDisabled();

    const servicesBefore = screen.getByTestId("admin-appearance-section-services");
    const aboutBefore = screen.getByTestId("admin-appearance-section-about");
    expect(aboutBefore.compareDocumentPosition(servicesBefore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByTestId("mini-site-move-up-services"));

    await waitFor(() => {
      const servicesAfter = screen.getByTestId("admin-appearance-section-services");
      const aboutAfter = screen.getByTestId("admin-appearance-section-about");
      expect(
        servicesAfter.compareDocumentPosition(aboutAfter) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("collapse hides section fields while keeping header controls", async () => {
    const user = userEvent.setup();
    renderAppearanceEditor();

    await screen.findByTestId("mini-site-about-title");
    const aboutHeader = screen
      .getAllByTestId("admin-appearance-section-header")
      .find((node) => node.getAttribute("data-section-header") === "about")!;

    await user.click(within(aboutHeader).getByTestId("admin-appearance-section-collapse"));

    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-about-title")).not.toBeInTheDocument();
    });
    expect(within(aboutHeader).getByTestId("mini-site-toggle-about")).toBeInTheDocument();
    expect(within(aboutHeader).getByTestId("mini-site-move-up-about")).toBeInTheDocument();
  });

  it("save persists section order and enabled state", async () => {
    const user = userEvent.setup();
    renderAppearanceEditor();

    await screen.findByTestId("mini-site-toggle-faq");
    await user.click(screen.getByTestId("mini-site-toggle-faq"));
    await user.click(screen.getByTestId("mini-site-move-up-services"));
    await user.click(screen.getByTestId("public-profile-save-button"));

    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalled();
    });

    const saved = vi.mocked(miniSiteApi.updateMiniSiteConfig).mock.calls.at(-1)?.[1];
    expect(saved?.sections.some((section) => section.type === "faq" && section.enabled)).toBe(true);

    const servicesOrder = saved?.sections.find((section) => section.type === "services")?.order;
    const aboutOrder = saved?.sections.find((section) => section.type === "about")?.order;
    expect(servicesOrder).toBeLessThan(aboutOrder ?? Number.POSITIVE_INFINITY);
    expect(await screen.findByTestId("admin-appearance-success")).toBeInTheDocument();
  });

  it("exposes open-in-new-tab when a public slug exists", async () => {
    renderAppearanceEditor("brite-home");
    await screen.findByTestId("admin-appearance-open-preview");
    expect(screen.getByTestId("admin-appearance-open-preview")).toHaveAttribute("href", "/b/brite-home");
  });

  it("does not overflow horizontally in a narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    renderAppearanceEditor();
    const page = await screen.findByTestId("admin-appearance-settings-page");
    expect(page.className).toMatch(/overflow|grid-cols-1|min-w-0|/);
    expect(screen.getByTestId("mini-site-editor").className).toMatch(/overflow-x-hidden/);
  });
});
