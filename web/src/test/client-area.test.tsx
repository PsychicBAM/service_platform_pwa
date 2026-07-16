import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Layout } from "@/components/Layout";
import { MeAccountPage } from "@/pages/MeAccountPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { ClaimGuestPage } from "@/pages/ClaimGuestPage";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import {
  DEMO_SLUG,
  ORDER_ID,
  emptyListMeta,
  mockClientUser,
  mockCompletedBookingListItem,
  mockCompletedOrder,
  mockMyOrder,
} from "@/test/mock-fixtures";
import type { MyBookingListItem } from "@/types/api";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");

const longBusinessName =
  "Very Long Business Name That Should Truncate Safely On Mobile Layout";
const longServiceName =
  "Extremely Long Service Title For Mobile Card Overflow Coverage";
const longMessage =
  "This is a very long last message preview that should clamp to two lines without causing horizontal overflow on narrow screens.";

const upcomingBooking: MyBookingListItem = {
  id: "booking-id-upcoming",
  reference: "BKG-2026-0002",
  status: "confirmed",
  business: {
    id: "business-id-001",
    name: longBusinessName,
    slug: DEMO_SLUG,
  },
  service: {
    id: "booking-service-id",
    name: longServiceName,
  },
  starts_at: "2026-07-01T10:00:00Z",
  ends_at: "2026-07-01T11:00:00Z",
  can_cancel: true,
  can_reschedule: true,
  has_review: false,
  can_review: false,
};

describe("client area mobile UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });
  });

  it("renders /me account dashboard with onboarding sections and quick actions", async () => {
    renderRoute(<MeAccountPage />, { route: "/me", path: "/me" });

    expect(await screen.findByTestId("me-account-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your account" })).toBeInTheDocument();
    expect(screen.getByTestId("me-signed-in-card")).toHaveTextContent(mockClientUser.email);
    expect(screen.getByTestId("me-how-it-works")).toHaveTextContent(
      "How your client account works",
    );
    expect(screen.getByTestId("me-how-it-works")).toHaveTextContent(
      "Create your client account",
    );
    expect(screen.getByTestId("me-how-it-works")).toHaveTextContent(
      "Set your own password",
    );
    expect(screen.getByTestId("me-how-it-works")).toHaveTextContent(
      "Claim guest activity",
    );

    const links = screen.getByTestId("me-account-links");
    expect(links.className).toMatch(/grid-cols-1/);
    expect(screen.getByTestId("me-link-bookings")).toHaveAttribute("href", "/me/bookings");
    expect(screen.getByTestId("me-link-bookings")).toHaveTextContent("Open bookings");
    expect(screen.getByTestId("me-link-orders")).toHaveAttribute("href", "/me/orders");
    expect(screen.getByTestId("me-link-orders")).toHaveTextContent("Open requests");
    expect(screen.getByTestId("me-link-claim")).toHaveAttribute("href", "/me/claim");
    expect(screen.getByTestId("me-link-businesses")).toHaveAttribute("href", "/businesses");

    expect(await screen.findByTestId("me-next-steps")).toBeInTheDocument();
    expect(screen.getByTestId("me-next-browse")).toHaveAttribute("href", "/businesses");
    expect(screen.getByTestId("me-account-summary")).toHaveTextContent("Upcoming bookings");
    expect(screen.getByTestId("me-account-summary")).toHaveTextContent("Open requests");
  });

  it("client nav shows Account, Bookings, and Requests", () => {
    renderRoute(<Layout />, { route: "/me", path: "/me" });

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/me");
    expect(screen.getByRole("link", { name: "Bookings" })).toHaveAttribute("href", "/me/bookings");
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/me/orders");
    expect(screen.queryByRole("link", { name: "Orders" })).not.toBeInTheDocument();
  });

  it("renders mobile-friendly booking cards with business, service, time, status, and cancel", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [upcomingBooking],
      meta: emptyListMeta,
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    const list = await screen.findByTestId("my-bookings-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const card = screen.getByTestId("my-booking-card");
    expect(card.className).toMatch(/overflow-hidden/);
    expect(card).toHaveTextContent(longBusinessName);
    expect(card).toHaveTextContent(longServiceName);
    expect(card).toHaveTextContent("Confirmed");
    expect(within(card).getByText(longBusinessName).className).toMatch(/truncate/);
    expect(screen.getByTestId(`my-booking-cancel-${upcomingBooking.id}`)).toBeInTheDocument();
    expect(
      screen.getByText("Upcoming and past appointments linked to your account."),
    ).toBeInTheDocument();
  });

  it("shows Leave review on completed reviewable booking", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [mockCompletedBookingListItem],
      meta: emptyListMeta,
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(await screen.findByTestId("leave-review-button")).toBeInTheDocument();
  });

  it("renders bookings empty state with browse and claim links", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(await screen.findByTestId("my-bookings-empty")).toBeInTheDocument();
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
    expect(
      screen.getByText("Book a service from a business page and it will appear here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse businesses" })).toHaveAttribute(
      "href",
      "/businesses",
    );
    expect(screen.getByRole("link", { name: "Claim guest booking" })).toHaveAttribute(
      "href",
      "/me/claim?type=booking",
    );
  });

  it("cancel booking opens custom confirm without window.confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("");
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [upcomingBooking],
      meta: emptyListMeta,
    });
    vi.mocked(meApi.cancelMyBooking).mockResolvedValue({
      ...upcomingBooking,
      status: "cancelled",
      can_cancel: false,
      can_reschedule: false,
      client_notes: null,
      cancelled_at: "2026-07-01T09:00:00Z",
      cancelled_by: "client",
      cancellation_reason: null,
      created_at: "2026-06-30T10:00:00Z",
      updated_at: "2026-07-01T09:00:00Z",
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    await user.click(await screen.findByTestId(`my-booking-cancel-${upcomingBooking.id}`));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("admin-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cancel booking?" })).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-confirm-dialog-cancel"));
    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    expect(meApi.cancelMyBooking).not.toHaveBeenCalled();

    await user.click(screen.getByTestId(`my-booking-cancel-${upcomingBooking.id}`));
    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(meApi.cancelMyBooking).toHaveBeenCalledWith(upcomingBooking.id, undefined);
    });
    expect(promptSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it("renders mobile-friendly order cards with status, date, message, and view action", async () => {
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [
        {
          ...mockMyOrder,
          business: { ...mockMyOrder.business, name: longBusinessName },
          service: { ...mockMyOrder.service, name: longServiceName },
          last_message_preview: longMessage,
        },
      ],
      meta: emptyListMeta,
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    const list = await screen.findByTestId("my-orders-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const card = screen.getByTestId("my-order-card");
    expect(card).toHaveTextContent(longBusinessName);
    expect(card).toHaveTextContent(longServiceName);
    expect(card).toHaveTextContent("In Progress");
    expect(card).toHaveTextContent("Last message:");
    const message = within(card).getByText((content) => content.includes("Last message:"));
    expect(message.className).toMatch(/line-clamp-2/);
    expect(screen.getByTestId(`my-order-view-${ORDER_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`my-order-cancel-${ORDER_ID}`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My requests" })).toBeInTheDocument();
    expect(
      screen.getByText("Track service requests, business replies, and status updates."),
    ).toBeInTheDocument();
  });

  it("renders orders empty state with browse and claim links", async () => {
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    expect(await screen.findByTestId("my-orders-empty")).toBeInTheDocument();
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
    expect(
      screen.getByText("Send a service request to a business and it will appear here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse businesses" })).toHaveAttribute(
      "href",
      "/businesses",
    );
    expect(screen.getByRole("link", { name: "Claim guest request" })).toHaveAttribute(
      "href",
      "/me/claim?type=order",
    );
  });

  it("shows Leave review on completed reviewable order", async () => {
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockCompletedOrder],
      meta: emptyListMeta,
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    expect(await screen.findByTestId("leave-review-button")).toBeInTheDocument();
  });

  it("cancel request opens custom confirm without window.confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Changed mind");
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockMyOrder],
      meta: emptyListMeta,
    });
    vi.mocked(meApi.cancelMyOrder).mockResolvedValue({
      ...mockMyOrder,
      status: "cancelled",
      can_cancel: false,
      form_data: {},
      quoted_price_cents: null,
      decline_reason: null,
      accepted_at: null,
      completed_at: null,
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    await user.click(await screen.findByTestId(`my-order-cancel-${ORDER_ID}`));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Cancel request?" })).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(meApi.cancelMyOrder).toHaveBeenCalledWith(ORDER_ID, "Changed mind");
    });

    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it("claim guest page explains reference-based claim flow", () => {
    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    expect(
      screen.getByText("This links a guest booking or request to your signed-in account."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use the same email or phone you entered when booking as a guest.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("claim-guest-form")).toBeInTheDocument();
  });
});
