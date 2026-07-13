import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { ServicesPage } from "@/pages/ServicesPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { BookingPage } from "@/pages/BookingPage";
import * as publicApi from "@/api/publicApi";
import {
  BOOKING_SERVICE_ID,
  DEMO_SLUG,
  ORDER_SERVICE_ID,
  mockBookingService,
  mockOrderService,
  mockPublicBusiness,
} from "@/test/mock-fixtures";
import { normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/publicApi");

describe("public pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicApi.listPublicReviews).mockResolvedValue({
      summary: { average_rating: 4.8, review_count: 24 },
      reviews: [
        {
          id: "rev-1",
          customer_name: "Olga",
          rating: 5,
          comment: "Great service",
          service_name: "Arabic Lesson",
          created_at: "2026-06-20T08:00:00Z",
        },
      ],
    });
  });

  it("A. renders business name on public business page", async () => {
    vi.mocked(publicApi.getPublicBusiness).mockResolvedValue(mockPublicBusiness);

    renderRoute(<PublicHomePage />, {
      route: `/b/${DEMO_SLUG}`,
      path: "/b/:slug",
    });

    expect(await screen.findByRole("heading", { name: mockPublicBusiness.name })).toBeInTheDocument();
    expect(screen.getByTestId("standard-public-business-home")).toBeInTheDocument();
    expect(await screen.findByTestId("public-rating-summary")).toHaveTextContent("4.8");
    expect(screen.getByTestId("public-rating-summary")).toHaveTextContent("24 reviews");
    expect(screen.getByTestId("public-review")).toHaveTextContent("Olga");
    expect(screen.queryByTestId("pro-mini-site-layout")).not.toBeInTheDocument();
    expect(screen.queryByText("Pro profile")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose service/i })).toHaveAttribute(
      "href",
      `/b/${DEMO_SLUG}/services`,
    );
  });

  it("A2. renders Pro mini-site layout when public_page_variant is mini_site", async () => {
    vi.mocked(publicApi.getPublicBusiness).mockResolvedValue({
      ...mockPublicBusiness,
      public_page_variant: "mini_site",
      miniSiteConfig: null,
    });
    vi.mocked(publicApi.listPublicServices).mockResolvedValue([
      mockBookingService,
      mockOrderService,
    ]);

    renderRoute(<PublicHomePage />, {
      route: `/b/${DEMO_SLUG}`,
      path: "/b/:slug",
    });

    expect(await screen.findByTestId("pro-mini-site-layout")).toBeInTheDocument();
    expect(screen.getByTestId("pro-mini-site-hero-title")).toHaveTextContent("Welcome");
    expect(screen.getByTestId("pro-mini-site-book-cta")).toHaveAttribute(
      "href",
      `/b/${DEMO_SLUG}/services`,
    );
    expect(screen.getByTestId("pro-mini-site-request-cta")).toHaveAttribute(
      "href",
      `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
    );
    expect(screen.queryByTestId("standard-public-business-home")).not.toBeInTheDocument();
  });

  it("A3. renders saved mini-site config on public page for mini_site businesses", async () => {
    const savedConfig = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        template: "clean",
        primaryColor: "#123456",
        accentColor: "#654321",
        backgroundStyle: "light",
        buttonStyle: "rounded",
      },
      sections: [
        {
          id: "hero",
          type: "hero",
          enabled: true,
          order: 0,
          title: "Public saved hero",
          body: "Public saved hero body",
        },
        {
          id: "about",
          type: "about",
          enabled: true,
          order: 1,
          title: "About",
          body: "Public saved about body",
        },
        { id: "services", type: "services", enabled: true, order: 2 },
        { id: "contact", type: "contact", enabled: true, order: 3 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 4 },
      ],
      socialLinks: {},
    });

    vi.mocked(publicApi.getPublicBusiness).mockResolvedValue({
      ...mockPublicBusiness,
      public_page_variant: "mini_site",
      miniSiteConfig: savedConfig,
    });
    vi.mocked(publicApi.listPublicServices).mockResolvedValue([mockBookingService]);

    renderRoute(<PublicHomePage />, {
      route: `/b/${DEMO_SLUG}`,
      path: "/b/:slug",
    });

    expect(await screen.findByTestId("pro-mini-site-hero-title")).toHaveTextContent(
      "Public saved hero",
    );
    expect(screen.getByTestId("pro-mini-site-hero-body")).toHaveTextContent("Public saved hero body");
    expect(screen.getByTestId("pro-mini-site-about-body")).toHaveTextContent("Public saved about body");
  });

  it("A4. applies saved portfolio theme and content on public mini-site page", async () => {
    const savedConfig = normalizeMiniSiteConfig({
      version: 1,
      theme: {
        template: "portfolio",
        primaryColor: "#eb2525",
        accentColor: "#7d0707",
        backgroundColor: "#1e293b",
        backgroundStyle: "dark",
        buttonStyle: "pill",
      },
      sections: [
        {
          id: "hero",
          type: "hero",
          enabled: true,
          order: 0,
          title: "Wire hero title",
          body: "Wire hero body text",
        },
        {
          id: "about",
          type: "about",
          enabled: true,
          order: 1,
          title: "About",
          body: "Wire about body",
        },
        { id: "services", type: "services", enabled: true, order: 2 },
        { id: "contact", type: "contact", enabled: true, order: 3 },
        { id: "booking_cta", type: "booking_cta", enabled: false, order: 4 },
      ],
      socialLinks: {
        website: "https://portfolio.example.com",
        instagram: "@portfolio",
      },
    });

    vi.mocked(publicApi.getPublicBusiness).mockResolvedValue({
      ...mockPublicBusiness,
      public_page_variant: "mini_site",
      miniSiteConfig: savedConfig,
    });
    vi.mocked(publicApi.listPublicServices).mockResolvedValue([mockBookingService]);

    renderRoute(<PublicHomePage />, {
      route: `/b/${DEMO_SLUG}`,
      path: "/b/:slug",
    });

    const layout = await screen.findByTestId("pro-mini-site-layout");
    expect(layout).toHaveAttribute("data-template", "portfolio");
    expect(layout).toHaveAttribute("data-background-style", "dark");
    expect(layout).toHaveAttribute("data-button-style", "pill");

    const pageShell = screen.getByTestId("pro-mini-site-page-shell");
    expect(pageShell).toHaveAttribute("data-background-color", "#1e293b");
    expect(pageShell).toHaveStyle({ backgroundColor: "#1e293b" });

    const bookCta = screen.getByTestId("pro-mini-site-book-cta");
    expect(bookCta).toHaveStyle({ backgroundColor: "rgb(235, 37, 37)" });
    expect(bookCta.className).toContain("rounded-full");

    expect(screen.getByTestId("pro-mini-site-hero-body")).toHaveTextContent("Wire hero body text");
    expect(screen.getByTestId("pro-mini-site-about-body")).toHaveTextContent("Wire about body");
    expect(screen.getByTestId("pro-mini-site-social-links")).toHaveTextContent(
      "https://portfolio.example.com",
    );
  });

  it("B. renders booking and order service cards", async () => {
    vi.mocked(publicApi.listPublicServices).mockResolvedValue([
      mockBookingService,
      mockOrderService,
    ]);

    renderRoute(<ServicesPage />, {
      route: `/b/${DEMO_SLUG}/services`,
      path: "/b/:slug/services",
    });

    expect(await screen.findByRole("heading", { name: mockBookingService.name })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: mockOrderService.name })).toBeInTheDocument();
  });

  it("B2. renders service image inside public service card with CTA", async () => {
    vi.mocked(publicApi.listPublicServices).mockResolvedValue([
      {
        ...mockBookingService,
        image: {
          kind: "image" as const,
          url: "/uploads/services/biz-1/svc-1/abc.webp",
          thumbnailUrl: "/uploads/services/biz-1/svc-1/abc_thumb.webp",
          alt: "",
          filename: "photo.jpg",
          contentType: "image/webp",
          size: 1200,
          originalSize: 4500,
          width: 1200,
          height: 800,
        },
      },
    ]);

    renderRoute(<ServicesPage />, {
      route: `/b/${DEMO_SLUG}/services`,
      path: "/b/:slug/services",
    });

    expect(await screen.findByTestId("service-card-image-area")).toBeInTheDocument();
    expect(screen.getByTestId("service-card-cta")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: mockBookingService.name })).toBeInTheDocument();
  });

  it("C. shows booking CTA for booking service detail", async () => {
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);

    renderRoute(<ServiceDetailPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}`,
      path: "/b/:slug/services/:serviceId",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockBookingService.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book appointment/i })).toBeInTheDocument();
  });

  it("D. shows request CTA for order service detail", async () => {
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);

    renderRoute(<ServiceDetailPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}`,
      path: "/b/:slug/services/:serviceId",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockOrderService.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /submit request/i })).toBeInTheDocument();
  });

  it("E. validates missing name and details on order request page", async () => {
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);
    const user = userEvent.setup();

    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockOrderService.name })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Project details are required.")).toBeInTheDocument();
  });

  it("F. shows date selector and empty slots state on booking page", async () => {
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);
    vi.mocked(publicApi.getAvailability).mockResolvedValue({
      date: "2026-06-30",
      service_id: BOOKING_SERVICE_ID,
      slots: [],
    });

    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockBookingService.name })).toBeInTheDocument();
    expect(screen.getByText("Choose a date")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No available times for this date.")).toBeInTheDocument();
    });
  });
});
