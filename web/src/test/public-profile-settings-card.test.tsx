import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as miniSiteApi from "@/api/miniSiteApi";
import {
  PublicProfileSettingsCard,
  PUBLIC_PROFILE_DESCRIPTION,
  PUBLIC_PROFILE_ON_PRO_MESSAGE,
  PUBLIC_PROFILE_COMING_SOON_MESSAGE,
} from "@/components/admin/PublicProfileSettingsCard";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { BUSINESS_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

function renderPublicProfileCard(currentPlan?: string) {
  return renderRoute(
    <PublicProfileSettingsCard businessId={BUSINESS_ID} currentPlan={currentPlan} />,
    {
      route: "/admin/settings",
      path: "/admin/settings",
    },
  );
}

describe("PublicProfileSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockImplementation(async (_id, config) => config);
  });

  it("renders title and description", async () => {
    renderPublicProfileCard("business");

    expect(screen.getByTestId("public-profile-settings-card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public profile" })).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_PROFILE_DESCRIPTION)).toBeInTheDocument();
    await screen.findByTestId("mini-site-editor");
  });

  it("shows Pro-positive message when currentPlan is pro", async () => {
    renderPublicProfileCard("pro");

    expect(screen.getByTestId("public-profile-plan-message")).toHaveTextContent(
      PUBLIC_PROFILE_ON_PRO_MESSAGE,
    );
    expect(screen.getByTestId("public-profile-badge-pro")).toHaveTextContent("Pro");
    expect(screen.queryByTestId("public-profile-badge-coming-soon")).not.toBeInTheDocument();
    await screen.findByTestId("mini-site-editor");
  });

  it("shows coming-soon message when currentPlan is business", async () => {
    renderPublicProfileCard("business");

    expect(screen.getByTestId("public-profile-plan-message")).toHaveTextContent(
      PUBLIC_PROFILE_COMING_SOON_MESSAGE,
    );
    expect(screen.getByTestId("public-profile-badge-coming-soon")).toHaveTextContent("Coming soon");
    await screen.findByTestId("mini-site-editor");
  });

  it("loads mini-site config from API", async () => {
    renderPublicProfileCard("pro");

    await waitFor(() => {
      expect(miniSiteApi.getMiniSiteConfig).toHaveBeenCalledWith(BUSINESS_ID);
    });
    expect(await screen.findByTestId("mini-site-hero-title")).toHaveValue("Welcome");
  });

  it("renders editable theme and content fields", async () => {
    renderPublicProfileCard("starter");

    expect(await screen.findByTestId("mini-site-template")).toBeEnabled();
    expect(screen.getByTestId("mini-site-primary-color")).toBeEnabled();
    expect(screen.getByTestId("mini-site-accent-color")).toBeEnabled();
    expect(screen.getByTestId("mini-site-background-style")).toBeEnabled();
    expect(screen.getByTestId("mini-site-button-style")).toBeEnabled();
    expect(screen.getByTestId("mini-site-hero-title")).toBeEnabled();
    expect(screen.getByTestId("mini-site-hero-subtitle")).toBeEnabled();
    expect(screen.getByTestId("mini-site-hero-body")).toBeEnabled();
    expect(screen.getByTestId("mini-site-about-title")).toBeEnabled();
    expect(screen.getByTestId("mini-site-about-body")).toBeEnabled();
    expect(screen.getByTestId("mini-site-website")).toBeEnabled();
    expect(screen.getByTestId("mini-site-instagram")).toBeEnabled();
  });

  it("lets the user update hero, about, and social fields", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-hero-title");
    await user.clear(screen.getByTestId("mini-site-hero-title"));
    await user.type(screen.getByTestId("mini-site-hero-title"), "Our studio");
    await user.clear(screen.getByTestId("mini-site-about-body"));
    await user.type(screen.getByTestId("mini-site-about-body"), "Family owned since 2010.");
    await user.type(screen.getByTestId("mini-site-website"), "https://studio.example");

    expect(screen.getByTestId("mini-site-hero-title")).toHaveValue("Our studio");
    expect(screen.getByTestId("mini-site-about-body")).toHaveValue("Family owned since 2010.");
    expect(screen.getByTestId("mini-site-website")).toHaveValue("https://studio.example");
  });

  it("save calls updateMiniSiteConfig with updated config", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-hero-title");
    await user.clear(screen.getByTestId("mini-site-hero-title"));
    await user.type(screen.getByTestId("mini-site-hero-title"), "Saved hero");
    await user.click(screen.getByTestId("public-profile-save-button"));

    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalledWith(
        BUSINESS_ID,
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ type: "hero", title: "Saved hero" }),
          ]),
        }),
      );
    });
    expect(await screen.findByTestId("mini-site-editor-save-success")).toBeInTheDocument();
  });

  it("shows loading state while config loads", () => {
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockReturnValue(new Promise(() => {}));
    renderPublicProfileCard("pro");

    expect(screen.getByTestId("mini-site-editor-loading")).toBeInTheDocument();
  });

  it("shows error state when save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(miniSiteApi.updateMiniSiteConfig).mockRejectedValue(
      new ApiClientError(403, "FORBIDDEN", "Forbidden"),
    );
    renderPublicProfileCard("pro");

    await user.click(await screen.findByTestId("public-profile-save-button"));

    expect(await screen.findByTestId("mini-site-editor-save-error")).toBeInTheDocument();
  });

  it("keeps media upload fields disabled with coming soon hints", async () => {
    renderPublicProfileCard("free");

    expect(await screen.findByTestId("mini-site-logo-upload")).toBeDisabled();
    expect(screen.getByTestId("mini-site-logo-upload-hint")).toHaveTextContent(
      /logo upload coming soon/i,
    );
    expect(screen.getByTestId("mini-site-cover-upload")).toBeDisabled();
    expect(screen.getByTestId("mini-site-cover-upload-hint")).toHaveTextContent(
      /cover image upload coming soon/i,
    );
    expect(screen.getByTestId("public-profile-media-placeholder")).toHaveTextContent(
      /gallery and media uploads are coming soon/i,
    );
  });

  it("renders live preview after config load", async () => {
    renderPublicProfileCard("pro");

    expect(await screen.findByTestId("mini-site-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-hero-title")).toHaveTextContent("Welcome");
  });

  it("updates live preview when hero title changes", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-hero-title");
    await user.clear(screen.getByTestId("mini-site-hero-title"));
    await user.type(screen.getByTestId("mini-site-hero-title"), "Studio preview");

    expect(screen.getByTestId("mini-site-preview-hero-title")).toHaveTextContent("Studio preview");
  });

  it("updates live preview when about body changes", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-about-body");
    await user.clear(screen.getByTestId("mini-site-about-body"));
    await user.type(screen.getByTestId("mini-site-about-body"), "Preview about copy");

    expect(screen.getByTestId("mini-site-preview-about-body")).toHaveTextContent(
      "Preview about copy",
    );
  });

  it("applies theme colors and styles in live preview", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-primary-color");
    await user.clear(screen.getByTestId("mini-site-primary-color"));
    await user.type(screen.getByTestId("mini-site-primary-color"), "#112233");
    await user.selectOptions(screen.getByTestId("mini-site-background-style"), "dark");
    await user.selectOptions(screen.getByTestId("mini-site-button-style"), "pill");

    const preview = screen.getByTestId("mini-site-live-preview");
    expect(preview).toHaveAttribute("data-background-style", "dark");
    expect(preview).toHaveAttribute("data-button-style", "pill");
    expect(screen.getByTestId("mini-site-preview-primary-button")).toHaveStyle({
      backgroundColor: "#112233",
    });
    expect(screen.getByTestId("mini-site-preview-primary-button")).toHaveClass("rounded-full");
  });

  it("does not render media upload fields in live preview", async () => {
    renderPublicProfileCard("pro");

    const preview = await screen.findByTestId("mini-site-live-preview");
    expect(within(preview).queryByTestId("mini-site-logo-upload")).not.toBeInTheDocument();
    expect(within(preview).getByTestId("mini-site-preview-logo-placeholder")).toBeInTheDocument();
    expect(within(preview).getByTestId("mini-site-preview-gallery-placeholder")).toHaveTextContent(
      /gallery coming soon/i,
    );
    expect(within(preview).queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });
});
