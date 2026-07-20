import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as adminApi from "@/api/adminApi";
import * as adminEmailApi from "@/api/adminEmailApi";
import * as authApi from "@/api/authApi";
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
vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    changePassword: vi.fn(),
  };
});
vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

function renderSettingsPage(page: ReactElement = <AdminSettingsPage />) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>{page}</AdminBusinessProvider>,
    { route: "/admin/settings", path: "/admin/settings" },
  );
}

describe("admin business settings redesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
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

  it("renders redesigned business cards and security section", async () => {
    renderSettingsPage();

    expect(await screen.findByTestId("admin-business-settings-form")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-profile-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-details-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-operating-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-summary-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-readonly-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-security-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-logo-avatar")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-logo-upload-button")).toBeInTheDocument();
    expect(screen.queryByLabelText(/logo image url/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-save")).toHaveTextContent("Save changes");
    expect(screen.getByTestId("admin-business-preview-public")).toHaveAttribute(
      "href",
      `/b/${mockAdminBusiness.slug}`,
    );
  });

  it("updates password through real change-password API", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.changePassword).mockResolvedValue({ changed: true });

    renderSettingsPage();
    await screen.findByTestId("admin-settings-security-card");

    await user.type(screen.getByTestId("admin-security-current-password"), "securePass123");
    await user.type(screen.getByTestId("admin-security-new-password"), "NewPassword456!");
    await user.type(screen.getByTestId("admin-security-confirm-password"), "NewPassword456!");
    await user.click(screen.getByTestId("admin-settings-security-save"));

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith("securePass123", "NewPassword456!");
    });
    expect(await screen.findByTestId("admin-settings-security-success")).toHaveTextContent(
      "Password updated successfully.",
    );
  });

  it("shows password error without fake success", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.changePassword).mockRejectedValue(
      new ApiClientError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect."),
    );

    renderSettingsPage();
    await screen.findByTestId("admin-settings-security-card");

    await user.type(screen.getByTestId("admin-security-current-password"), "wrong");
    await user.type(screen.getByTestId("admin-security-new-password"), "NewPassword456!");
    await user.type(screen.getByTestId("admin-security-confirm-password"), "NewPassword456!");
    await user.click(screen.getByTestId("admin-settings-security-save"));

    expect(await screen.findByTestId("admin-settings-security-error")).toHaveTextContent(
      "Current password is incorrect.",
    );
    expect(screen.queryByTestId("admin-settings-security-success")).not.toBeInTheDocument();
  });
});
