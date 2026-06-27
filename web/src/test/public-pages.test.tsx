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
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/publicApi");

describe("public pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. renders business name on public business page", async () => {
    vi.mocked(publicApi.getPublicBusiness).mockResolvedValue(mockPublicBusiness);

    renderRoute(<PublicHomePage />, {
      route: `/b/${DEMO_SLUG}`,
      path: "/b/:slug",
    });

    expect(await screen.findByRole("heading", { name: mockPublicBusiness.name })).toBeInTheDocument();
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
