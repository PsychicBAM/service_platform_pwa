import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PricingPage } from "@/pages/PricingPage";
import { MANUAL_BILLING_NOTE } from "@/data/pricingPlans";
import { routes } from "@/routes";
import { renderRoute } from "@/test/test-utils";

function renderAppAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("pricing page", () => {
  it("/pricing route renders PricingPage via app router", async () => {
    renderAppAt("/pricing");

    expect(await screen.findByTestId("pricing-plan-grid")).toBeInTheDocument();
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
  });

  it("renders Free, Starter, Business, and Pro plans", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByRole("heading", { name: /plans for every stage of growth/i })).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-starter")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-business")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-plan-pro")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("links all plan CTAs to register with plan query", () => {
    renderRoute(<PricingPage />, { route: "/pricing", path: "/pricing" });

    expect(screen.getByTestId("pricing-plan-cta-free")).toHaveAttribute("href", "/register?plan=free");
    expect(screen.getByTestId("pricing-plan-cta-starter")).toHaveAttribute(
      "href",
      "/register?plan=starter",
    );
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
