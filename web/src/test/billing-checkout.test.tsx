import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as adminApi from "@/api/adminApi";
import * as adminEmailApi from "@/api/adminEmailApi";
import * as billingApi from "@/api/billingApi";
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
  listAdminServices: vi.fn(),
  createPlanChangeRequest: vi.fn(),
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

function renderSettingsPage(
  page: ReactElement = <AdminSettingsPage />,
  route = "/admin/settings?tab=payments",
) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route, path: "/admin/settings" },
  );
}

describe("admin billing checkout", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      settings: {
        ...mockAdminBusiness.settings,
        selected_plan_intent: "business",
      },
    });
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0 },
    });
    vi.mocked(adminApi.createPlanChangeRequest).mockResolvedValue({
      id: "pcr-1",
      business_id: mockAdminBusiness.id,
      requested_by_user_id: mockOwnerUser.id,
      current_plan: "free",
      requested_plan: "starter",
      direction: "upgrade",
      status: "pending",
      note: null,
      created_at: "2026-07-19T00:00:00Z",
      updated_at: "2026-07-19T00:00:00Z",
      resolved_at: null,
      resolved_by_user_id: null,
    });
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

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("A. admin settings renders payments & billing redesign", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByTestId("admin-payments-billing-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-payments-plan-cta-starter")).toHaveTextContent(
      "Upgrade to Starter",
    );

    await user.click(screen.getByTestId("admin-settings-tab-appearance"));
    expect(screen.getByRole("heading", { name: "Public profile" })).toBeInTheDocument();
  });

  it("B. paid plan checkout button calls API", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockResolvedValue({
      checkout_url: "https://checkout.stripe.test/session",
      session_id: "cs_test_123",
    });

    let hrefValue = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        set href(value: string) {
          hrefValue = value;
        },
        get href() {
          return hrefValue;
        },
      },
    });

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-payments-plan-cta-business"));

    await waitFor(() => {
      expect(billingApi.createBillingCheckoutSession).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        "business",
      );
    });
    expect(hrefValue).toBe("https://checkout.stripe.test/session");
    expect(adminApi.createPlanChangeRequest).not.toHaveBeenCalled();
  });

  it("C. STRIPE_DISABLED creates real plan change request", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockRejectedValue(
      new ApiClientError(503, "STRIPE_DISABLED", "Stripe checkout is not enabled."),
    );

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-payments-plan-cta-starter"));

    await waitFor(() => {
      expect(adminApi.createPlanChangeRequest).toHaveBeenCalledWith(mockAdminBusiness.id, {
        requested_plan: "starter",
      });
    });
    expect(
      await screen.findByTestId("admin-payments-action-feedback"),
    ).toHaveTextContent("Upgrade request sent to superadmin.");
  });

  it("D. successful checkout redirects to checkout_url", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockResolvedValue({
      checkout_url: "https://checkout.stripe.test/pro-session",
      session_id: "cs_test_pro",
    });

    let hrefValue = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        set href(value: string) {
          hrefValue = value;
        },
        get href() {
          return hrefValue;
        },
      },
    });

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-payments-plan-cta-pro"));

    await waitFor(() => {
      expect(billingApi.createBillingCheckoutSession).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        "pro",
      );
    });
    expect(hrefValue).toBe("https://checkout.stripe.test/pro-session");
  });

  it("E. free plan has no checkout as current plan", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await screen.findByTestId("admin-payments-billing-page");
    const freeCta = screen.getByTestId("admin-payments-plan-cta-free");
    expect(freeCta).toBeDisabled();
    expect(freeCta).toHaveTextContent("Current plan");

    await user.click(freeCta);
    expect(billingApi.createBillingCheckoutSession).not.toHaveBeenCalled();
    expect(adminApi.createPlanChangeRequest).not.toHaveBeenCalled();
  });

  it("F. failed checkout shows friendly error without fake success", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockRejectedValue(
      new ApiClientError(403, "FORBIDDEN", "Forbidden"),
    );

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-payments-plan-cta-pro"));

    expect(await screen.findByTestId("admin-payments-action-feedback")).toHaveTextContent(
      "You do not have access to billing for this business.",
    );
    expect(adminApi.createPlanChangeRequest).not.toHaveBeenCalled();
  });

  it("G. lower plan creates real downgrade request after API resolves", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      subscription: {
        plan: "business",
        status: "active",
        usage_bookings_count: mockAdminBusiness.subscription?.usage_bookings_count ?? 0,
        usage_orders_count: mockAdminBusiness.subscription?.usage_orders_count ?? 0,
      },
    });
    vi.mocked(adminApi.createPlanChangeRequest).mockResolvedValue({
      id: "pcr-down",
      business_id: mockAdminBusiness.id,
      requested_by_user_id: mockOwnerUser.id,
      current_plan: "business",
      requested_plan: "starter",
      direction: "downgrade",
      status: "pending",
      note: null,
      created_at: "2026-07-19T00:00:00Z",
      updated_at: "2026-07-19T00:00:00Z",
      resolved_at: null,
      resolved_by_user_id: null,
    });

    renderSettingsPage();
    const starterCta = await screen.findByTestId("admin-payments-plan-cta-starter");
    expect(starterCta).toHaveTextContent("Downgrade to Starter");

    await user.click(starterCta);

    await waitFor(() => {
      expect(adminApi.createPlanChangeRequest).toHaveBeenCalledWith(mockAdminBusiness.id, {
        requested_plan: "starter",
      });
    });
    expect(await screen.findByTestId("admin-payments-action-feedback")).toHaveTextContent(
      "Downgrade request sent to superadmin.",
    );
    expect(billingApi.createBillingCheckoutSession).not.toHaveBeenCalled();
  });

  it("H. plan request API failure shows error, not success", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      subscription: {
        plan: "business",
        status: "active",
        usage_bookings_count: 0,
        usage_orders_count: 0,
      },
    });
    vi.mocked(adminApi.createPlanChangeRequest).mockRejectedValue(
      new ApiClientError(500, "SERVER_ERROR", "Server error"),
    );

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-payments-plan-cta-starter"));

    expect(await screen.findByTestId("admin-payments-action-feedback")).toHaveTextContent(
      "Server error",
    );
  });

  it("I. security trust items are informational, not buttons", async () => {
    renderSettingsPage();
    const note = await screen.findByTestId("admin-payments-security-note");
    const badges = within(note).getByTestId("admin-payments-security-badges");

    expect(badges.tagName.toLowerCase()).toBe("ul");
    expect(within(badges).queryByRole("button")).not.toBeInTheDocument();
  });
});
