import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewRequestPage } from "@/pages/ReviewRequestPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as publicApi from "@/api/publicApi";
import * as adminApi from "@/api/adminApi";
import {
  BUSINESS_ID,
  mockOwnerUser,
  mockPublicBusiness,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";
import { ApiClientError } from "@/api/client";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/publicApi");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminBookings: vi.fn(),
    listAdminOrders: vi.fn(),
    createReviewRequestLink: vi.fn(),
  };
});

const REVIEW_TOKEN = "signed-review-token";

const mockReviewContext = {
  business_name: mockPublicBusiness.name,
  service_name: "Arabic Lesson",
  customer_name: "Client",
  type: "booking" as const,
  completed_at: "2026-06-20T11:00:00Z",
  already_reviewed: false,
  expires_at: "2026-08-01T00:00:00Z",
};

const mockCompletedAdminBooking = {
  id: "booking-admin-completed",
  reference: "BKG-ADMIN-001",
  status: "completed" as const,
  starts_at: "2026-06-20T10:00:00Z",
  ends_at: "2026-06-20T11:00:00Z",
  service_name: "Arabic Lesson",
  client_name: "Client Demo",
  client_email: "client@example.com",
  client_phone: null,
  has_review: false,
  can_review: true,
  follow_up_email_consent: false,
};

const mockReviewedAdminBooking = {
  ...mockCompletedAdminBooking,
  id: "booking-admin-reviewed",
  reference: "BKG-ADMIN-002",
  has_review: true,
  can_review: false,
};

const mockCompletedAdminOrder = {
  id: "order-admin-completed",
  reference: "ORD-ADMIN-001",
  status: "completed" as const,
  service_name: "Build Telegram Bot",
  client_name: "Client Demo",
  client_email: "client@example.com",
  client_phone: null,
  created_at: "2026-06-20T10:00:00Z",
  updated_at: "2026-06-20T12:00:00Z",
  has_review: false,
  can_review: true,
  follow_up_email_consent: false,
};

function renderAdminPage(page: ReactElement, route: string, path: string) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>{page}</AdminBusinessProvider>,
    { route, path },
  );
}

describe("review request links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
  });

  it("public review request page loads context and submits review", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getReviewRequestContext).mockResolvedValue(mockReviewContext);
    vi.mocked(publicApi.submitReviewRequest).mockResolvedValue({
      id: "review-id",
      business_id: BUSINESS_ID,
      service_id: "service-id",
      service_name: "Arabic Lesson",
      booking_id: null,
      booking_reference: "BKG-001",
      order_id: null,
      order_reference: null,
      customer_name: "Client",
      rating: 5,
      comment: "Nice",
      status: "published",
      created_at: "2026-07-01T10:00:00Z",
      updated_at: "2026-07-01T10:00:00Z",
    });

    renderRoute(<ReviewRequestPage />, {
      route: `/review/${REVIEW_TOKEN}`,
      path: "/review/:token",
    });

    expect(await screen.findByText(/how was your experience with/i)).toBeInTheDocument();
    await user.type(screen.getByTestId("review-request-comment"), "Nice");
    await user.click(screen.getByTestId("review-request-submit"));

    await waitFor(() => {
      expect(publicApi.submitReviewRequest).toHaveBeenCalledWith(REVIEW_TOKEN, {
        rating: 5,
        comment: "Nice",
      });
    });
    expect(await screen.findByTestId("review-request-success")).toHaveTextContent(
      "Thank you for your review.",
    );
  });

  it("expired review request state renders", async () => {
    vi.mocked(publicApi.getReviewRequestContext).mockRejectedValue(
      new ApiClientError(400, "REVIEW_REQUEST_TOKEN_EXPIRED", "This review link has expired."),
    );

    renderRoute(<ReviewRequestPage />, {
      route: `/review/${REVIEW_TOKEN}`,
      path: "/review/:token",
    });

    expect(await screen.findByText("This review link has expired.")).toBeInTheDocument();
  });

  it("already reviewed state renders", async () => {
    vi.mocked(publicApi.getReviewRequestContext).mockResolvedValue({
      ...mockReviewContext,
      already_reviewed: true,
    });

    renderRoute(<ReviewRequestPage />, {
      route: `/review/${REVIEW_TOKEN}`,
      path: "/review/:token",
    });

    expect(await screen.findByTestId("review-request-already-submitted")).toHaveTextContent(
      "Review already submitted.",
    );
  });

  it("admin completed booking shows Copy review link", async () => {
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [mockCompletedAdminBooking],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderAdminPage(<AdminBookingsPage />, "/admin/bookings", "/admin/bookings");

    expect(await screen.findByTestId("copy-review-link-button")).toBeInTheDocument();
  });

  it("copy review link calls API and copies link", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [mockCompletedAdminBooking],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(adminApi.createReviewRequestLink).mockResolvedValue({
      review_url: "http://localhost:5173/review/signed-token",
      expires_at: "2026-08-01T00:00:00Z",
      already_reviewed: false,
    });

    renderAdminPage(<AdminBookingsPage />, "/admin/bookings", "/admin/bookings");

    await user.click(await screen.findByTestId("copy-review-link-button"));

    await waitFor(() => {
      expect(adminApi.createReviewRequestLink).toHaveBeenCalledWith(BUSINESS_ID, {
        booking_id: mockCompletedAdminBooking.id,
      });
    });
    expect(
      await screen.findByText(/Review link copied\.|Review link ready — copy the URL below\./),
    ).toBeInTheDocument();
  });

  it("reviewed booking shows Review submitted instead of copy link", async () => {
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [mockReviewedAdminBooking],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderAdminPage(<AdminBookingsPage />, "/admin/bookings", "/admin/bookings");

    expect(await screen.findByTestId("admin-review-submitted")).toBeInTheDocument();
    expect(screen.queryByTestId("copy-review-link-button")).not.toBeInTheDocument();
  });

  it("admin completed order shows Copy review link", async () => {
    vi.mocked(adminApi.listAdminOrders).mockResolvedValue({
      data: [mockCompletedAdminOrder],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderAdminPage(<AdminOrdersPage />, "/admin/orders", "/admin/orders");

    expect(await screen.findByTestId("copy-review-link-button")).toBeInTheDocument();
  });
});
