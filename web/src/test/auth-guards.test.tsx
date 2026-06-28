import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { MyOrderDetailPage } from "@/pages/MyOrderDetailPage";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import {
  ORDER_ID,
  mockClientUser,
  mockMyOrder,
  mockMyOrderDetail,
  mockOrderMessage,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");

describe("auth and client pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("G. unauthenticated /me/bookings shows login prompt", () => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());

    renderRoute(<MyBookingsPage />, {
      route: "/me/bookings",
      path: "/me/bookings",
    });

    expect(screen.getByRole("heading", { name: /my bookings/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
  });

  it("H. authenticated /me/orders renders mocked order list", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.listMyOrders).mockResolvedValue({
      data: [mockMyOrder],
      meta: { page: 1, limit: 20, total: 1 },
    });

    renderRoute(<MyOrdersPage />, {
      route: "/me/orders",
      path: "/me/orders",
    });

    expect(await screen.findByText(mockMyOrder.reference)).toBeInTheDocument();
    expect(screen.getByText(mockMyOrder.service.name)).toBeInTheDocument();
  });

  it("I. order detail renders mocked messages", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.getMyOrder).mockResolvedValue(mockMyOrderDetail);
    vi.mocked(meApi.listOrderMessages).mockResolvedValue({
      data: [mockOrderMessage],
      meta: { page: 1, limit: 50, total: 1 },
    });

    renderRoute(<MyOrderDetailPage />, {
      route: `/me/orders/${ORDER_ID}`,
      path: "/me/orders/:orderId",
    });

    expect(await screen.findByText(mockMyOrderDetail.reference)).toBeInTheDocument();
    expect(await screen.findByText(mockOrderMessage.body)).toBeInTheDocument();
    expect(screen.getByText("Messages refresh automatically.")).toBeInTheDocument();
  });
});
