import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminServicesPage } from "@/pages/admin/AdminServicesPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import {
  emptyListMeta,
  mockAdminBusiness,
  mockAdminServices,
  mockClientUser,
  mockOwnerUser,
  mockSchedule,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  getSchedule: vi.fn(),
  listAdminServices: vi.fn(),
  listAdminBookings: vi.fn(),
  listAdminOrders: vi.fn(),
  listAdminClients: vi.fn(),
  createAdminService: vi.fn(),
  updateAdminService: vi.fn(),
  deleteAdminService: vi.fn(),
}));

function setupAdminApiMocks() {
  vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
  vi.mocked(adminApi.getSchedule).mockResolvedValue(mockSchedule);
  vi.mocked(adminApi.listAdminServices).mockResolvedValue({
    data: mockAdminServices,
    meta: { page: 1, limit: 100, total: mockAdminServices.length },
  });
  vi.mocked(adminApi.listAdminBookings).mockResolvedValue({ data: [], meta: emptyListMeta });
  vi.mocked(adminApi.listAdminOrders).mockResolvedValue({ data: [], meta: emptyListMeta });
  vi.mocked(adminApi.listAdminClients).mockResolvedValue({ data: [], meta: emptyListMeta });
}

function renderAdminPage(page: ReactElement) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route: "/admin", path: "/admin/*" },
  );
}

describe("admin pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminApiMocks();
  });

  it("J. non-authenticated /admin shows login prompt", () => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());

    renderRoute(<AdminGuard />, { route: "/admin", path: "/admin/*" });

    expect(screen.getByRole("heading", { name: /^admin$/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in with a business account to access admin."),
    ).toBeInTheDocument();
  });

  it("K. client user without business membership cannot access /admin", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<AdminGuard />, { route: "/admin", path: "/admin/*" });

    expect(screen.getByText("No business access")).toBeInTheDocument();
  });

  it("L. owner user can render admin dashboard with mocked business", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderAdminPage(<AdminDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(`Overview for ${mockAdminBusiness.name}`)).toBeInTheDocument();
    expect(screen.getByText("Appointments and requests")).toBeInTheDocument();
  });

  it("M. admin services page renders mocked services", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderAdminPage(<AdminServicesPage />);

    expect(await screen.findByRole("heading", { name: "Services" })).toBeInTheDocument();
    expect(await screen.findByText(mockAdminServices[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockAdminServices[1].name)).toBeInTheDocument();
  });
});
