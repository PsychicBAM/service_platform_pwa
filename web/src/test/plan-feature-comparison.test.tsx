import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import {
  PlanFeatureComparison,
  PLAN_FEATURE_DEFINITIONS,
  PLAN_FEATURE_LIMITS_NOTE,
  getPlanFeatureCardClassName,
} from "@/components/admin/PlanFeatureComparison";
import { renderRoute } from "@/test/test-utils";

function renderPlanFeatureComparison(currentPlan?: string) {
  return renderRoute(<PlanFeatureComparison currentPlan={currentPlan} />, {
    route: "/admin/settings",
    path: "/admin/settings",
  });
}

describe("PlanFeatureComparison", () => {
  it("renders all four plans", () => {
    renderPlanFeatureComparison("free");

    expect(screen.getByTestId("plan-feature-comparison")).toBeInTheDocument();
    expect(screen.getByText("Plan features")).toBeInTheDocument();

    for (const plan of PLAN_FEATURE_DEFINITIONS) {
      expect(screen.getByTestId(`plan-feature-card-${plan.id}`)).toBeInTheDocument();
    }
  });

  it("renders feature list for each plan", () => {
    renderPlanFeatureComparison();

    for (const plan of PLAN_FEATURE_DEFINITIONS) {
      const card = screen.getByTestId(`plan-feature-card-${plan.id}`);
      for (const feature of plan.features) {
        expect(within(card).getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it("highlights current plan when currentPlan is business", () => {
    renderPlanFeatureComparison("business");

    expect(screen.getByTestId("plan-feature-current-business")).toHaveTextContent("Current plan");
    expect(screen.getByTestId("plan-feature-card-business")).toHaveAttribute("data-current", "true");
    expect(screen.getByTestId("plan-feature-card-pro")).toHaveAttribute("data-current", "false");
    expect(screen.getByTestId("plan-feature-pro-coming-soon")).toHaveTextContent("Coming soon");
    expect(screen.getByTestId("plan-feature-pro-upgrade")).toHaveTextContent("Upgrade");
  });

  it("highlights current plan when currentPlan is pro", () => {
    renderPlanFeatureComparison("pro");

    expect(screen.getByTestId("plan-feature-current-pro")).toHaveTextContent("Current plan");
    expect(screen.getByTestId("plan-feature-card-pro")).toHaveAttribute("data-current", "true");
  });

  it("handles missing currentPlan without crashing", () => {
    renderPlanFeatureComparison();

    expect(screen.getByTestId("plan-feature-comparison")).toBeInTheDocument();
    expect(screen.queryByText("Current plan")).not.toBeInTheDocument();
    for (const plan of PLAN_FEATURE_DEFINITIONS) {
      expect(screen.getByTestId(`plan-feature-card-${plan.id}`)).toHaveAttribute(
        "data-current",
        "false",
      );
    }
  });

  it("shows note about limits being prepared", () => {
    renderPlanFeatureComparison("starter");

    expect(screen.getByText(PLAN_FEATURE_LIMITS_NOTE)).toBeInTheDocument();
  });
});

describe("PlanFeatureComparison helpers", () => {
  it("adds highlight styles for the current plan card", () => {
    expect(getPlanFeatureCardClassName("business", "business")).toContain("ring-brand-500");
    expect(getPlanFeatureCardClassName("business", "free")).not.toContain("ring-brand-500");
  });
});
