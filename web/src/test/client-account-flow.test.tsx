import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingPage } from "@/pages/BookingPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { MeAccountPage } from "@/pages/MeAccountPage";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import * as publicApi from "@/api/publicApi";
import {
  BOOKING_SERVICE_ID,
  DEMO_SLUG,
  ORDER_SERVICE_ID,
  emptyListMeta,
  mockBookingService,
  mockClientUser,
  mockOrderService,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";
import { generateBookingDates } from "@/utils/format";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");
vi.mock("@/api/publicApi");

function getConsentCheckbox() {
  return screen.getByRole("checkbox", { name: /acknowledge the draft privacy policy/i });
}

describe("client account creation flow clarity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());
    vi.mocked(meApi.listMyBookings).mockResolvedValue({ data: [], meta: emptyListMeta });
    vi.mocked(meApi.listMyOrders).mockResolvedValue({ data: [], meta: emptyListMeta });
  });

  it("booking success shows account tracking guidance with login and claim links", async () => {
    const user = userEvent.setup();
    const defaultDate = generateBookingDates(1)[0]!.date;
    const slotStartsAt = `${defaultDate}T10:00:00`;

    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);
    vi.mocked(publicApi.getAvailability).mockResolvedValue({
      date: defaultDate,
      service_id: BOOKING_SERVICE_ID,
      slots: [{ starts_at: slotStartsAt, ends_at: `${defaultDate}T11:00:00` }],
    });
    vi.mocked(publicApi.createPublicBooking).mockResolvedValue({
      id: "booking-new",
      reference: "BKG-2026-0420",
      status: "pending",
      starts_at: slotStartsAt,
      ends_at: `${defaultDate}T11:00:00`,
      service: { id: BOOKING_SERVICE_ID, name: mockBookingService.name, type: "booking" },
      client: {
        id: "client-1",
        full_name: "Guest Client",
        email: "guest@example.com",
        phone: null,
      },
      payment_required: false,
      payment: null,
    });

    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    await screen.findByRole("heading", { level: 1, name: mockBookingService.name });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /10:00/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /10:00/i }));
    await user.type(screen.getByLabelText(/full name/i), "Guest Client");
    await user.type(screen.getByLabelText(/^email$/i), "guest@example.com");
    await user.click(getConsentCheckbox());
    await user.click(screen.getByRole("button", { name: "Submit booking request" }));

    expect(await screen.findByText("Booking received")).toBeInTheDocument();
    const guidance = await screen.findByTestId("guest-track-activity-card");
    expect(guidance).toHaveTextContent("Want to track this booking?");
    expect(guidance).toHaveTextContent("not an account by itself");
    expect(screen.getByTestId("guest-track-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("guest-track-claim")).toHaveAttribute(
      "href",
      "/me/claim?type=booking",
    );
    expect(screen.queryByTestId("guest-track-view-list")).not.toBeInTheDocument();
  });

  it("request success shows account tracking guidance with login and claim links", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);
    vi.mocked(publicApi.createPublicOrder).mockResolvedValue({
      id: "order-new",
      reference: "ORD-2026-0420",
      status: "submitted",
      service: { id: ORDER_SERVICE_ID, name: mockOrderService.name, type: "order" },
      client: {
        id: "client-1",
        full_name: "Guest Client",
        email: "guest@example.com",
        phone: null,
      },
      form_data: { details: "Need a bot" },
      created_at: "2026-06-30T10:00:00Z",
      payment_required: false,
      payment: null,
    });

    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    await screen.findByRole("heading", { level: 1, name: mockOrderService.name });
    await user.type(screen.getByLabelText(/full name/i), "Guest Client");
    await user.type(screen.getByLabelText(/^email$/i), "guest@example.com");
    await user.type(screen.getByLabelText(/project \/ request details/i), "Need a bot");
    await user.click(getConsentCheckbox());
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    const guidance = await screen.findByTestId("guest-track-activity-card");
    expect(guidance).toHaveTextContent("Want to track replies and status updates?");
    expect(screen.getByTestId("guest-track-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("guest-track-claim")).toHaveAttribute(
      "href",
      "/me/claim?type=order",
    );
  });

  it("login page explains same-email tracking and claim link", () => {
    renderRoute(<LoginPage />, { route: "/login", path: "/login" });

    expect(
      screen.getByRole("heading", { name: "Log in to your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/same email you used when booking or sending requests/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /claim a booking or request/i })).toHaveAttribute(
      "href",
      "/me/claim",
    );
    expect(screen.getByRole("link", { name: /register your business/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("register page clarifies business signup and points customers to claim", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(
      screen.getByRole("heading", { name: "Register your business" }),
    ).toBeInTheDocument();
    const note = screen.getByTestId("register-customer-note");
    expect(note).toHaveTextContent("creates a business account");
    expect(note.querySelector('a[href="/login"]')).toBeTruthy();
    expect(note.querySelector('a[href="/me/claim"]')).toBeTruthy();
  });

  it("/me how-it-works does not claim automatic email linking", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<MeAccountPage />, { route: "/me", path: "/me" });

    const how = await screen.findByTestId("me-how-it-works");
    expect(how).toHaveTextContent("Claim guest activity if needed");
    expect(how).toHaveTextContent("until you claim it");
    expect(how).not.toHaveTextContent("automatically");
    expect(how).not.toHaveTextContent("appear here when they are linked to your email");
  });
});
