import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MyOrderDetailPage } from "@/pages/MyOrderDetailPage";
import { AdminOrderDetailPanel } from "@/components/admin/AdminOrderDetailPanel";
import { useAuth } from "@/hooks/useAuth";
import * as meApi from "@/api/meApi";
import * as adminApi from "@/api/adminApi";
import {
  BUSINESS_ID,
  ORDER_ID,
  mockClientUser,
  mockMyOrderDetail,
  mockOrderMessage,
} from "@/test/mock-fixtures";
import type { AdminOrderRead, OrderMessageRead } from "@/types/api";
import {
  mockAuthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");
vi.mock("@/api/adminApi");

const listMeta = { page: 1, limit: 50, total: 2 };

const mockAdminOrder: AdminOrderRead = {
  id: ORDER_ID,
  business_id: BUSINESS_ID,
  reference: "ORD-2026-0002",
  status: "in_progress",
  form_data: { details: "Project brief" },
  quoted_price_cents: null,
  admin_notes: null,
  decline_reason: null,
  accepted_at: "2026-06-30T11:00:00Z",
  completed_at: null,
  service: {
    id: "service-id",
    name: "Build Telegram Bot",
    type: "order",
    price_cents: 15000,
    price_type: "fixed",
    currency: "USD",
  },
  client: {
    id: mockClientUser.id,
    full_name: "Client Demo",
    email: "client@example.com",
    phone: null,
  },
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
  follow_up_email_consent: false,
          review_request_email_sent_at: null,
};

describe("order message notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. MyOrderDetailPage renders auto-refresh hint", async () => {
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

    expect(await screen.findByText("Messages refresh automatically.")).toBeInTheDocument();
  });

  it("B. MyOrderDetailPage shows notification for new admin message after initial load", async () => {
    const adminMessage: OrderMessageRead = {
      ...mockOrderMessage,
      id: "admin-message-001",
      sender_type: "admin",
      sender_user_id: null,
      body: "We received your update.",
    };

    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.getMyOrder).mockResolvedValue(mockMyOrderDetail);
    vi.mocked(meApi.listOrderMessages)
      .mockResolvedValueOnce({
        data: [mockOrderMessage],
        meta: { page: 1, limit: 50, total: 1 },
      })
      .mockResolvedValue({
        data: [mockOrderMessage, adminMessage],
        meta: listMeta,
      });

    const { queryClient } = renderRoute(<MyOrderDetailPage />, {
      route: `/me/orders/${ORDER_ID}`,
      path: "/me/orders/:orderId",
    });

    await screen.findByText(mockOrderMessage.body);
    expect(screen.queryByText("New message from admin")).not.toBeInTheDocument();

    await queryClient.invalidateQueries({ queryKey: ["my-order", ORDER_ID, "messages"] });

    expect(await screen.findByText("New message from admin")).toBeInTheDocument();
    expect(await screen.findByText(adminMessage.body)).toBeInTheDocument();
  });

  it("C. AdminOrderDetailPanel shows notification for new client message after initial load", async () => {
    const adminMessage: OrderMessageRead = {
      ...mockOrderMessage,
      id: "admin-message-002",
      sender_type: "admin",
      sender_user_id: null,
      body: "Thanks for the details.",
    };
    const newClientMessage: OrderMessageRead = {
      ...mockOrderMessage,
      id: "client-message-002",
      sender_type: "client",
      body: "Here is an extra note.",
    };

    vi.mocked(adminApi.getAdminOrder).mockResolvedValue(mockAdminOrder);
    vi.mocked(adminApi.listAdminOrderMessages)
      .mockResolvedValueOnce({
        data: [adminMessage],
        meta: { page: 1, limit: 50, total: 1 },
      })
      .mockResolvedValue({
        data: [adminMessage, newClientMessage],
        meta: listMeta,
      });

    const { queryClient } = renderRoute(
      <AdminOrderDetailPanel
        businessId={BUSINESS_ID}
        orderId={ORDER_ID}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />,
      { route: "/", path: "/" },
    );

    await screen.findByText(adminMessage.body);
    expect(screen.queryByText("New message from client")).not.toBeInTheDocument();

    await queryClient.invalidateQueries({
      queryKey: ["admin-order", BUSINESS_ID, ORDER_ID, "messages"],
    });

    await waitFor(() => {
      expect(screen.getByText("New message from client")).toBeInTheDocument();
    });
    expect(await screen.findByText(newClientMessage.body)).toBeInTheDocument();
  });
});
