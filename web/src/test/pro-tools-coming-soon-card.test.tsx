import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import {
  ProToolsComingSoonCard,
  PRO_TOOLS_ON_PRO_MESSAGE,
  PRO_TOOLS_PREPARED_MESSAGE,
  PRO_FEATURES_COMING_SOON_HINT,
} from "@/components/admin/ProToolsComingSoonCard";
import { renderRoute } from "@/test/test-utils";

function renderProToolsCard(currentPlan?: string, showSettingsLink = false) {
  return renderRoute(
    <ProToolsComingSoonCard currentPlan={currentPlan} showSettingsLink={showSettingsLink} />,
    { route: "/admin/settings", path: "/admin/settings" },
  );
}

describe("ProToolsComingSoonCard", () => {
  it("renders Pro tools card", () => {
    renderProToolsCard("business");

    expect(screen.getByTestId("pro-tools-coming-soon-card")).toBeInTheDocument();
    expect(screen.getByText("Pro tools coming soon")).toBeInTheDocument();
    expect(screen.getByTestId("pro-tools-badge-pro")).toHaveTextContent("Pro");
  });

  it("shows Pro-positive message when currentPlan is pro", () => {
    renderProToolsCard("pro");

    expect(screen.getByTestId("pro-tools-message")).toHaveTextContent(PRO_TOOLS_ON_PRO_MESSAGE);
    expect(screen.queryByTestId("pro-tools-badge-coming-soon")).not.toBeInTheDocument();
    expect(screen.queryByText(PRO_FEATURES_COMING_SOON_HINT)).not.toBeInTheDocument();
  });

  it("shows coming-soon hint when currentPlan is business", () => {
    renderProToolsCard("business");

    expect(screen.getByTestId("pro-tools-message")).toHaveTextContent(PRO_TOOLS_PREPARED_MESSAGE);
    expect(screen.getByTestId("pro-tools-badge-coming-soon")).toHaveTextContent("Coming soon");
  });

  it("shows coming-soon hint when currentPlan is missing", () => {
    renderProToolsCard();

    expect(screen.getByTestId("pro-tools-message")).toHaveTextContent(PRO_TOOLS_PREPARED_MESSAGE);
    expect(screen.getByTestId("pro-tools-badge-coming-soon")).toHaveTextContent("Coming soon");
  });

  it("links to settings when showSettingsLink is true and not on Pro", () => {
    renderProToolsCard("starter", true);

    expect(screen.getByTestId("pro-tools-settings-link")).toHaveAttribute("href", "/admin/settings");
    expect(screen.getByText(PRO_FEATURES_COMING_SOON_HINT)).toBeInTheDocument();
  });
});
