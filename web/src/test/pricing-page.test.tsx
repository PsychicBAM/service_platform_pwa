import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PricingPage } from "@/pages/PricingPage";
import { MANUAL_BILLING_NOTE } from "@/data/pricingPlans";
import { renderRoute } from "@/test/test-utils";

describe("pricing page", () => {
  it("renders Free, Starter, Business, and Pro plans", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByRole("heading", { name: /plans for every stage of growth/i })).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-starter")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-business")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-pro")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("links plan CTAs to register with plan query", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByTestId("pricing-plan-cta-business")).toHaveAttribute(
      "href",
      "/register?plan=business",
    );
    expect(screen.getByTestId("pricing-plan-cta-pro")).toHaveAttribute("href", "/register?plan=pro");
  });

  it("shows manual billing note without triggering checkout", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByText(MANUAL_BILLING_NOTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });
});
