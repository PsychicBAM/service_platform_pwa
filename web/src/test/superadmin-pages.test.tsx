import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { SuperadminGuard } from "@/components/SuperadminGuard";
import { SuperadminBusinessesPage } from "@/pages/superadmin/SuperadminBusinessesPage";
import { SuperadminAuditLogsPage } from "@/pages/superadmin/SuperadminAuditLogsPage";
import { useAuth } from "@/hooks/useAuth";
import * as superadminApi from "@/api/superadminApi";
import {
  emptyListMeta,
  mockAuditLog,
  mockOwnerUser,
  mockSuperadminBusiness,
  mockSuperadminUser,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/superadminApi", () => ({
  listSuperadminBusinesses: vi.fn(),
  listAuditLogs: vi.fn(),
  getSuperadminBusiness: vi.fn(),
  updateSuperadminBusiness: vi.fn(),
}));

describe("superadmin pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("N. owner user cannot access /superadmin", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderRoute(<SuperadminGuard />, { route: "/superadmin", path: "/superadmin/*" });

    expect(screen.getByText("Superadmin access required")).toBeInTheDocument();
  });

  it("O. superadmin user can render businesses with mocked business", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockSuperadminUser));
    vi.mocked(superadminApi.listSuperadminBusinesses).mockResolvedValue({
      data: [mockSuperadminBusiness],
      meta: { ...emptyListMeta, total: 1 },
    });

    renderRoute(<SuperadminBusinessesPage />, {
      route: "/superadmin/businesses",
      path: "/superadmin/businesses",
    });

    expect(await screen.findByRole("heading", { name: "Businesses" })).toBeInTheDocument();
    expect(await screen.findByText(mockSuperadminBusiness.name)).toBeInTheDocument();
    expect(screen.getByText(mockSuperadminBusiness.slug)).toBeInTheDocument();
  });

  it("P. audit logs page renders mocked log", async () => {
    vi.mocked(superadminApi.listAuditLogs).mockResolvedValue({
      data: [mockAuditLog],
      meta: { ...emptyListMeta, total: 1 },
    });

    renderRoute(<SuperadminAuditLogsPage />, {
      route: "/superadmin/audit-logs",
      path: "/superadmin/audit-logs",
    });

    expect(await screen.findByRole("heading", { name: "Audit logs" })).toBeInTheDocument();
    expect(await screen.findByText(mockAuditLog.action)).toBeInTheDocument();
  });
});
