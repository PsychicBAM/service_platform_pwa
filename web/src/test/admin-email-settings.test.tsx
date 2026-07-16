import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  updateBusiness: vi.fn(),
}));
vi.mock("@/api/adminEmailApi", () => ({
  getAdminEmailStatus: vi.fn(),
  sendAdminTestEmail: vi.fn(),
}));
vi.mock("@/api/billingApi", () => ({
  createBillingCheckoutSession: vi.fn(),
}));
vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));

function renderSettingsPage(page: ReactElement = <AdminSettingsPage />) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route: "/admin/settings", path: "/admin/settings" },
  );
}

describe("admin email delivery settings", () => {
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

  it("renders Email delivery section", async () => {
    renderSettingsPage();

    const section = await screen.findByTestId("admin-email-delivery-section");
    expect(within(section).getByText("Email delivery")).toBeInTheDocument();
    expect(
      within(section).getByText(/controlled by server environment variables/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/smtp.?password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SMTP_PASSWORD/i)).not.toBeInTheDocument();
  });

  it("shows Disabled status pill", async () => {
    renderSettingsPage();

    expect(await screen.findByTestId("admin-email-status-pill")).toHaveTextContent("Disabled");
  });

  it("shows Dry-run status and Brevo host when dry-run", async () => {
    vi.mocked(adminEmailApi.getAdminEmailStatus).mockResolvedValue({
      enabled: true,
      dry_run: true,
      configured: true,
      provider: "brevo",
      host: "smtp-relay.brevo.com",
      port: 587,
      from_email: "noreply@example.com",
      from_name: "Service Platform",
      status: "dry_run",
    });

    renderSettingsPage();

    expect(await screen.findByTestId("admin-email-status-pill")).toHaveTextContent("Dry-run");
    expect(await screen.findByTestId("admin-email-status-details")).toHaveTextContent(
      "Brevo SMTP",
    );
    expect(screen.getByText("smtp-relay.brevo.com")).toBeInTheDocument();
    expect(screen.getByText("noreply@example.com")).toBeInTheDocument();
  });

  it("submits test email and shows dry-run message", async () => {
    const user = userEvent.setup();
    vi.mocked(adminEmailApi.sendAdminTestEmail).mockResolvedValue({
      ok: true,
      dry_run: true,
      message: "Email is in dry-run mode. No email was sent.",
      message_code: "EMAIL_DRY_RUN",
    });

    renderSettingsPage();
    await screen.findByTestId("admin-email-delivery-section");

    await user.type(screen.getByTestId("admin-email-test-input"), "test@example.com");
    await user.click(screen.getByTestId("admin-email-test-submit"));

    expect(await screen.findByTestId("admin-email-test-feedback")).toHaveTextContent(
      /Dry-run: no email was sent/i,
    );
    expect(adminEmailApi.sendAdminTestEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("shows sent message when live test succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(adminEmailApi.getAdminEmailStatus).mockResolvedValue({
      enabled: true,
      dry_run: false,
      configured: true,
      provider: "brevo",
      host: "smtp-relay.brevo.com",
      port: 587,
      from_email: "noreply@example.com",
      from_name: "Service Platform",
      status: "ready",
    });
    vi.mocked(adminEmailApi.sendAdminTestEmail).mockResolvedValue({
      ok: true,
      dry_run: false,
      message: "Test email sent.",
      message_code: "EMAIL_SENT",
    });

    renderSettingsPage();
    await screen.findByTestId("admin-email-status-pill");

    await user.type(screen.getByTestId("admin-email-test-input"), "live@example.com");
    await user.click(screen.getByTestId("admin-email-test-submit"));

    expect(await screen.findByTestId("admin-email-test-feedback")).toHaveTextContent(
      /Test email sent/i,
    );
  });

  it("shows configuration incomplete error", async () => {
    const user = userEvent.setup();
    vi.mocked(adminEmailApi.sendAdminTestEmail).mockRejectedValue(
      new ApiClientError(400, "VALIDATION_ERROR", "Email configuration is incomplete."),
    );

    renderSettingsPage();
    await screen.findByTestId("admin-email-delivery-section");

    await user.type(screen.getByTestId("admin-email-test-input"), "test@example.com");
    await user.click(screen.getByTestId("admin-email-test-submit"));

    expect(await screen.findByTestId("admin-email-test-feedback")).toHaveTextContent(
      /Email configuration is incomplete/i,
    );
  });

  it("keeps email section usable on narrow viewports", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    renderSettingsPage();

    const section = await screen.findByTestId("admin-email-delivery-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByTestId("admin-email-test-input")).toHaveClass("w-full");
    expect(screen.getByTestId("admin-email-test-submit")).toHaveClass("w-full");
    await waitFor(() => {
      expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth + 1);
    });
  });
});
