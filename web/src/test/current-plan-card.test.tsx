import { describe, it, expect } from "vitest";
import type React from "react";
import { screen } from "@testing-library/react";
import {
  CurrentPlanCard,
  getPlanDisplayName,
  getPlanHelperText,
} from "@/components/admin/CurrentPlanCard";
import { renderRoute } from "@/test/test-utils";

function renderCurrentPlanCard(props: React.ComponentProps<typeof CurrentPlanCard>) {
  return renderRoute(<CurrentPlanCard {...props} />, { route: "/admin", path: "/admin" });
}

describe("CurrentPlanCard", () => {
  it("renders Current plan card heading", () => {
    renderCurrentPlanCard({ plan: "free", status: "active" });

    expect(screen.getByTestId("current-plan-card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current plan" })).toBeInTheDocument();
  });

  it("shows Business when plan is business", () => {
    renderCurrentPlanCard({ plan: "business", status: "active" });

    expect(screen.getByTestId("current-plan-badge")).toHaveTextContent("Business");
    expect(screen.getByTestId("current-plan-helper")).toHaveTextContent(
      "Booking and request management for growing businesses.",
    );
    expect(screen.getByTestId("current-plan-status")).toHaveTextContent("Status: Active");
  });

  it("shows Pro when plan is pro", () => {
    renderCurrentPlanCard({ plan: "pro", status: "trialing" });

    expect(screen.getByTestId("current-plan-badge")).toHaveTextContent("Pro");
    expect(screen.getByTestId("current-plan-helper")).toHaveTextContent(
      "Advanced business profile and premium tools.",
    );
    expect(screen.getByTestId("current-plan-status")).toHaveTextContent("Status: Trialing");
    expect(screen.getByTestId("current-plan-pro-hint")).toHaveTextContent(
      /Advanced tools will appear here as they are released/i,
    );
  });

  it("shows coming-soon hint for non-Pro plans", () => {
    renderCurrentPlanCard({ plan: "business", status: "active" });

    expect(screen.getByTestId("current-plan-pro-hint")).toHaveTextContent(
      /Pro features are coming soon/i,
    );
  });

  it("shows fallback when plan and status are missing", () => {
    renderCurrentPlanCard({});

    expect(screen.getByText("Plan information is not available.")).toBeInTheDocument();
    expect(screen.queryByTestId("current-plan-badge")).not.toBeInTheDocument();
  });

  it("links View plan details to settings by default", () => {
    renderCurrentPlanCard({ plan: "starter", status: "active" });

    expect(screen.getByRole("link", { name: "View plan details" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });

  it("uses custom settings href when provided", () => {
    renderCurrentPlanCard({
      plan: "starter",
      status: "active",
      settingsHref: "/admin/settings#billing",
    });

    expect(screen.getByRole("link", { name: "View plan details" })).toHaveAttribute(
      "href",
      "/admin/settings#billing",
    );
  });
});

describe("CurrentPlanCard helpers", () => {
  it("maps known plan keys to display names", () => {
    expect(getPlanDisplayName("free")).toBe("Free");
    expect(getPlanDisplayName("business")).toBe("Business");
    expect(getPlanDisplayName("unknown_plan")).toBe("Unknown plan");
    expect(getPlanDisplayName()).toBe("Unknown plan");
  });

  it("returns helper text for known plans only", () => {
    expect(getPlanHelperText("starter")).toBe("Simple booking tools for small teams.");
    expect(getPlanHelperText("enterprise")).toBeNull();
  });
});
