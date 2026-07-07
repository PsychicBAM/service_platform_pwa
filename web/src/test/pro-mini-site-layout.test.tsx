import { describe, it, expect } from "vitest";
import type React from "react";
import { screen, within } from "@testing-library/react";
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

  it("applies distinct template presentation classes", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "service" }),
    });
    const serviceLayout = screen.getByTestId("pro-mini-site-layout");
    expect(serviceLayout).toHaveAttribute("data-template", "service");
    expect(serviceLayout).toHaveClass("template-service");
    expect(screen.getByText("Service business")).toBeInTheDocument();
  });

  it("applies expert template centered hero presentation", () => {
    renderProMiniSiteLayout({
      config: createSavedMiniSiteConfig({ template: "expert" }),
    });
    const expertLayout = screen.getByTestId("pro-mini-site-layout");
    expect(expertLayout).toHaveAttribute("data-template", "expert");
    expect(expertLayout).toHaveClass("template-expert");
    expect(screen.getByText("Expert profile")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-hero").firstElementChild).toHaveClass("text-center");
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
      "Media gallery coming soon",
    );
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

  it("does not use dangerouslySetInnerHTML", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/public/ProMiniSiteLayout.tsx"),
      "utf8",
    );
    expect(source).not.toContain("dangerouslySetInnerHTML");
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
