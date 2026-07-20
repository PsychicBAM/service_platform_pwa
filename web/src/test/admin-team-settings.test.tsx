import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as adminApi from "@/api/adminApi";
import * as adminEmailApi from "@/api/adminEmailApi";
import * as miniSiteApi from "@/api/miniSiteApi";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { mockAdminBusiness, mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  updateBusiness: vi.fn(),
}));
vi.mock("@/api/adminEmailApi", () => ({
  getAdminEmailStatus: vi.fn(),
  sendAdminTestEmail: vi.fn(),
}));
vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

function renderTeamSettings() {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminSettingsPage />
    </AdminBusinessProvider>,
    { route: "/admin/settings?tab=team", path: "/admin/settings" },
  );
}

describe("admin team settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
    vi.mocked(adminApi.updateBusiness).mockResolvedValue(mockAdminBusiness);
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
    vi.mocked(adminEmailApi.getAdminEmailStatus).mockResolvedValue({
      enabled: false,
      dry_run: true,
      configured: false,
      provider: "brevo",
      host: null,
      port: 587,
      from_email: null,
      from_name: null,
      status: "disabled",
    });
  });

  it("renders the Team tab with polished card layout", async () => {
    renderTeamSettings();

    expect(await screen.findByTestId("admin-team-settings-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-team-tab")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("admin-team-overview-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-team-members-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-team-roles-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-team-invite-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-team-settings-card")).toBeInTheDocument();
  });

  it("shows only the real current owner and honest counts", async () => {
    renderTeamSettings();

    expect(await screen.findByTestId("admin-team-member-row")).toBeInTheDocument();
    expect(screen.getByText("Demo Owner")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();

    expect(screen.queryByText(/Mary Smith/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();

    expect(screen.getByTestId("admin-team-members-count")).toHaveTextContent("1");
    expect(screen.getByTestId("admin-team-admins-count")).toHaveTextContent("1");
    expect(screen.getByTestId("admin-team-staff-count")).toHaveTextContent("0");
    expect(screen.getByTestId("admin-team-viewers-count")).toHaveTextContent("0");
  });

  it("keeps invite, role management, and security controls coming soon", async () => {
    renderTeamSettings();

    expect(await screen.findByTestId("admin-team-invite-button")).toBeDisabled();
    expect(screen.getByTestId("admin-team-invite-button")).toHaveTextContent(/coming soon/i);

    expect(screen.getByTestId("admin-team-invite-email")).toBeDisabled();
    expect(screen.getByTestId("admin-team-invite-role")).toBeDisabled();
    expect(screen.getByTestId("admin-team-invite-message")).toBeDisabled();
    expect(screen.getByTestId("admin-team-send-invite")).toBeDisabled();

    expect(screen.getByTestId("admin-team-manage-roles")).toBeDisabled();
    expect(screen.getByTestId("admin-team-manage-roles")).toHaveTextContent(/coming soon/i);

    expect(within(screen.getByTestId("admin-team-role-staff")).getByText(/coming soon/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("admin-team-role-viewer")).getByText(/coming soon/i)).toBeInTheDocument();

    expect(screen.getByTestId("admin-team-security-coming-soon")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-team-settings-save")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });

  it("keeps other Settings tabs available", async () => {
    const user = userEvent.setup();
    renderTeamSettings();

    expect(await screen.findByTestId("admin-team-settings-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-settings-services-tab"));
    expect(await screen.findByTestId("admin-services-settings-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-settings-tab-business"));
    expect(await screen.findByTestId("admin-business-settings-layout")).toBeInTheDocument();
  });
});
