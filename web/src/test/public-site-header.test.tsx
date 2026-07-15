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
    document.body.style.overflow = "";
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());
  });

  it("renders mobile hamburger and keeps desktop nav with desktop classes", async () => {
    renderRoute(<PublicSiteHeader active="home" />, { route: "/", path: "/" });

    const menuButton = screen.getByTestId("public-site-mobile-menu-button");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-label", "Open menu");
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

  it("opens a fixed side drawer overlay without inline content push classes", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader active="marketplace" />, {
      route: "/businesses",
      path: "/businesses",
    });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));

    const drawer = screen.getByTestId("public-site-mobile-menu");
    const backdrop = screen.getByTestId("public-site-mobile-menu-backdrop");

    expect(screen.getByTestId("public-site-mobile-menu-button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(drawer.className).toMatch(/fixed/);
    expect(drawer.className).toMatch(/inset-y-0/);
    expect(drawer.className).toMatch(/right-0/);
    expect(drawer.className).not.toMatch(/border-t/);
    expect(backdrop.className).toMatch(/fixed/);
    expect(backdrop.className).toMatch(/inset-0/);

    expect(drawer).toHaveTextContent("Home");
    expect(drawer).toHaveTextContent("Marketplace");
    expect(drawer).toHaveTextContent("Pricing");
    expect(drawer).toHaveTextContent("How it works");
    expect(screen.queryByTestId("public-site-mobile-link-bookings")).not.toBeInTheDocument();
    expect(screen.getByTestId("public-site-mobile-link-signin")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("public-site-mobile-link-get-started")).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("closes the drawer when backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader />, { route: "/", path: "/" });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));
    expect(screen.getByTestId("public-site-mobile-menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("public-site-mobile-menu-backdrop"));
    expect(screen.queryByTestId("public-site-mobile-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("public-site-mobile-menu-backdrop")).not.toBeInTheDocument();
  });

  it("closes the drawer when close button is clicked", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader />, { route: "/", path: "/" });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));
    await user.click(screen.getByTestId("public-site-mobile-menu-close"));

    expect(screen.queryByTestId("public-site-mobile-menu")).not.toBeInTheDocument();
  });

  it("closes the drawer after clicking a nav link", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader />, { route: "/", path: "/" });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));
    await user.click(screen.getByTestId("public-site-mobile-link-pricing"));

    expect(screen.queryByTestId("public-site-mobile-menu")).not.toBeInTheDocument();
  });

  it("closes the drawer when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicSiteHeader />, { route: "/", path: "/" });

    await user.click(screen.getByTestId("public-site-mobile-menu-button"));
    expect(screen.getByTestId("public-site-mobile-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("public-site-mobile-menu")).not.toBeInTheDocument();
  });

  it("shows My bookings and Dashboard in mobile drawer when authenticated", async () => {
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
