import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import {
  BUSINESS_ID,
  ORDER_ID,
  emptyListMeta,
  mockOwnerUser,
} from "@/test/mock-fixtures";
import type { AdminOrderRead } from "@/types/api";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminOrders: vi.fn(),
    getAdminOrder: vi.fn(),
    listAdminOrderMessages: vi.fn(),
    acceptAdminOrder: vi.fn(),
    completeAdminOrder: vi.fn(),
    cancelAdminOrder: vi.fn(),
    markAdminOrderInProgress: vi.fn(),
    declineAdminOrder: vi.fn(),
    updateAdminOrder: vi.fn(),
    sendAdminOrderMessage: vi.fn(),
  };
});

const mockOrderListItem = {
  id: ORDER_ID,
  reference: "ORD-001",
  status: "submitted" as const,
  service_name: "Build Telegram Bot",
  client_name: "Client Demo",
  client_email: "client@example.com",
  client_phone: null,
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
  has_review: false,
  can_review: false,
  follow_up_email_consent: false,
          review_request_email_sent_at: null,
};

const mockAdminOrderDetail: AdminOrderRead = {
  id: ORDER_ID,
  business_id: BUSINESS_ID,
  reference: "ORD-001",
  status: "submitted",
  form_data: { details: "Need a bot for bookings." },
  quoted_price_cents: null,
  admin_notes: null,
  decline_reason: null,
  accepted_at: null,
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
    id: "client-1",
    full_name: "Client Demo",
    email: "client@example.com",
    phone: null,
  },
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
  follow_up_email_consent: false,
          review_request_email_sent_at: null,
};

function renderOrdersPage(route = "/admin/orders") {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminOrdersPage />
    </AdminBusinessProvider>,
    { route, path: "/admin/orders" },
  );
}

describe("AdminOrdersPage mobile UX and confirms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminOrders).mockResolvedValue({
      data: [mockOrderListItem],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.getAdminOrder).mockResolvedValue(mockAdminOrderDetail);
    vi.mocked(adminApi.listAdminOrderMessages).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.acceptAdminOrder).mockResolvedValue({
      ...mockAdminOrderDetail,
      status: "accepted",
    });
    vi.mocked(adminApi.completeAdminOrder).mockResolvedValue({
      ...mockAdminOrderDetail,
      status: "completed",
    });
  });

  it("renders mobile-friendly order cards with client/service/status/actions", async () => {
    renderOrdersPage();

    const list = await screen.findByTestId("admin-orders-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const card = screen.getByTestId("admin-order-card");
    expect(card).toHaveTextContent("Client Demo");
    expect(card).toHaveTextContent("Build Telegram Bot");
    expect(card).toHaveTextContent("ORD-001");
    expect(card).toHaveTextContent("Submitted");
    expect(card).toHaveTextContent("client@example.com");
    expect(screen.getByTestId(`admin-order-view-${ORDER_ID}`)).toBeInTheDocument();
  });

  it("opens custom confirm dialog for Accept without window.confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderOrdersPage();

    await user.click(await screen.findByTestId(`admin-order-view-${ORDER_ID}`));
    expect(await screen.findByTestId("admin-order-detail-panel")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-order-action-accept"));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("admin-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accept request?" })).toBeInTheDocument();
    expect(screen.getByText("This request will be marked as accepted.")).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-confirm")).toHaveTextContent("Accept");

    await user.click(screen.getByTestId("admin-confirm-dialog-cancel"));
    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    expect(adminApi.acceptAdminOrder).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("confirm Accept calls acceptAdminOrder", async () => {
    const user = userEvent.setup();

    renderOrdersPage();

    await user.click(await screen.findByTestId(`admin-order-view-${ORDER_ID}`));
    await user.click(await screen.findByTestId("admin-order-action-accept"));
    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(adminApi.acceptAdminOrder).toHaveBeenCalledWith(
        BUSINESS_ID,
        ORDER_ID,
        expect.objectContaining({ start_work: false }),
      );
    });
  });

  it("complete action opens custom success dialog and calls complete API", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(adminApi.getAdminOrder).mockResolvedValue({
      ...mockAdminOrderDetail,
      status: "in_progress",
      accepted_at: "2026-06-30T11:00:00Z",
    });

    renderOrdersPage();

    await user.click(await screen.findByTestId(`admin-order-view-${ORDER_ID}`));
    await user.click(await screen.findByTestId("admin-order-action-complete"));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", { name: "Mark request as completed?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-confirm")).toHaveTextContent(
      "Mark completed",
    );

    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(adminApi.completeAdminOrder).toHaveBeenCalledWith(BUSINESS_ID, ORDER_ID);
    });
    confirmSpy.mockRestore();
  });

  it("detail panel messages section remains available", async () => {
    const user = userEvent.setup();
    renderOrdersPage();

    await user.click(await screen.findByTestId(`admin-order-view-${ORDER_ID}`));
    expect(await screen.findByTestId("admin-order-messages")).toBeInTheDocument();
    expect(screen.getByText("Messages refresh automatically.")).toBeInTheDocument();
    expect(screen.getByText("Need a bot for bookings.")).toBeInTheDocument();
  });
});
