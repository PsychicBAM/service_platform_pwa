import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
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

function renderNotificationsSettings() {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminSettingsPage />
    </AdminBusinessProvider>,
    { route: "/admin/settings?tab=notifications", path: "/admin/settings" },
  );
}

describe("admin notifications settings", () => {
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

  it("renders polished notifications layout", async () => {
    renderNotificationsSettings();

    expect(await screen.findByTestId("admin-notifications-settings-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-notifications-tab")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("admin-notifications-overview-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-channels-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-preferences-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-events-card")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-templates-card")).toBeInTheDocument();
  });

  it("shows email as real and unsupported channels as coming soon", async () => {
    renderNotificationsSettings();

    expect(await screen.findByTestId("admin-notification-channel-email")).toHaveTextContent(/Active/i);
    expect(within(screen.getByTestId("admin-notification-channel-sms")).getByText(/coming soon/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("admin-notification-channel-in-app")).getByText(/coming soon/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("admin-notification-channel-push")).getByText(/coming soon/i)).toBeInTheDocument();

    expect(screen.getByTestId("admin-notification-event-sms-coming-soon")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-event-in-app-coming-soon")).toBeInTheDocument();
    expect(screen.getByTestId("admin-notification-quiet-hours")).toHaveTextContent(/not enforced/i);
  });

  it("edits and saves the review request template", async () => {
    const user = userEvent.setup();
    renderNotificationsSettings();

    const subject = await screen.findByTestId("admin-notification-template-subject");
    fireEvent.change(subject, { target: { value: "Please review {business_name}" } });

    const body = screen.getByTestId("admin-notification-template-body");
    fireEvent.change(body, {
      target: { value: "Hi {client_name}. Link: {review_link}" },
    });

    expect(screen.getByTestId("admin-notification-template-preview")).toHaveTextContent(
      /Please review Demo Service Business/i,
    );

    await user.click(screen.getByTestId("admin-notification-template-save"));

    expect(await screen.findByTestId("admin-notification-template-success")).toHaveTextContent(
      /saved/i,
    );
    expect(adminApi.updateBusiness).toHaveBeenCalled();
    const payload = vi.mocked(adminApi.updateBusiness).mock.calls.at(-1)?.[1];
    expect(payload?.settings?.notification_templates?.review_request?.subject).toBe(
      "Please review {business_name}",
    );
  });

  it("blocks unknown template variables", async () => {
    renderNotificationsSettings();

    const subject = await screen.findByTestId("admin-notification-template-subject");
    fireEvent.change(subject, { target: { value: "Hello {not_a_real_var}" } });

    expect(screen.getByTestId("admin-notification-template-error")).toHaveTextContent(
      /Unknown variables/i,
    );
    expect(screen.getByTestId("admin-notification-template-save")).toBeDisabled();
  });

  it("keeps other settings tabs available", async () => {
    const user = userEvent.setup();
    renderNotificationsSettings();

    expect(await screen.findByTestId("admin-notifications-settings-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-settings-team-tab"));
    expect(await screen.findByTestId("admin-team-settings-page")).toBeInTheDocument();
  });
});
