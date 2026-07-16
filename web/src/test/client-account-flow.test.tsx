import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingPage } from "@/pages/BookingPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ClientRegisterPage } from "@/pages/ClientRegisterPage";
import { MeAccountPage } from "@/pages/MeAccountPage";
import { ClaimGuestPage } from "@/pages/ClaimGuestPage";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import * as publicApi from "@/api/publicApi";
import * as authApi from "@/api/authApi";
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

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");
vi.mock("@/api/publicApi");
vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    registerClient: vi.fn(),
    login: vi.fn(),
  };
});

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

  it("booking success shows create client account, login, and claim links", async () => {
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
    expect(guidance).toHaveTextContent("save this booking to your account automatically");
    expect(screen.getByTestId("guest-track-create-account")).toHaveAttribute(
      "href",
      `/client/register?type=booking&reference=BKG-2026-0420&business=${DEMO_SLUG}`,
    );
    expect(screen.getByTestId("guest-track-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("guest-track-claim")).toHaveAttribute(
      "href",
      `/me/claim?type=booking&reference=BKG-2026-0420&business=${DEMO_SLUG}`,
    );
    expect(screen.getByTestId("guest-track-claim")).toHaveTextContent("Claim manually");
  });

  it("request success shows create client account, login, and claim links", async () => {
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
    expect(screen.getByTestId("guest-track-create-account")).toHaveAttribute(
      "href",
      `/client/register?type=request&reference=ORD-2026-0420&business=${DEMO_SLUG}`,
    );
    expect(screen.getByTestId("guest-track-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("guest-track-claim")).toHaveAttribute(
      "href",
      `/me/claim?type=request&reference=ORD-2026-0420&business=${DEMO_SLUG}`,
    );
  });

  it("client register with booking reference auto-claims and redirects to bookings", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.registerClient).mockResolvedValue({
      user: {
        id: "new-client-id",
        email: "newclient@example.com",
        full_name: "New Client",
        role: "client",
      },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 1800,
      },
    });
    vi.mocked(meApi.claimGuestBooking).mockResolvedValue({
      booking: {
        id: "booking-1",
        reference: "BKG-1",
        status: "pending",
        business: { id: "biz-1", name: "Demo", slug: "demo" },
        service: { id: "svc-1", name: "Cut" },
        starts_at: "2026-07-20T10:00:00Z",
        ends_at: "2026-07-20T11:00:00Z",
        client_notes: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        can_cancel: true,
        can_reschedule: true,
        has_review: false,
        can_review: false,
        created_at: "2026-07-16T10:00:00Z",
        updated_at: "2026-07-16T10:00:00Z",
      },
      already_linked: false,
    });

    renderRoute(<ClientRegisterPage />, {
      route: `/client/register?type=booking&reference=BKG-1&business=${DEMO_SLUG}`,
      path: "/client/register",
    });

    expect(
      screen.getByRole("heading", { name: "Create your client account" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("client-register-info")).toHaveTextContent(
      "same email you used when booking",
    );

    await user.type(screen.getByLabelText(/^email$/i), "newclient@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/^confirm password$/i), "Mismatch123!");
    await user.click(screen.getByRole("button", { name: "Create client account" }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(authApi.registerClient).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^confirm password$/i));
    await user.type(screen.getByLabelText(/^confirm password$/i), "ChangeMe123!");
    await user.click(screen.getByRole("button", { name: "Create client account" }));

    await waitFor(() => {
      expect(authApi.registerClient).toHaveBeenCalledWith({
        email: "newclient@example.com",
        password: "ChangeMe123!",
        full_name: null,
      });
    });
    await waitFor(() => {
      expect(meApi.claimGuestBooking).toHaveBeenCalledWith({
        reference: "BKG-1",
        email: "newclient@example.com",
        business_slug: DEMO_SLUG,
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/me/bookings",
        expect.objectContaining({
          state: expect.objectContaining({
            message: expect.stringContaining("booking was linked"),
          }),
        }),
      );
    });
  });

  it("client register with request type auto-claims and redirects to orders", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.registerClient).mockResolvedValue({
      user: {
        id: "new-client-id",
        email: "newclient@example.com",
        full_name: "New Client",
        role: "client",
      },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 1800,
      },
    });
    vi.mocked(meApi.claimGuestOrder).mockResolvedValue({
      order: {
        id: "order-1",
        reference: "ORD-9",
        status: "submitted",
        business: { id: "biz-1", name: "Demo", slug: DEMO_SLUG },
        service: {
          id: "svc-1",
          name: "Request",
          type: "order",
          price_cents: null,
          price_type: "fixed",
          currency: "USD",
        },
        form_data: {},
        quoted_price_cents: null,
        decline_reason: null,
        created_at: "2026-07-16T10:00:00Z",
        updated_at: "2026-07-16T10:00:00Z",
        accepted_at: null,
        completed_at: null,
        can_cancel: true,
        has_review: false,
        can_review: false,
      },
      already_linked: false,
    });

    renderRoute(<ClientRegisterPage />, {
      route: `/client/register?type=request&reference=ORD-9&business=${DEMO_SLUG}`,
      path: "/client/register",
    });

    await user.type(screen.getByLabelText(/^email$/i), "newclient@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/^confirm password$/i), "ChangeMe123!");
    await user.click(screen.getByRole("button", { name: "Create client account" }));

    await waitFor(() => {
      expect(meApi.claimGuestOrder).toHaveBeenCalledWith({
        reference: "ORD-9",
        email: "newclient@example.com",
        business_slug: DEMO_SLUG,
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/me/orders",
        expect.objectContaining({
          state: expect.objectContaining({
            message: expect.stringContaining("request was linked"),
          }),
        }),
      );
    });
  });

  it("client register auto-claim failure keeps account and sends user to claim", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.registerClient).mockResolvedValue({
      user: {
        id: "new-client-id",
        email: "newclient@example.com",
        full_name: "New Client",
        role: "client",
      },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 1800,
      },
    });
    vi.mocked(meApi.claimGuestOrder).mockRejectedValue(
      new Error("Could not claim"),
    );

    renderRoute(<ClientRegisterPage />, {
      route: `/client/register?type=request&reference=ORD-9&business=${DEMO_SLUG}`,
      path: "/client/register",
    });

    await user.type(screen.getByLabelText(/^email$/i), "newclient@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/^confirm password$/i), "ChangeMe123!");
    await user.click(screen.getByRole("button", { name: "Create client account" }));

    await waitFor(() => {
      expect(authApi.registerClient).toHaveBeenCalled();
      expect(meApi.claimGuestOrder).toHaveBeenCalledWith({
        reference: "ORD-9",
        email: "newclient@example.com",
        business_slug: DEMO_SLUG,
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/me/claim?type=request&reference=ORD-9&business=${DEMO_SLUG}&autoClaimFailed=1`,
        expect.objectContaining({
          state: expect.objectContaining({
            message: expect.stringContaining("could not link this request automatically"),
          }),
        }),
      );
    });
  });

  it("login page separates client signup, business register, and claim", () => {
    renderRoute(<LoginPage />, { route: "/login", path: "/login" });

    expect(screen.getByRole("link", { name: /create client account/i })).toHaveAttribute(
      "href",
      "/client/register",
    );
    expect(screen.getByRole("link", { name: /claim a booking or request/i })).toHaveAttribute(
      "href",
      "/me/claim",
    );
    expect(screen.getByRole("link", { name: /register your business/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("register page clarifies business signup and points customers to client register", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(
      screen.getByRole("heading", { name: "Register your business" }),
    ).toBeInTheDocument();
    const note = screen.getByTestId("register-customer-note");
    expect(note).toHaveTextContent("creates a business account");
    expect(note.querySelector('a[href="/client/register"]')).toBeTruthy();
    expect(note.querySelector('a[href="/me/claim"]')).toBeTruthy();
  });

  it("/me how-it-works mentions setting own password", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<MeAccountPage />, { route: "/me", path: "/me" });

    const how = await screen.findByTestId("me-how-it-works");
    expect(how).toHaveTextContent("Create your client account");
    expect(how).toHaveTextContent("Set your own password");
    expect(how).toHaveTextContent("Claim guest activity");
    expect(how).not.toHaveTextContent("automatically");
  });

  it("/me/claim signed-out state shows create client account and login", () => {
    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim?type=booking&reference=BKG-9",
      path: "/me/claim",
    });

    expect(screen.getByTestId("claim-create-client-account")).toHaveAttribute(
      "href",
      "/client/register?type=booking&reference=BKG-9",
    );
    expect(screen.getByTestId("claim-go-login")).toHaveAttribute("href", "/login");
    expect(
      screen.getByText(/create or log in first, then claim your booking or request/i),
    ).toBeInTheDocument();
  });
});
