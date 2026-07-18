import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { AdminReviewsPage } from "@/pages/admin/AdminReviewsPage";
import * as adminApi from "@/api/adminApi";
import { mockOwnerUser, BUSINESS_ID } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminReviews: vi.fn(),
    updateAdminReviewStatus: vi.fn(),
  };
});

function renderAdminPage(page: ReactElement) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>{page}</AdminBusinessProvider>,
    { route: "/admin/reviews", path: "/admin/reviews" },
  );
}

describe("AdminReviewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminReviews).mockResolvedValue([
      {
        id: "review-1",
        business_id: BUSINESS_ID,
        service_id: "svc-1",
        service_name: "Arabic Lesson",
        booking_id: "booking-1",
        booking_reference: "BK-001",
        order_id: null,
        order_reference: null,
        customer_name: "Olga",
        rating: 5,
        comment: "Great service",
        status: "published",
        created_at: "2026-06-20T08:00:00Z",
        updated_at: "2026-06-20T08:00:00Z",
      },
    ]);
    vi.mocked(adminApi.updateAdminReviewStatus).mockResolvedValue({
      id: "review-1",
      business_id: BUSINESS_ID,
      service_id: "svc-1",
      service_name: "Arabic Lesson",
      booking_id: "booking-1",
      booking_reference: "BK-001",
      order_id: null,
      order_reference: null,
      customer_name: "Olga",
      rating: 5,
      comment: "Great service",
      status: "hidden",
      created_at: "2026-06-20T08:00:00Z",
      updated_at: "2026-06-20T08:00:00Z",
    });
  });

  it("renders reviews list", async () => {
    renderAdminPage(<AdminReviewsPage />);

    expect(await screen.findByRole("heading", { name: "Reviews" })).toBeInTheDocument();
    const card = await screen.findByTestId("admin-review-card");
    expect(card).toHaveTextContent("Olga");
    expect(card).toHaveTextContent("Arabic Lesson");
  });

  it("can hide a published review", async () => {
    const user = userEvent.setup();
    renderAdminPage(<AdminReviewsPage />);

    await user.click(await screen.findByTestId("admin-review-actions-menu"));
    expect(await screen.findByTestId("admin-review-actions-menu-panel")).toBeInTheDocument();
    await user.click(await screen.findByTestId("admin-review-hide-review-1"));

    await waitFor(() => {
      expect(adminApi.updateAdminReviewStatus).toHaveBeenCalledWith(
        BUSINESS_ID,
        "review-1",
        "hidden",
      );
    });
  });
});

