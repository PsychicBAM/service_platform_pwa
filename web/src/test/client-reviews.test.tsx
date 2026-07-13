import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import {
  mockClientUser,
  mockCompletedBookingListItem,
  mockReviewedBookingListItem,
  mockCompletedOrder,
  mockReviewedOrder,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");

describe("client review UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
  });

  it("completed booking shows Leave review", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [mockCompletedBookingListItem],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(await screen.findByTestId("leave-review-button")).toBeInTheDocument();
  });

  it("non-completed booking does not show Leave review", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [
        {
          ...mockCompletedBookingListItem,
          status: "pending",
          can_review: false,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(await screen.findByText(mockCompletedBookingListItem.reference)).toBeInTheDocument();
    expect(screen.queryByTestId("leave-review-button")).not.toBeInTheDocument();
  });

  it("already reviewed booking shows Review submitted", async () => {
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [mockReviewedBookingListItem],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(await screen.findByTestId("review-submitted-label")).toHaveTextContent(
      "Review submitted",
    );
    expect(screen.queryByTestId("leave-review-button")).not.toBeInTheDocument();
  });

  it("submitting booking review calls API and shows success", async () => {
    const user = userEvent.setup();
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [mockCompletedBookingListItem],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(meApi.createMyBookingReview).mockResolvedValue({
      id: "review-id-001",
      business_id: "business-id-001",
      service_id: "booking-service-id",
      service_name: "Arabic Lesson",
      booking_id: null,
      booking_reference: mockCompletedBookingListItem.reference,
      order_id: null,
      order_reference: null,
      customer_name: "Client Demo",
      rating: 5,
      comment: "Great",
      status: "published",
      created_at: "2026-07-01T10:00:00Z",
      updated_at: "2026-07-01T10:00:00Z",
    });

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    await user.click(await screen.findByTestId("leave-review-button"));
    await user.type(screen.getByTestId("review-comment-input"), "Great");
    await user.click(screen.getByTestId("review-submit-button"));

    await waitFor(() => {
      expect(meApi.createMyBookingReview).toHaveBeenCalledWith(
        mockCompletedBookingListItem.id,
        { rating: 5, comment: "Great" },
      );
    });
    expect(await screen.findByTestId("review-submitted-label")).toBeInTheDocument();
  });

  it("failed booking review submit shows error", async () => {
    const user = userEvent.setup();
    vi.mocked(meApi.listMyBookings).mockResolvedValue({
      data: [mockCompletedBookingListItem],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(meApi.createMyBookingReview).mockRejectedValue(
      new ApiClientError(409, "REVIEW_DUPLICATE", "Review already exists."),
    );

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    await user.click(await screen.findByTestId("leave-review-button"));
    await user.click(screen.getByTestId("review-submit-button"));

    expect(await screen.findByTestId("review-submit-error")).toBeInTheDocument();
  });

  it("completed order shows Leave review", async () => {
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockCompletedOrder],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    expect(await screen.findByTestId("leave-review-button")).toBeInTheDocument();
  });

  it("already reviewed order shows Review submitted", async () => {
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockReviewedOrder],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    expect(await screen.findByTestId("review-submitted-label")).toBeInTheDocument();
  });

  it("submitting order review calls API", async () => {
    const user = userEvent.setup();
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockCompletedOrder],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(meApi.createMyOrderReview).mockResolvedValue({
      id: "review-id-002",
      business_id: "business-id-001",
      service_id: "order-service-id",
      service_name: "Build Telegram Bot",
      booking_id: null,
      booking_reference: null,
      order_id: null,
      order_reference: mockCompletedOrder.reference,
      customer_name: "Client Demo",
      rating: 4,
      comment: null,
      status: "published",
      created_at: "2026-07-01T10:00:00Z",
      updated_at: "2026-07-01T10:00:00Z",
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    await user.click(await screen.findByTestId("leave-review-button"));
    await user.click(screen.getByTestId("review-submit-button"));

    await waitFor(() => {
      expect(meApi.createMyOrderReview).toHaveBeenCalledWith(mockCompletedOrder.id, {
        rating: 5,
        comment: undefined,
      });
    });
  });
});
