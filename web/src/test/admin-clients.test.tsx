import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminClientsPage } from "@/pages/admin/AdminClientsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import {
  BUSINESS_ID,
  emptyListMeta,
  mockOwnerUser,
} from "@/test/mock-fixtures";
import type { ClientDetail, ClientListItem } from "@/types/api";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminClients: vi.fn(),
    getAdminClient: vi.fn(),
    updateAdminClient: vi.fn(),
  };
});

const CLIENT_ID = "client-id-001";

const longEmail =
  "verylong.client.email.address.that.should.truncate@example-business-domain.com";

const mockClientListItem: ClientListItem = {
  id: CLIENT_ID,
  full_name: "Alexandra Client-With-A-Very-Long-Name",
  email: longEmail,
  phone: "+1-555-000-9999",
  source: "guest",
  bookings_count: 2,
  orders_count: 1,
  last_activity_at: "2026-06-30T10:00:00Z",
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
};

const mockClientDetail: ClientDetail = {
  id: CLIENT_ID,
  business_id: BUSINESS_ID,
  user_id: null,
  full_name: mockClientListItem.full_name,
  email: longEmail,
  phone: "+1-555-000-9999",
  notes: null,
  source: "guest",
  bookings_count: 2,
  orders_count: 1,
  last_activity_at: "2026-06-30T10:00:00Z",
  bookings: [
    {
      id: "booking-1",
      reference: "BK-001",
      status: "confirmed",
      service_name: "Haircut",
      starts_at: "2026-07-01T10:00:00Z",
      ends_at: "2026-07-01T10:30:00Z",
    },
  ],
  orders: [
    {
      id: "order-1",
      reference: "ORD-001",
      status: "submitted",
      service_name: "Build Telegram Bot",
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
    },
  ],
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
};

function renderClientsPage(route = "/admin/clients") {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminClientsPage />
    </AdminBusinessProvider>,
    { route, path: "/admin/clients" },
  );
}

describe("AdminClientsPage mobile UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminClients).mockResolvedValue({
      data: [mockClientListItem],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.getAdminClient).mockResolvedValue(mockClientDetail);
    vi.mocked(adminApi.updateAdminClient).mockResolvedValue(mockClientDetail);
  });

  it("renders mobile-friendly client cards with name, contact, counts, and view action", async () => {
    renderClientsPage();

    const list = await screen.findByTestId("admin-clients-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const card = screen.getByTestId("admin-client-card");
    expect(card).toHaveTextContent("Alexandra Client-With-A-Very-Long-Name");
    expect(card).toHaveTextContent(longEmail);
    expect(card).toHaveTextContent("+1-555-000-9999");
    expect(card).toHaveTextContent("2 bookings");
    expect(card).toHaveTextContent("1 order");
    expect(card).toHaveTextContent("Guest");
    expect(screen.getByTestId(`admin-client-view-${CLIENT_ID}`)).toBeInTheDocument();
    expect(card.className).toMatch(/overflow-hidden/);
    const contactLine = within(card).getByText((content) => content.includes(longEmail));
    expect(contactLine.className).toMatch(/truncate/);
  });

  it("renders empty state when no clients exist", async () => {
    vi.mocked(adminApi.listAdminClients).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });

    renderClientsPage();

    expect(await screen.findByTestId("admin-clients-empty")).toBeInTheDocument();
    expect(screen.getByText("No clients yet")).toBeInTheDocument();
    expect(
      screen.getByText("Clients will appear here after bookings or service requests."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View bookings" })).toHaveAttribute(
      "href",
      "/admin/bookings",
    );
    expect(screen.getByRole("link", { name: "View orders" })).toHaveAttribute(
      "href",
      "/admin/orders",
    );
  });

  it("keeps search control full-width and usable", async () => {
    const user = userEvent.setup();
    renderClientsPage();

    const search = await screen.findByLabelText("Search clients");
    expect(search).toHaveClass("w-full");
    expect(screen.getByTestId("admin-clients-search")).toBeInTheDocument();

    await user.type(search, "Alex");
    await waitFor(() => {
      expect(adminApi.listAdminClients).toHaveBeenCalledWith(
        BUSINESS_ID,
        expect.objectContaining({ search: "Alex" }),
      );
    });
  });

  it("opens detail panel with stacked history and safe contact wrapping", async () => {
    const user = userEvent.setup();
    renderClientsPage();

    await user.click(await screen.findByTestId(`admin-client-view-${CLIENT_ID}`));
    const panel = await screen.findByTestId("admin-client-detail-panel");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent(longEmail);
    expect(panel).toHaveTextContent("BK-001");
    expect(panel).toHaveTextContent("ORD-001");
    expect(panel).toHaveTextContent("Recent bookings");
    expect(panel).toHaveTextContent("Recent orders");
    expect(within(panel).getByText(longEmail).className).toMatch(/break-all/);
  });
});
