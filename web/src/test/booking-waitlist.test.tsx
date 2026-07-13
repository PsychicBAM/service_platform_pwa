import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingPage } from "@/pages/BookingPage";
import { renderRoute } from "@/test/test-utils";

const mockGetPublicService = vi.fn();
const mockGetAvailability = vi.fn();
const mockCreatePublicBooking = vi.fn();
const mockCreatePublicWaitlistEntry = vi.fn();

vi.mock("@/api/publicApi", () => ({
  getPublicService: (...args: unknown[]) => mockGetPublicService(...args),
  getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  createPublicBooking: (...args: unknown[]) => mockCreatePublicBooking(...args),
  createPublicWaitlistEntry: (...args: unknown[]) => mockCreatePublicWaitlistEntry(...args),
}));

describe("BookingPage waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicService.mockResolvedValue({
      id: "svc-1",
      name: "Haircut",
      description: null,
      type: "booking",
      duration_minutes: 30,
      price_cents: 2500,
      currency: "USD",
      price_type: "fixed",
      require_payment: false,
      sort_order: 0,
    });
    mockGetAvailability.mockResolvedValue({
      date: "2026-06-23",
      service_id: "svc-1",
      slots: [
        {
          starts_at: "2026-06-23T11:00:00-04:00",
          ends_at: "2026-06-23T11:30:00-04:00",
        },
        {
          starts_at: "2026-06-23T10:00:00-04:00",
          ends_at: "2026-06-23T10:30:00-04:00",
          is_fully_booked: true,
          waitlist_available: true,
        },
      ],
    });
    mockCreatePublicWaitlistEntry.mockResolvedValue({
      id: "wl-1",
      service_id: "svc-1",
      starts_at: "2026-06-23T10:00:00-04:00",
      status: "waiting",
      message: "You have joined the waitlist for this time slot.",
    });
  });

  it("shows join waitlist submit for full waitlist slot", async () => {
    const user = userEvent.setup();
    renderRoute(<BookingPage />, {
      route: "/b/demo-salon/services/svc-1/book",
      path: "/b/:slug/services/:serviceId/book",
    });

    await waitFor(() => {
      expect(screen.getByTestId("waitlist-slot")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("waitlist-slot"));
    expect(screen.getByTestId("join-waitlist-submit")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
    await user.click(screen.getByTestId("join-waitlist-submit"));

    await waitFor(() => {
      expect(mockCreatePublicWaitlistEntry).toHaveBeenCalled();
    });
    expect(screen.getByText(/You have joined the waitlist/i)).toBeInTheDocument();
  });

  it("books normally for available slot", async () => {
    const user = userEvent.setup();
    mockCreatePublicBooking.mockResolvedValue({
      id: "bk-1",
      reference: "BK123",
      status: "pending",
      service: { id: "svc-1", name: "Haircut", type: "booking" },
      client: {
        id: "c-1",
        full_name: "Jane Doe",
        email: "jane@example.com",
        phone: null,
      },
      starts_at: "2026-06-23T11:00:00-04:00",
      ends_at: "2026-06-23T11:30:00-04:00",
      payment_required: false,
      payment: null,
    });

    renderRoute(<BookingPage />, {
      route: "/b/demo-salon/services/svc-1/book",
      path: "/b/:slug/services/:serviceId/book",
    });

    await waitFor(() => {
      expect(screen.getByTestId("bookable-slot")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("bookable-slot"));
    expect(screen.getByTestId("booking-submit")).toBeInTheDocument();
  });
});
