import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PlanBadge } from "@/components/admin/PlanBadge";
import { renderRoute } from "@/test/test-utils";

function renderPlanBadge(variant: "business" | "pro" | "coming-soon" | "upgrade") {
  return renderRoute(<PlanBadge variant={variant} />, { route: "/admin", path: "/admin" });
}

describe("PlanBadge", () => {
  it("renders plan tier badges", () => {
    renderPlanBadge("business");
    expect(screen.getByText("Business")).toBeInTheDocument();
  });

  it("renders Pro badge", () => {
    renderPlanBadge("pro");
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("renders utility badges", () => {
    renderPlanBadge("coming-soon");
    expect(screen.getByText("Coming soon")).toBeInTheDocument();

    renderPlanBadge("upgrade");
    expect(screen.getByText("Upgrade")).toBeInTheDocument();
  });
});
