import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicSiteHeader } from "@/components/public/PublicSiteChrome";
import { useAuth } from "@/hooks/useAuth";
import { mockOwnerUser } from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

vi.mock("@/hooks/useAuth");

describe("public site header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());
  });

  it("renders mobile hamburger and keeps desktop nav with desktop classes", async () => {
    renderRoute(<PublicSiteHeader active="home" />, { route: "/", path: "/" });

    const menuButton = screen.getByTestId("public-site-mobile-menu-button");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton.className).toMatch(/md:hidden/);

    const desktopNav = screen.getByTestId("public-site-desktop-nav");
    expect(desktopNav.className).toMatch(/hidden/);
    expect(desktopNav.className).toMatch(/md:flex/);
    expect(desktopNav).toHaveTextContent("Home");
    expect(desktopNav).toHaveTextContent("Marketplace");
    expect(desktopNav).toHaveTextContent("Pricing");

    const desktopActions = screen.getByTestId("public-site-desktop-actions");
    expect(desktopActions.className).toMatch(/hidden/);
    expect(desktopActions.className).toMatch(/md:flex/);
    expect(desktopActions).toHaveTextContent("Sign in");
    expect(desktopActions).toHaveTextContent("Get started");
  });

  it("opens mobile menu with public links and closes after clicking a link", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader active="marketplace" />, {
      route: "/businesses",
      path: "/businesses",
    });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));

    const menu = screen.getByTestId("public-site-mobile-menu");
    expect(screen.getByTestId("public-site-mobile-menu-button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(menu).toHaveTextContent("Home");
    expect(menu).toHaveTextContent("Marketplace");
    expect(menu).toHaveTextContent("Pricing");
    expect(screen.queryByTestId("public-site-mobile-link-bookings")).not.toBeInTheDocument();
    expect(screen.getByTestId("public-site-mobile-link-signin")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("public-site-mobile-link-get-started")).toHaveAttribute(
      "href",
      "/pricing",
    );

    await user.click(screen.getByTestId("public-site-mobile-link-pricing"));
    expect(screen.queryByTestId("public-site-mobile-menu")).not.toBeInTheDocument();
  });

  it("shows My bookings and Dashboard in mobile menu when authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    const user = userEvent.setup();

    renderRoute(<PublicSiteHeader />, { route: "/", path: "/" });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));

    expect(screen.getByTestId("public-site-mobile-link-bookings")).toHaveAttribute(
      "href",
      "/me/bookings",
    );
    expect(screen.getByTestId("public-site-mobile-link-dashboard")).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByTestId("public-site-mobile-link-signin")).not.toBeInTheDocument();
  });
});
