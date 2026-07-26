import { describe, it, expect } from "vitest";
import type React from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProMiniSiteLayout, getProMiniSiteCtas } from "@/components/public/ProMiniSiteLayout";
import { DEFAULT_MINI_SITE_CONFIG, normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import type { MiniSiteConfig } from "@/types/miniSite";
import {
  DEMO_SLUG,
  mockBookingService,
  mockOrderService,
  mockPublicBusiness,
} from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

function createSavedMiniSiteConfig(overrides: {
  heroTitle?: string;
  heroBody?: string;
  aboutBody?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  backgroundStyle?: "light" | "soft" | "dark";
  buttonStyle?: "rounded" | "pill" | "square";
  template?: MiniSiteConfig["theme"]["template"];
} = {}): MiniSiteConfig {
  return normalizeMiniSiteConfig({
    version: 1,
    theme: {
      template: overrides.template ?? "clean",
      primaryColor: overrides.primaryColor ?? "#ff5500",
      accentColor: overrides.accentColor ?? "#2255aa",
      backgroundColor: overrides.backgroundColor ?? "#f8fafc",
      backgroundStyle: overrides.backgroundStyle ?? "soft",
      buttonStyle: overrides.buttonStyle ?? "pill",
      logoUrl: null,
      coverImageUrl: null,
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        enabled: true,
        order: 0,
        title: overrides.heroTitle ?? "Saved hero title",
        subtitle: "Saved hero subtitle",
        body: overrides.heroBody ?? "Saved hero body text",
      },
      {
        id: "about",
        type: "about",
        enabled: true,
        order: 1,
        title: "About our team",
        body: overrides.aboutBody ?? "Saved about body text",
      },
      {
        id: "services",
        type: "services",
        enabled: true,
        order: 2,
        title: "Services",
      },
      {
        id: "contact",
        type: "contact",
        enabled: true,
        order: 3,
        title: "Contact",
      },
      {
        id: "booking_cta",
        type: "booking_cta",
        enabled: false,
        order: 4,
      },
      {
        id: "gallery",
        type: "gallery",
        enabled: true,
        order: 5,
        title: "Gallery",
      },
    ],
    socialLinks: {
      website: "https://example.com",
      instagram: "@savedbiz",
    },
  });
}

function renderProMiniSiteLayout(
  props: Partial<React.ComponentProps<typeof ProMiniSiteLayout>> = {},
) {
  return renderRoute(
    <ProMiniSiteLayout
      business={mockPublicBusiness}
      publicSlug={DEMO_SLUG}
      {...props}
    />,
    { route: `/b/${DEMO_SLUG}`, path: "/b/:slug" },
  );
}

describe("ProMiniSiteLayout", () => {
  it("renders default hero content when config is not provided", () => {
    renderProMiniSiteLayout();

    expect(screen.getByTestId("pro-mini-site-layout")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-hero-title")).toHaveTextContent("Welcome");
  });

  it("renders saved hero title and body from miniSiteConfig", () => {
    renderProMiniSiteLayout({ config: createSavedMiniSiteConfig() });

    expect(screen.getByTestId("pro-mini-site-hero-title")).toHaveTextContent("Saved hero title");
    expect(screen.getByTestId("pro-mini-site-hero-body")).toHaveTextContent("Saved hero body text");
  });

  it("renders saved about body from miniSiteConfig", () => {
    renderProMiniSiteLayout({ config: createSavedMiniSiteConfig() });

    expect(screen.getByTestId("pro-mini-site-about-body")).toHaveTextContent("Saved about body text");
  });

  it("applies theme color and style attributes from config", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({
        primaryColor: "#ff5500",
        backgroundStyle: "soft",
        buttonStyle: "pill",
      }),
    });

    const layout = screen.getByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-background-style", "soft");
    expect(layout).toHaveAttribute("data-button-style", "pill");

    const bookCta = screen.getByTestId("pro-mini-site-book-cta");
    expect(bookCta).toHaveStyle({ backgroundColor: "rgb(255, 85, 0)" });
    expect(bookCta.className).toContain("rounded-full");
  });

  it("applies backgroundColor to the page shell", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ backgroundColor: "#e2e8f0" }),
    });

    const shell = screen.getByTestId("pro-mini-site-page-shell");
    expect(shell).toHaveAttribute("data-background-color", "#e2e8f0");
    expect(shell).toHaveStyle({ backgroundColor: "#e2e8f0" });
  });

  it("applies clinic template presentation", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "clinic" }),
    });
    const layout = screen.getByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-template", "clinic");
    expect(layout).toHaveClass("template-clinic");
    expect(screen.getByText("Care & wellness")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-trust-stats")).toBeInTheDocument();
  });

  it("applies distinct template presentation classes", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "service" }),
    });
    const serviceLayout = screen.getByTestId("pro-mini-site-layout");
    expect(serviceLayout).toHaveAttribute("data-template", "service");
    expect(serviceLayout).toHaveClass("template-service");
    expect(screen.getByTestId("pro-mini-site-hero")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-how-it-works")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-pricing")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("applies expert template presentation via ExpertTemplatePublicView", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "expert" }),
    });
    const expertLayout = screen.getByTestId("pro-mini-site-layout");
    expect(expertLayout).toHaveAttribute("data-template", "expert");
    expect(expertLayout).toHaveClass("template-expert");
    expect(screen.getByText("Expert profile")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-hero")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-articles")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-works")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("renders service template hero eyebrow from service content", () => {
    renderProMiniSiteLayout({
      config: normalizeMiniSiteConfig({
        ...createSavedMiniSiteConfig({ template: "service" }),
        templateContent: {
          service: {
            hero: {
              eyebrow: "Custom badge",
            },
          },
        },
      }),
    });
    expect(screen.getByText("Custom badge")).toBeInTheDocument();
  });

  it("applies portfolio template presentation via PortfolioTemplatePublicView", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "portfolio", backgroundStyle: "dark" }),
    });
    const layout = screen.getByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-template", "portfolio");
    expect(layout).toHaveClass("template-portfolio");
    expect(screen.getByTestId("pro-mini-site-hero")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-projects")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-skills")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("applies teacher template presentation", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "teacher" }),
    });
    const layout = screen.getByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-template", "teacher");
    expect(layout).toHaveClass("template-teacher");
    expect(screen.getByTestId("pro-mini-site-teacher-hero")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-teacher-lesson-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-teacher-highlights")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-trust-stats")).toBeInTheDocument();
  });

  it("applies coach template presentation", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "coach" }),
    });
    const layout = screen.getByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-template", "coach");
    expect(layout).toHaveClass("template-coach");
    expect(screen.getByTestId("pro-mini-site-coach-hero")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-coach-program-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-coach-outcomes")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-trust-stats")).toBeInTheDocument();
  });

  it("keeps dark background readable", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ backgroundStyle: "dark" }),
    });
    expect(screen.getByTestId("pro-mini-site-layout")).toHaveAttribute("data-background-style", "dark");
    expect(screen.getByTestId("pro-mini-site-hero-body")).toBeInTheDocument();
  });

  it("renders hero CTAs for both operating mode", () => {
    renderProMiniSiteLayout({ services: [mockBookingService, mockOrderService] });

    expect(screen.getByTestId("pro-mini-site-book-cta")).toHaveAttribute(
      "href",
      `/b/${DEMO_SLUG}/services`,
    );
    expect(screen.getByTestId("pro-mini-site-request-cta")).toHaveAttribute(
      "href",
      `/b/${DEMO_SLUG}/services/${mockOrderService.id}/request`,
    );
  });

  it("renders services section when services are provided", () => {
    renderProMiniSiteLayout({ services: [mockBookingService, mockOrderService] });

    const servicesSection = screen.getByTestId("pro-mini-site-services");
    expect(within(servicesSection).getByRole("heading", { name: mockBookingService.name })).toBeInTheDocument();
    expect(within(servicesSection).getByRole("heading", { name: mockOrderService.name })).toBeInTheDocument();
  });

  it("renders Media gallery coming soon placeholder when gallery section is enabled", () => {
    renderProMiniSiteLayout({ config: createSavedMiniSiteConfig() });

    expect(screen.getByTestId("pro-mini-site-gallery-placeholder")).toHaveTextContent(
      /gallery coming soon/i,
    );
  });

  it("hides configured Service template sections via sectionVisibility", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        ...DEFAULT_MINI_SITE_CONFIG.theme,
        template: "service",
      },
      sections: DEFAULT_MINI_SITE_CONFIG.sections,
      socialLinks: {},
      templateContent: {
        service: {
          sectionVisibility: {
            hero: true,
            services: false,
            "how-it-works": false,
            "why-choose-us": false,
            pricing: false,
            reviews: false,
            faq: false,
            contact: false,
            footer: false,
          },
        },
      },
    });

    renderProMiniSiteLayout({ config });

    expect(screen.getByTestId("pro-mini-site-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("pro-mini-site-services")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pro-mini-site-contact")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pro-mini-site-pricing")).not.toBeInTheDocument();
  });

  it("renders FAQ section when enabled with saved copy", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0, title: "Saved hero title" },
        { id: "about", type: "about", enabled: false, order: 1 },
        { id: "services", type: "services", enabled: false, order: 2 },
        { id: "faq", type: "faq", enabled: true, order: 3 },
        { id: "contact", type: "contact", enabled: false, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
        { id: "gallery", type: "gallery", enabled: false, order: 6 },
      ],
      socialLinks: {},
      copy: {
        ...DEFAULT_MINI_SITE_CONFIG.copy,
        faqSectionTitle: "Common questions",
        faqItems: [
          { question: "Do you offer same-day service?", answer: "Yes, when availability allows." },
          { question: "What areas do you serve?", answer: "We serve customers locally." },
          { question: "What is your cancellation policy?", answer: "Please cancel 24 hours ahead." },
        ],
      },
    });

    renderProMiniSiteLayout({ config });

    expect(screen.getByTestId("pro-mini-site-faq")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-faq")).toHaveTextContent("Common questions");
    expect(screen.getByTestId("pro-mini-site-faq-item-0-question")).toHaveTextContent(
      "Do you offer same-day service?",
    );
    expect(screen.getByTestId("pro-mini-site-faq-item-0-answer")).toHaveTextContent(
      "Yes, when availability allows.",
    );
  });

  it("skips empty FAQ items in public layout", () => {
    const partialConfig = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0, title: "Saved hero title" },
        { id: "faq", type: "faq", enabled: true, order: 3 },
        { id: "contact", type: "contact", enabled: true, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
      ],
      socialLinks: {},
      copy: {
        ...DEFAULT_MINI_SITE_CONFIG.copy,
        faqSectionTitle: "Common questions",
        faqItems: [
          { question: "Visible question?", answer: "" },
          { question: "", answer: "" },
          { question: "", answer: "" },
        ],
      },
    });

    renderProMiniSiteLayout({ config: partialConfig });

    expect(screen.getByTestId("pro-mini-site-faq")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-faq-item-0-question")).toHaveTextContent(
      "Visible question?",
    );
    expect(screen.queryByTestId("pro-mini-site-faq-item-1-question")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pro-mini-site-faq-item-2-question")).not.toBeInTheDocument();
  });

  it("does not render FAQ section when enabled but all FAQ rows are empty", () => {
    const emptyConfig = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0, title: "Saved hero title" },
        { id: "faq", type: "faq", enabled: true, order: 3 },
        { id: "contact", type: "contact", enabled: true, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
      ],
      socialLinks: {},
      copy: {
        ...DEFAULT_MINI_SITE_CONFIG.copy,
        faqItems: [
          { question: "", answer: "" },
          { question: " ", answer: " " },
          { question: "", answer: "" },
        ],
      },
    });

    renderProMiniSiteLayout({ config: emptyConfig });

    expect(screen.queryByTestId("pro-mini-site-faq")).not.toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-contact")).toBeInTheDocument();
  });

  it("hides FAQ section when disabled in config", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 0, title: "Saved hero title" },
        { id: "faq", type: "faq", enabled: false, order: 3 },
        { id: "contact", type: "contact", enabled: true, order: 4 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
      ],
      socialLinks: {},
    });

    renderProMiniSiteLayout({ config });

    expect(screen.queryByTestId("pro-mini-site-faq")).not.toBeInTheDocument();
  });

  it("respects configured ordering for enabled sections (hero pinned first)", () => {
    const config = normalizeMiniSiteConfig({
      version: 1,
      theme: DEFAULT_MINI_SITE_CONFIG.theme,
      sections: [
        { id: "hero", type: "hero", enabled: true, order: 50, title: "Saved hero title" },
        { id: "about", type: "about", enabled: true, order: 3, title: "About our team" },
        { id: "services", type: "services", enabled: true, order: 1, title: "Services" },
        { id: "trust", type: "trust", enabled: true, order: 2, title: "Trust" },
        { id: "contact", type: "contact", enabled: true, order: 4, title: "Contact" },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 5 },
        { id: "gallery", type: "gallery", enabled: false, order: 6 },
      ],
      socialLinks: {},
    });

    renderProMiniSiteLayout({ config });

    const hero = screen.getByTestId("pro-mini-site-hero");
    const services = screen.getByTestId("pro-mini-site-services");
    const trust = screen.getByTestId("pro-mini-site-trust");
    const about = screen.getByTestId("pro-mini-site-about");
    const contact = screen.getByTestId("pro-mini-site-contact");

    // Hero stays first regardless of configured order.
    expect(hero.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hero.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // services (1) -> trust (2) -> about (3) -> contact (4)
    expect(services.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trust.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(about.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render gallery placeholder when gallery section is disabled", () => {
    renderProMiniSiteLayout();

    expect(screen.queryByTestId("pro-mini-site-gallery-placeholder")).not.toBeInTheDocument();
  });

  it("does not require media fields", () => {
    renderProMiniSiteLayout({
      business: { ...mockPublicBusiness, logo_url: null },
      config: createSavedMiniSiteConfig(),
    });

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-gallery-placeholder")).toBeInTheDocument();
  });

  it("falls back to default config when config is null", () => {
    renderProMiniSiteLayout({ config: null });

    expect(screen.getByTestId("pro-mini-site-hero-title")).toHaveTextContent(
      DEFAULT_MINI_SITE_CONFIG.sections.find((section) => section.type === "hero")?.title ?? "Welcome",
    );
  });

  it("renders social links as plain text", () => {
    renderProMiniSiteLayout({ config: createSavedMiniSiteConfig() });

    const social = screen.getByTestId("pro-mini-site-social-links");
    expect(social).toHaveTextContent("https://example.com");
    expect(social).toHaveTextContent("@savedbiz");
  });

  it("does not render blank hero CTA buttons when labels are cleared", () => {
    const config = normalizeMiniSiteConfig({
      ...createSavedMiniSiteConfig(),
      copy: {
        ...createSavedMiniSiteConfig().copy,
        primaryCtaLabel: "",
        secondaryCtaLabel: " ",
      },
    });

    renderProMiniSiteLayout({
      config,
      services: [mockBookingService, mockOrderService],
    });

    expect(screen.queryByTestId("pro-mini-site-book-cta")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pro-mini-site-request-cta")).not.toBeInTheDocument();
  });

  it("does not render empty social link chips", () => {
    const config = normalizeMiniSiteConfig({
      ...createSavedMiniSiteConfig(),
      socialLinks: {
        website: " ",
        instagram: "",
      },
    });

    renderProMiniSiteLayout({ config });

    expect(screen.queryByTestId("pro-mini-site-social-links")).not.toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-contact")).toBeInTheDocument();
  });

  it("does not render contact section when all contact and social values are empty", () => {
    const config = normalizeMiniSiteConfig({
      ...createSavedMiniSiteConfig(),
      socialLinks: {
        website: " ",
        instagram: "",
      },
    });

    renderProMiniSiteLayout({
      config,
      business: {
        ...mockPublicBusiness,
        address: " ",
        contact_phone: " ",
      },
    });

    expect(screen.queryByTestId("pro-mini-site-contact")).not.toBeInTheDocument();
  });

  it("does not use dangerouslySetInnerHTML", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/public/ProMiniSiteLayout.tsx"),
      "utf8",
    );
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders safe video embed when valid intro video is configured", async () => {
    const user = userEvent.setup();
    const config = normalizeMiniSiteConfig({
      ...createSavedMiniSiteConfig({ template: "clean" }),
      templateMedia: {
        clean: {
          introVideo: {
            kind: "video",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            provider: "youtube",
            embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
            title: "",
          },
        },
      },
    });

    renderProMiniSiteLayout({ config });

    const playButton = screen.getByTestId("pro-mini-site-template-introVideo");
    expect(playButton).toBeInTheDocument();
    await user.click(playButton);

    const embed = screen.getByTestId("pro-mini-site-template-introVideo");
    expect(embed).toBeInTheDocument();
    const iframe = within(embed).getByTitle("Embedded video");
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(iframe).toHaveAttribute("loading", "lazy");
  });

  it("does not render empty video block when video is missing", () => {
    renderProMiniSiteLayout({ config: createSavedMiniSiteConfig({ template: "clean" }) });

    expect(screen.queryByTestId("pro-mini-site-template-introVideo")).not.toBeInTheDocument();
  });

  it("renders clinic booking CTA heading normally when appointment image is present", () => {
    const base = createSavedMiniSiteConfig({ template: "clinic" });
    const config = normalizeMiniSiteConfig({
      ...base,
      sections: base.sections.map((section) =>
        section.type === "booking_cta" ? { ...section, enabled: true } : section,
      ),
      copy: {
        ...base.copy,
        primaryCtaLabel: "Book visit",
      },
      templateMedia: {
        clinic: {
          appointmentImage: {
            kind: "image",
            url: "/uploads/mini_site/test/appointment.webp",
            thumbnailUrl: "/uploads/mini_site/test/appointment_thumb.webp",
            alt: "Appointment",
            filename: "appointment.webp",
            contentType: "image/webp",
            size: 100,
            originalSize: 5000,
            width: 1600,
            height: 900,
          },
        },
      },
    });

    renderProMiniSiteLayout({ config });

    const heading = screen.getByTestId("pro-mini-site-booking-cta-heading");
    expect(heading).toHaveTextContent("Schedule your visit");
    expect(heading.className).toContain("whitespace-normal");
    expect(heading.className).not.toContain("min-w-0");
    expect(screen.getByTestId("pro-mini-site-booking-cta-panel").className).not.toContain("md:flex-row");
  });
});

describe("getProMiniSiteCtas", () => {
  it("hides request CTA for booking-only businesses", () => {
    const ctas = getProMiniSiteCtas(
      { ...mockPublicBusiness, operating_mode: "booking_only" },
      DEMO_SLUG,
    );

    expect(ctas.showBookingCta).toBe(true);
    expect(ctas.showRequestCta).toBe(false);
  });

  it("hides booking CTA for orders-only businesses", () => {
    const ctas = getProMiniSiteCtas(
      { ...mockPublicBusiness, operating_mode: "orders_only" },
      DEMO_SLUG,
    );

    expect(ctas.showBookingCta).toBe(false);
    expect(ctas.showRequestCta).toBe(true);
  });
});
