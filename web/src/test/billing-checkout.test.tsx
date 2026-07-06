import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as adminApi from "@/api/adminApi";
import * as billingApi from "@/api/billingApi";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { mockAdminBusiness, mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  updateBusiness: vi.fn(),
}));
vi.mock("@/api/billingApi", () => ({
  createBillingCheckoutSession: vi.fn(),
}));

function renderSettingsPage(page: ReactElement = <AdminSettingsPage />) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route: "/admin/settings", path: "/admin/settings" },
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
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("A. admin settings renders billing/plan section", async () => {
    renderSettingsPage();

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByText("Billing / plan")).toBeInTheDocument();
    expect(screen.getByText(/Current active plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Signup plan intent/i)).toBeInTheDocument();
    expect(screen.getByText(/Stripe checkout is optional/i)).toBeInTheDocument();
    expect(screen.getByText("Plan features")).toBeInTheDocument();
    expect(screen.getByText(/Feature limits are being prepared/i)).toBeInTheDocument();
    expect(screen.getByTestId("plan-feature-card-free")).toHaveAttribute("data-current", "true");
    expect(screen.getByTestId("pro-tools-coming-soon-card")).toBeInTheDocument();
    expect(screen.getByText(/Pro tools are being prepared/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public profile" })).toBeInTheDocument();
    expect(screen.getByTestId("public-profile-settings-card")).toBeInTheDocument();
    expect(screen.getByTestId("public-profile-save-button")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start Starter checkout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Business checkout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Pro checkout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Free checkout/i })).not.toBeInTheDocument();
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
    await screen.findByRole("button", { name: "Start Business checkout" });
    await user.click(screen.getByRole("button", { name: "Start Business checkout" }));

    await waitFor(() => {
      expect(billingApi.createBillingCheckoutSession).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        "business",
      );
    });
    expect(hrefValue).toBe("https://checkout.stripe.test/session");
  });

  it("C. STRIPE_DISABLED shows friendly manual billing message", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockRejectedValue(
      new ApiClientError(503, "STRIPE_DISABLED", "Stripe checkout is not enabled."),
    );

    renderSettingsPage();
    await user.click(await screen.findByRole("button", { name: "Start Starter checkout" }));

    expect(
      await screen.findByText(
        "Stripe checkout is not enabled yet. Plan changes are manual for now.",
      ),
    ).toBeInTheDocument();
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
    await user.click(await screen.findByRole("button", { name: "Start Pro checkout" }));

    await waitFor(() => {
      expect(hrefValue).toBe("https://checkout.stripe.test/pro-session");
    });
  });

  it("E. free plan has no checkout button", async () => {
    renderSettingsPage();

    await screen.findByText("Billing / plan");
    expect(screen.queryByRole("button", { name: /Start Free checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /free checkout/i })).not.toBeInTheDocument();
  });

  it("F. failed checkout shows friendly error", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createBillingCheckoutSession).mockRejectedValue(
      new ApiClientError(403, "FORBIDDEN", "Forbidden"),
    );

    renderSettingsPage();
    await user.click(await screen.findByRole("button", { name: "Start Pro checkout" }));

    expect(
      await screen.findByText("You do not have access to billing for this business."),
    ).toBeInTheDocument();
  });
});
