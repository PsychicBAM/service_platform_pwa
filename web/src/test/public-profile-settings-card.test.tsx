import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import {
  PublicProfileSettingsCard,
  PUBLIC_PROFILE_DESCRIPTION,
  PUBLIC_PROFILE_ON_PRO_MESSAGE,
  PUBLIC_PROFILE_COMING_SOON_MESSAGE,
  PUBLIC_PROFILE_MEDIA_PLACEHOLDER,
} from "@/components/admin/PublicProfileSettingsCard";
import { renderRoute } from "@/test/test-utils";

function renderPublicProfileCard(currentPlan?: string) {
  return renderRoute(<PublicProfileSettingsCard currentPlan={currentPlan} />, {
    route: "/admin/settings",
    path: "/admin/settings",
  });
}

describe("PublicProfileSettingsCard", () => {
  it("renders title and description", () => {
    renderPublicProfileCard("business");

    expect(screen.getByTestId("public-profile-settings-card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public profile" })).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_PROFILE_DESCRIPTION)).toBeInTheDocument();
  });

  it("shows Pro-positive message when currentPlan is pro", () => {
    renderPublicProfileCard("pro");

    expect(screen.getByTestId("public-profile-plan-message")).toHaveTextContent(
      PUBLIC_PROFILE_ON_PRO_MESSAGE,
    );
    expect(screen.getByTestId("public-profile-badge-pro")).toHaveTextContent("Pro");
    expect(screen.queryByTestId("public-profile-badge-coming-soon")).not.toBeInTheDocument();
  });

  it("shows coming-soon message when currentPlan is business", () => {
    renderPublicProfileCard("business");

    expect(screen.getByTestId("public-profile-plan-message")).toHaveTextContent(
      PUBLIC_PROFILE_COMING_SOON_MESSAGE,
    );
    expect(screen.getByTestId("public-profile-badge-coming-soon")).toHaveTextContent("Coming soon");
  });

  it("shows coming-soon message when currentPlan is missing", () => {
    renderPublicProfileCard();

    expect(screen.getByTestId("public-profile-plan-message")).toHaveTextContent(
      PUBLIC_PROFILE_COMING_SOON_MESSAGE,
    );
  });

  it("renders disabled profile fields", () => {
    renderPublicProfileCard("starter");

    expect(screen.getByTestId("public-profile-tagline")).toBeDisabled();
    expect(screen.getByTestId("public-profile-about")).toBeDisabled();
    expect(screen.getByTestId("public-profile-website")).toBeDisabled();
    expect(screen.getByTestId("public-profile-instagram")).toBeDisabled();
    expect(screen.getByTestId("public-profile-save-button")).toBeDisabled();
  });

  it("shows media gallery placeholder", () => {
    renderPublicProfileCard("free");

    expect(screen.getByTestId("public-profile-media-placeholder")).toHaveTextContent(
      PUBLIC_PROFILE_MEDIA_PLACEHOLDER,
    );
  });
});
