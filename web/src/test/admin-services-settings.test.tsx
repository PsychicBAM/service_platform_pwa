import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as adminApi from "@/api/adminApi";
import * as adminEmailApi from "@/api/adminEmailApi";
import * as miniSiteApi from "@/api/miniSiteApi";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { mockAdminBusiness, mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";
import type { BusinessAdminRead } from "@/types/api";

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

function renderServicesSettings() {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminSettingsPage />
    </AdminBusinessProvider>,
    { route: "/admin/settings?tab=services", path: "/admin/settings" },
  );
}

describe("admin services settings", () => {
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

  it("renders simplified tax block without duplicate price-display control", async () => {
    renderServicesSettings();

    expect(await screen.findByTestId("admin-services-settings-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-tax-block")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-tax")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-tax-percent")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-show-tax-note")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-tax-preview")).toHaveTextContent(/Example:/i);
    expect(screen.queryByTestId("admin-services-price-display")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Price display$/i)).not.toBeInTheDocument();

    expect(within(screen.getByTestId("admin-services-currency")).getByText(/RUB/)).toBeInTheDocument();

    const addons = screen.getByTestId("admin-services-addons-card");
    expect(within(addons).getByText(/coming soon/i)).toBeInTheDocument();
    expect(within(addons).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(addons).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("updates tax preview while editing", async () => {
    const user = userEvent.setup();
    renderServicesSettings();
    await screen.findByTestId("admin-services-settings-page");

    await user.selectOptions(screen.getByTestId("admin-services-tax"), "inclusive");
    expect(screen.getByTestId("admin-services-tax-preview")).toHaveTextContent(/includes 10% tax/i);

    await user.clear(screen.getByTestId("admin-services-tax-percent"));
    await user.type(screen.getByTestId("admin-services-tax-percent"), "7.5");
    expect(screen.getByTestId("admin-services-tax-preview")).toHaveTextContent(/includes 7.5% tax/i);

    await user.selectOptions(screen.getByTestId("admin-services-tax"), "exclusive");
    expect(screen.getByTestId("admin-services-tax-preview")).toHaveTextContent(/\+ 7.5% tax/i);
    expect(screen.getByTestId("admin-services-tax-preview")).toHaveTextContent(/total/i);
  });

  it("saves currency and tax settings through updateBusiness after API success", async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: BusinessAdminRead) => void) | undefined;
    vi.mocked(adminApi.updateBusiness).mockImplementation(
      () =>
        new Promise<BusinessAdminRead>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    renderServicesSettings();
    await screen.findByTestId("admin-services-settings-page");

    await user.selectOptions(screen.getByTestId("admin-services-currency"), "RUB");
    await user.selectOptions(screen.getByTestId("admin-services-tax"), "exclusive");
    await user.clear(screen.getByTestId("admin-services-tax-percent"));
    await user.type(screen.getByTestId("admin-services-tax-percent"), "7.5");
    await user.click(screen.getByTestId("admin-services-settings-save"));

    expect(screen.queryByTestId("admin-services-settings-success")).not.toBeInTheDocument();
    expect(adminApi.updateBusiness).toHaveBeenCalled();
    const payload = vi.mocked(adminApi.updateBusiness).mock.calls[0]?.[1];
    expect(payload?.settings?.service_currency).toBe("RUB");
    expect(payload?.settings?.tax_mode).toBe("exclusive");
    expect(payload?.settings?.tax_rate_percent).toBe(7.5);
    expect(payload?.settings?.show_tax_note_to_customers).toBe(true);

    resolveUpdate?.({
      ...mockAdminBusiness,
      settings: {
        ...mockAdminBusiness.settings,
        service_currency: "RUB",
        tax_mode: "exclusive",
        tax_rate_percent: 7.5,
        show_tax_note_to_customers: true,
      },
    });

    expect(await screen.findByTestId("admin-services-settings-success")).toHaveTextContent(
      "Service settings saved.",
    );
  });

  it("shows API error without fake success", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateBusiness).mockRejectedValue(
      new ApiClientError(500, "SERVER_ERROR", "Could not update business settings."),
    );

    renderServicesSettings();
    await screen.findByTestId("admin-services-settings-page");
    await user.click(screen.getByTestId("admin-services-settings-save"));

    expect(await screen.findByTestId("admin-services-settings-error")).toHaveTextContent(
      "Could not update business settings.",
    );
    expect(screen.queryByTestId("admin-services-settings-success")).not.toBeInTheDocument();
  });

  it("blocks invalid tax percentage save with field errors", async () => {
    const user = userEvent.setup();
    renderServicesSettings();
    await screen.findByTestId("admin-services-settings-page");

    await user.selectOptions(screen.getByTestId("admin-services-tax"), "inclusive");
    await user.clear(screen.getByTestId("admin-services-tax-percent"));
    await user.type(screen.getByTestId("admin-services-tax-percent"), "150");
    await user.click(screen.getByTestId("admin-services-settings-save"));

    expect(await screen.findByTestId("admin-services-settings-error")).toBeInTheDocument();
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
    expect(screen.getByText(/tax percentage must be between 0 and 100/i)).toBeInTheDocument();
  });

  it("resets services settings defaults in the form", async () => {
    const user = userEvent.setup();
    renderServicesSettings();
    await screen.findByTestId("admin-services-settings-page");

    await user.selectOptions(screen.getByTestId("admin-services-currency"), "RUB");
    await user.click(screen.getByTestId("admin-services-settings-reset"));

    expect(screen.getByTestId("admin-services-currency")).toHaveValue("USD");
    expect(screen.getByTestId("admin-services-tax")).toHaveValue("none");
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
  });
});
