import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { PricingPage } from "@/pages/PricingPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { renderRoute } from "@/test/test-utils";

describe("pricing plans UX", () => {
  it("A. /pricing shows all four plan names", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByRole("heading", { name: /^Free$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Starter$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Business$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Pro$/i })).toBeInTheDocument();
  });

  it("B. /pricing shows price labels", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByText("$0/mo")).toBeInTheDocument();
    expect(screen.getByText("$19/mo")).toBeInTheDocument();
    expect(screen.getByText("$49/mo")).toBeInTheDocument();
    expect(screen.getByText("$99/mo")).toBeInTheDocument();
  });

  it("C. Business plan shows Recommended badge", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("D. Business plan shows key growth benefits", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    const businessCard = screen.getByTestId("pricing-plan-business");
    expect(within(businessCard).getByText(/waitlists and reviews/i)).toBeInTheDocument();
    expect(within(businessCard).getByText(/public marketplace presence/i)).toBeInTheDocument();
  });

  it("E. pricing CTAs use plan labels and register links", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByTestId("pricing-plan-cta-free")).toHaveTextContent("Get Free");
    expect(screen.getByTestId("pricing-plan-cta-free")).toHaveAttribute("href", "/register?plan=free");

    expect(screen.getByTestId("pricing-plan-cta-starter")).toHaveTextContent("Get Starter");
    expect(screen.getByTestId("pricing-plan-cta-starter")).toHaveAttribute(
      "href",
      "/register?plan=starter",
    );

    expect(screen.getByTestId("pricing-plan-cta-business")).toHaveTextContent("Get Business");
    expect(screen.getByTestId("pricing-plan-cta-business")).toHaveAttribute(
      "href",
      "/register?plan=business",
    );

    expect(screen.getByTestId("pricing-plan-cta-pro")).toHaveTextContent("Get Pro");
    expect(screen.getByTestId("pricing-plan-cta-pro")).toHaveAttribute("href", "/register?plan=pro");
  });

  it("F. register page reads plan query param", () => {
    renderRoute(<RegisterPage />, { route: "/register?plan=business", path: "/register" });

    expect(screen.getByDisplayValue("business")).toBeChecked();
  });

  it("G. register page defaults to Free when no plan param", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(screen.getByDisplayValue("free")).toBeChecked();
  });

  it("H. register page shows manual billing demo note", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(screen.getByText(/your account still starts on the free plan/i)).toBeInTheDocument();
    expect(screen.getByText(/billing is implemented/i)).toBeInTheDocument();
  });
});
