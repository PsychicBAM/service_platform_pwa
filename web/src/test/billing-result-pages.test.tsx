import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { BillingCancelPage } from "@/pages/BillingCancelPage";
import { BillingSuccessPage } from "@/pages/BillingSuccessPage";
import { renderRoute } from "@/test/test-utils";

describe("billing result pages", () => {
  it("A. /billing/success renders success message", () => {
    renderRoute(<BillingSuccessPage />, {
      route: "/billing/success",
      path: "/billing/success",
    });

    expect(screen.getByRole("heading", { name: "Checkout completed" })).toBeInTheDocument();
    expect(
      screen.getByText(/your plan will be activated after stripe confirms the payment/i),
    ).toBeInTheDocument();
  });

  it("B. /billing/success displays session_id when provided", () => {
    renderRoute(<BillingSuccessPage />, {
      route: "/billing/success?session_id=cs_test_123",
      path: "/billing/success",
    });

    expect(screen.getByText(/checkout session:/i)).toBeInTheDocument();
    expect(screen.getByText("cs_test_123")).toBeInTheDocument();
  });

  it("C. /billing/success includes link to admin settings", () => {
    renderRoute(<BillingSuccessPage />, {
      route: "/billing/success",
      path: "/billing/success",
    });

    expect(screen.getByRole("link", { name: "Go to Admin Settings" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });

  it("D. /billing/cancel renders cancelled message", () => {
    renderRoute(<BillingCancelPage />, {
      route: "/billing/cancel",
      path: "/billing/cancel",
    });

    expect(screen.getByRole("heading", { name: "Checkout cancelled" })).toBeInTheDocument();
  });

  it("E. /billing/cancel explains no plan changed", () => {
    renderRoute(<BillingCancelPage />, {
      route: "/billing/cancel",
      path: "/billing/cancel",
    });

    expect(
      screen.getByText(/no payment was completed and your active plan was not changed/i),
    ).toBeInTheDocument();
  });

  it("F. /billing/cancel includes links to admin settings and pricing", () => {
    renderRoute(<BillingCancelPage />, {
      route: "/billing/cancel",
      path: "/billing/cancel",
    });

    expect(screen.getByRole("link", { name: "Back to Admin Settings" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByRole("link", { name: "View pricing" })).toHaveAttribute("href", "/");
  });
});
