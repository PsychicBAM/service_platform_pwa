import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as miniSiteApi from "@/api/miniSiteApi";
import * as miniSiteMediaApi from "@/api/miniSiteMediaApi";
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

vi.mock("@/api/miniSiteMediaApi", () => ({
  uploadMiniSiteMedia: vi.fn(),
  removeMiniSiteMedia: vi.fn(),
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
    vi.mocked(miniSiteMediaApi.uploadMiniSiteMedia).mockResolvedValue({
      template: "clinic",
      slot: "heroImage",
      media: {
        kind: "image",
        url: "/uploads/mini_site/test/hero.webp",
        alt: "",
        filename: "hero.webp",
        contentType: "image/webp",
        size: 100,
      },
    });
    vi.mocked(miniSiteMediaApi.removeMiniSiteMedia).mockResolvedValue(undefined);
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
    expect(screen.getByTestId("mini-site-primary-color-picker")).toBeEnabled();
    expect(screen.getByTestId("mini-site-accent-color")).toBeEnabled();
    expect(screen.getByTestId("mini-site-accent-color-picker")).toBeEnabled();
    expect(screen.getByTestId("mini-site-background-color")).toBeEnabled();
    expect(screen.getByTestId("mini-site-background-color-picker")).toBeEnabled();
    expect(screen.getByTestId("mini-site-hero-badge-text")).toBeEnabled();
    expect(screen.getByTestId("mini-site-primary-cta-label")).toBeEnabled();
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

  it("save sends cleared FAQ fields without restoring defaults", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-toggle-faq");
    await user.click(screen.getByTestId("mini-site-toggle-faq"));

    for (const index of [0, 1, 2] as const) {
      await user.clear(screen.getByTestId(`mini-site-faq-item-${index}-question`));
      await user.clear(screen.getByTestId(`mini-site-faq-item-${index}-answer`));
    }

    await user.click(screen.getByTestId("public-profile-save-button"));

    await waitFor(() => {
      expect(miniSiteApi.updateMiniSiteConfig).toHaveBeenCalledWith(
        BUSINESS_ID,
        expect.objectContaining({
          copy: expect.objectContaining({
            faqItems: [
              { question: "", answer: "" },
              { question: "", answer: "" },
              { question: "", answer: "" },
            ],
          }),
        }),
      );
    });
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

  it("renders template media section for the selected template", async () => {
    renderPublicProfileCard("pro");

    expect(await screen.findByTestId("mini-site-template-media-section")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-template-media-scope")).toHaveTextContent(/Images for Clean/i);
    expect(screen.getByTestId("mini-site-media-slot-heroImage")).toBeInTheDocument();
  });

  it("shows clinic image slots when clinic template is selected", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-template");
    await user.selectOptions(screen.getByTestId("mini-site-template"), "clinic");

    expect(screen.getByTestId("mini-site-media-slot-heroImage")).toHaveTextContent("Hero image");
    expect(screen.getByTestId("mini-site-media-slot-doctorOrClinicImage")).toHaveTextContent(
      "Doctor / clinic image",
    );
    expect(screen.queryByTestId("mini-site-media-slot-heroVisual")).not.toBeInTheDocument();
  });

  it("shows portfolio image slots and hides clinic slots when portfolio is selected", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-template");
    await user.selectOptions(screen.getByTestId("mini-site-template"), "portfolio");

    expect(screen.getByTestId("mini-site-media-slot-heroVisual")).toHaveTextContent("Hero visual");
    expect(screen.queryByTestId("mini-site-media-slot-doctorOrClinicImage")).not.toBeInTheDocument();
  });

  it("upload success updates draft preview image", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-template");
    await user.selectOptions(screen.getByTestId("mini-site-template"), "clinic");

    const file = new File(["webp"], "hero.webp", { type: "image/webp" });
    const input = screen.getByTestId("mini-site-media-file-heroImage");
    await user.upload(input, file);

    await waitFor(() => {
      expect(miniSiteMediaApi.uploadMiniSiteMedia).toHaveBeenCalled();
      expect(screen.getByTestId("mini-site-media-preview-heroImage")).toBeInTheDocument();
      expect(screen.getByTestId("mini-site-preview-template-heroImage")).toBeInTheDocument();
    });
  });

  it("remove image clears slot preview", async () => {
    const user = userEvent.setup();
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue({
      ...DEFAULT_MINI_SITE_CONFIG,
      theme: { ...DEFAULT_MINI_SITE_CONFIG.theme, template: "clinic" },
      templateMedia: {
        clinic: {
          heroImage: {
            kind: "image",
            url: "/uploads/mini_site/test/hero.webp",
            alt: "Clinic hero",
            filename: "hero.webp",
            contentType: "image/webp",
            size: 100,
          },
        },
      },
    });

    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-media-preview-heroImage");
    await user.click(screen.getByTestId("mini-site-media-remove-heroImage"));

    await waitFor(() => {
      expect(miniSiteMediaApi.removeMiniSiteMedia).toHaveBeenCalled();
      expect(screen.queryByTestId("mini-site-media-preview-heroImage")).not.toBeInTheDocument();
    });
  });

  it("renders live preview after config load", async () => {
    renderPublicProfileCard("pro");

    expect(await screen.findByTestId("mini-site-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-hero-title")).toHaveTextContent("Welcome");
  });

  it("updates live preview when section visibility toggles change", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-live-preview");

    // Initial state: core sections visible
    expect(screen.getByTestId("mini-site-preview-about")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-services")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-trust-stats")).toBeInTheDocument();

    // Hide About
    await user.click(screen.getByTestId("mini-site-toggle-about"));
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-about")).not.toBeInTheDocument();
    });

    // Hide Services
    await user.click(screen.getByTestId("mini-site-toggle-services"));
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-services")).not.toBeInTheDocument();
    });

    // Hide Benefits/Trust
    await user.click(screen.getByTestId("mini-site-toggle-benefits-trust"));
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-trust-stats")).not.toBeInTheDocument();
      // In templates where the strip exists, it should also be hidden.
      expect(screen.queryByTestId("mini-site-preview-benefits-strip")).not.toBeInTheDocument();
    });

    // Add social content so contact section can render.
    await user.type(screen.getByTestId("mini-site-website"), "https://example.com");
    await waitFor(() => {
      expect(screen.getByTestId("mini-site-preview-contact")).toBeInTheDocument();
    });

    // Hide Contact
    await user.click(screen.getByTestId("mini-site-toggle-contact"));
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-contact")).not.toBeInTheDocument();
    });
  });

  it("updates live preview section order with Move up/down controls", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-live-preview");

    const aboutInitial = screen.getByTestId("mini-site-preview-about");
    const servicesInitial = screen.getByTestId("mini-site-preview-services");
    expect(aboutInitial.compareDocumentPosition(servicesInitial) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByTestId("mini-site-move-down-about"));

    await waitFor(() => {
      const aboutAfter = screen.getByTestId("mini-site-preview-about");
      const servicesAfter = screen.getByTestId("mini-site-preview-services");
      expect(servicesAfter.compareDocumentPosition(aboutAfter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
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

  it("updates live preview when hero badge text changes", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    const badgeInput = await screen.findByTestId("mini-site-hero-badge-text");
    await user.clear(badgeInput);
    await user.type(badgeInput, "Studio badge");

    expect(screen.getByTestId("mini-site-preview-hero-badge")).toHaveTextContent("Studio badge");
  });

  it("updates live preview when background color changes", async () => {
    renderPublicProfileCard("pro");

    const hexInput = await screen.findByTestId("mini-site-background-color");
    fireEvent.change(hexInput, { target: { value: "#ddeeff" } });

    expect(hexInput).toHaveValue("#ddeeff");
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute(
      "data-background-color",
      "#ddeeff",
    );
    expect(screen.getByTestId("mini-site-preview-frame")).toHaveStyle({
      backgroundColor: "#ddeeff",
    });
  });

  it("updates live preview when primary color picker changes", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-primary-color-picker");
    await user.clear(screen.getByTestId("mini-site-primary-color"));
    await user.type(screen.getByTestId("mini-site-primary-color"), "#eb2525");

    expect(screen.getByTestId("mini-site-primary-color")).toHaveValue("#eb2525");
    expect(screen.getByTestId("mini-site-preview-primary-button")).toHaveStyle({
      backgroundColor: "#eb2525",
    });
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
    expect(screen.getByTestId("mini-site-preview-device-shell")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-primary-button")).toHaveStyle({
      backgroundColor: "#112233",
    });
    expect(screen.getByTestId("mini-site-preview-primary-button")).toHaveClass("rounded-full");
  });

  it("includes teacher in the template selector", async () => {
    renderPublicProfileCard("pro");
    const select = await screen.findByTestId("mini-site-template");
    expect(within(select).getByRole("option", { name: "Teacher" })).toBeInTheDocument();
  });

  it("includes coach in the template selector", async () => {
    renderPublicProfileCard("pro");
    const select = await screen.findByTestId("mini-site-template");
    expect(within(select).getByRole("option", { name: "Coach" })).toBeInTheDocument();
  });

  it("reflects selected template in live preview", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-template");
    await user.selectOptions(screen.getByTestId("mini-site-template"), "expert");

    const preview = screen.getByTestId("mini-site-live-preview");
    expect(preview).toHaveAttribute("data-template", "expert");
    expect(preview).toHaveAttribute("data-template-presentation", "expert");
    expect(screen.getByTestId("mini-site-preview-hero")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-hero-content")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-logo-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("mini-site-preview-hero-badge")).toHaveTextContent(
      DEFAULT_MINI_SITE_CONFIG.copy.heroBadgeText,
    );
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

  it("updates live preview when FAQ content changes", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-live-preview");
    await user.click(screen.getByTestId("mini-site-toggle-faq"));

    const titleInput = await screen.findByTestId("mini-site-faq-section-title");
    await user.clear(titleInput);
    await user.type(titleInput, "Common questions");

    const questionInput = screen.getByTestId("mini-site-faq-item-0-question");
    await user.clear(questionInput);
    await user.type(questionInput, "Do you offer same-day service?");

    const answerInput = screen.getByTestId("mini-site-faq-item-0-answer");
    await user.clear(answerInput);
    await user.type(answerInput, "Yes, when availability allows.");

    expect(screen.getByTestId("mini-site-preview-faq-title")).toHaveTextContent("Common questions");
    expect(screen.getByTestId("mini-site-preview-faq-item-0-question")).toHaveTextContent(
      "Do you offer same-day service?",
    );
    expect(screen.getByTestId("mini-site-preview-faq-item-0-answer")).toHaveTextContent(
      "Yes, when availability allows.",
    );
  });

  it("hides FAQ in live preview when section visibility is disabled", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-live-preview");
    await user.click(screen.getByTestId("mini-site-toggle-faq"));
    expect(screen.getByTestId("mini-site-preview-faq")).toBeInTheDocument();

    await user.click(screen.getByTestId("mini-site-toggle-faq"));
    await waitFor(() => {
      expect(screen.queryByTestId("mini-site-preview-faq")).not.toBeInTheDocument();
    });
  });

  it("updates live preview FAQ order with Move up/down controls", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-live-preview");
    await user.click(screen.getByTestId("mini-site-toggle-faq"));

    const trustInitial = screen.getByTestId("mini-site-preview-trust");
    const faqInitial = screen.getByTestId("mini-site-preview-faq");
    expect(trustInitial.compareDocumentPosition(faqInitial) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByTestId("mini-site-move-up-faq"));

    await waitFor(() => {
      const trustAfter = screen.getByTestId("mini-site-preview-trust");
      const faqAfter = screen.getByTestId("mini-site-preview-faq");
      expect(faqAfter.compareDocumentPosition(trustAfter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("does not render the template blocks panel in the editor", async () => {
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-editor");
    expect(screen.queryByTestId("mini-site-template-blocks-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mini-site-template-blocks-heading")).not.toBeInTheDocument();
  });

  it("renders clinic preview with stacked info strip cards", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    await screen.findByTestId("mini-site-template");
    await user.selectOptions(screen.getByTestId("mini-site-template"), "clinic");

    const preview = screen.getByTestId("mini-site-live-preview");
    expect(preview).toHaveAttribute("data-template", "clinic");

    const infoStrip = screen.getByTestId("mini-site-preview-clinic-info-strip");
    expect(infoStrip.className).toContain("grid-cols-1");
    expect(infoStrip.className).not.toContain("md:grid-cols-3");

    expect(within(infoStrip).getByText("Appointments")).toBeInTheDocument();
    expect(within(infoStrip).getByText("Specialties")).toBeInTheDocument();
    expect(within(infoStrip).getByText(/patient care|contact|location/i)).toBeInTheDocument();
  });

  it("keeps template selector behavior when clinic is selected", async () => {
    const user = userEvent.setup();
    renderPublicProfileCard("pro");

    const select = await screen.findByTestId("mini-site-template");
    await user.selectOptions(select, "clinic");

    expect(select).toHaveValue("clinic");
    expect(screen.getByTestId("mini-site-live-preview")).toHaveAttribute("data-template", "clinic");
    expect(screen.queryByTestId("mini-site-template-blocks-panel")).not.toBeInTheDocument();
  });
});
