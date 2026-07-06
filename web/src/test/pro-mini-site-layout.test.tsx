import { describe, it, expect } from "vitest";
import type React from "react";
import { screen, within } from "@testing-library/react";
import { ProMiniSiteLayout, getProMiniSiteCtas } from "@/components/public/ProMiniSiteLayout";
import {
  DEMO_SLUG,
  mockBookingService,
  mockOrderService,
  mockPublicBusiness,
} from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

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
  it("renders business name", () => {
    renderProMiniSiteLayout();

    expect(screen.getByTestId("pro-mini-site-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: mockPublicBusiness.name })).toBeInTheDocument();
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

  it("renders Media gallery coming soon placeholder", () => {
    renderProMiniSiteLayout();

    expect(screen.getByTestId("pro-mini-site-gallery-placeholder")).toHaveTextContent(
      "Media gallery coming soon",
    );
  });

  it("does not require media fields", () => {
    renderProMiniSiteLayout({
      business: { ...mockPublicBusiness, logo_url: null },
    });

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-gallery-placeholder")).toBeInTheDocument();
  });

  it("does not crash when optional description and contact fields are missing", () => {
    renderProMiniSiteLayout({
      business: {
        ...mockPublicBusiness,
        description: null,
        address: null,
        contact_phone: null,
      },
    });

    expect(screen.queryByTestId("pro-mini-site-about")).not.toBeInTheDocument();
    expect(screen.getByText("Contact details are not available yet.")).toBeInTheDocument();
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
