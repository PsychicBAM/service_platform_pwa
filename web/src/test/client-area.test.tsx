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

  it("client nav shows Account, Bookings, and Requests on desktop and hamburger on mobile", async () => {
    const user = userEvent.setup();
    renderRoute(<Layout />, { route: "/me", path: "/me" });

    const header = screen.getByTestId("app-layout-header");
    expect(header.className).toMatch(/fixed/);
    expect(header.className).toMatch(/inset-x-0/);
    expect(header.className).toMatch(/top-0/);
    expect(header.className).toMatch(/z-50/);
    expect(header.className).toMatch(/md:sticky/);

    const offset = screen.getByTestId("app-layout-header-offset");
    expect(offset.className).toMatch(/h-14/);
    expect(offset.className).toMatch(/md:hidden/);

    const desktopNav = screen.getByTestId("app-layout-desktop-nav");
    expect(desktopNav.className).toMatch(/hidden/);
    expect(desktopNav.className).toMatch(/md:flex/);
    expect(within(desktopNav).getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/me",
    );
    expect(within(desktopNav).getByRole("link", { name: "Bookings" })).toHaveAttribute(
      "href",
      "/me/bookings",
    );
    expect(within(desktopNav).getByRole("link", { name: "Requests" })).toHaveAttribute(
      "href",
      "/me/orders",
    );
    expect(screen.queryByRole("link", { name: "Orders" })).not.toBeInTheDocument();

    const menuButton = screen.getByTestId("app-layout-mobile-menu-button");
    expect(menuButton.className).toMatch(/md:hidden/);
    expect(menuButton).toHaveAttribute("aria-label", "Open menu");

    await user.click(menuButton);
    const drawer = screen.getByTestId("app-layout-mobile-menu");
    expect(drawer).toHaveTextContent("Account");
    expect(drawer).toHaveTextContent("Bookings");
    expect(drawer).toHaveTextContent("Requests");
    expect(drawer).toHaveTextContent("Browse businesses");
    expect(drawer).toHaveTextContent("Claim booking/request");
    expect(screen.getByTestId("app-layout-mobile-link-account")).toHaveAttribute("href", "/me");
    expect(screen.getByTestId("app-layout-mobile-link-bookings")).toHaveAttribute(
      "href",
      "/me/bookings",
    );
    expect(screen.getByTestId("app-layout-mobile-link-requests")).toHaveAttribute(
      "href",
      "/me/orders",
    );
    expect(screen.getByTestId("app-layout-mobile-link-businesses")).toHaveAttribute(
      "href",
      "/businesses",
    );
    expect(screen.getByTestId("app-layout-mobile-link-claim")).toHaveAttribute(
      "href",
      "/me/claim",
    );
    expect(screen.getByTestId("app-layout-mobile-logout")).toBeInTheDocument();
  });

  it("client mobile drawer closes after clicking a link and keeps logout available", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthenticatedAuth(mockClientUser),
      logout,
    });

    renderRoute(<Layout />, { route: "/me", path: "/me" });

    await user.click(screen.getByTestId("app-layout-mobile-menu-button"));
    expect(screen.getByTestId("app-layout-mobile-menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("app-layout-mobile-link-account"));
    expect(screen.queryByTestId("app-layout-mobile-menu")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("app-layout-mobile-menu-button"));
    await user.click(screen.getByTestId("app-layout-mobile-logout"));
    expect(logout).toHaveBeenCalled();
  });

  it("verify email banner stays below fixed header for unverified clients", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthenticatedAuth({ ...mockClientUser, email_verified: false }),
    );

    renderRoute(<Layout />, { route: "/me", path: "/me" });

    expect(screen.getByTestId("app-layout-verify-banner")).toHaveTextContent(
      /Email sending is not enabled in this environment/i,
    );
    expect(screen.getByTestId("app-layout-user-email")).toHaveTextContent(mockClientUser.email);
    expect(screen.getByTestId("app-layout-header")).not.toContainElement(
      screen.getByTestId("app-layout-verify-banner"),
    );
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
    expect(card).toHaveTextContent(`Reference: ${upcomingBooking.reference}`);
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

  it("cancel booking opens app dialog with optional reason and no window.prompt", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("should not be used");
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
    expect(promptSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("cancel-reason-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cancel booking?" })).toBeInTheDocument();
    expect(screen.getByTestId("cancel-reason-dialog-input")).toBeInTheDocument();

    await user.click(screen.getByTestId("cancel-reason-dialog-cancel"));
    expect(screen.queryByTestId("cancel-reason-dialog")).not.toBeInTheDocument();
    expect(meApi.cancelMyBooking).not.toHaveBeenCalled();

    await user.click(screen.getByTestId(`my-booking-cancel-${upcomingBooking.id}`));
    await user.type(screen.getByTestId("cancel-reason-dialog-input"), "Schedule conflict");
    await user.click(screen.getByTestId("cancel-reason-dialog-confirm"));

    await waitFor(() => {
      expect(meApi.cancelMyBooking).toHaveBeenCalledWith(
        upcomingBooking.id,
        "Schedule conflict",
      );
    });
    expect(promptSpy).not.toHaveBeenCalled();

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
    expect(card).toHaveTextContent(`Reference: ${mockMyOrder.reference}`);
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
      "/me/claim?type=request",
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

  it("cancel request opens app dialog with optional reason and no window.prompt", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("should not be used");
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
    expect(promptSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("cancel-reason-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cancel request?" })).toBeInTheDocument();

    await user.type(screen.getByTestId("cancel-reason-dialog-input"), "Changed mind");
    await user.click(screen.getByTestId("cancel-reason-dialog-confirm"));

    await waitFor(() => {
      expect(meApi.cancelMyOrder).toHaveBeenCalledWith(ORDER_ID, "Changed mind");
    });
    expect(promptSpy).not.toHaveBeenCalled();

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
