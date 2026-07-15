import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");

function renderAdminLayout() {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<div>Dashboard content</div>} />
          <Route path="services" element={<div>Services content</div>} />
        </Route>
      </Routes>
    </AdminBusinessProvider>,
    { route: "/admin", path: "/admin/*" },
  );
}

describe("admin layout mobile drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
  });

  it("renders mobile hamburger and keeps desktop sidebar classes", () => {
    renderAdminLayout();

    const menuButton = screen.getByTestId("admin-mobile-menu-button");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-label", "Open admin menu");
    expect(menuButton.className).toMatch(/lg:hidden/);

    const sidebar = screen.getByTestId("admin-desktop-sidebar");
    expect(sidebar.className).toMatch(/hidden/);
    expect(sidebar.className).toMatch(/lg:block/);
    expect(sidebar).toHaveTextContent("Dashboard");
    expect(sidebar).toHaveTextContent("Services");
    expect(sidebar).toHaveTextContent("Settings");
  });

  it("opens a fixed side drawer overlay with admin nav links", async () => {
    const user = userEvent.setup();
    renderAdminLayout();

    await user.click(screen.getByTestId("admin-mobile-menu-button"));

    const drawer = screen.getByTestId("admin-mobile-menu");
    const backdrop = screen.getByTestId("admin-mobile-menu-backdrop");

    expect(screen.getByTestId("admin-mobile-menu-button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(drawer.className).toMatch(/fixed/);
    expect(drawer.className).toMatch(/right-0/);
    expect(backdrop.className).toMatch(/fixed/);
    expect(backdrop.className).toMatch(/inset-0/);
    expect(drawer).toHaveTextContent("Dashboard");
    expect(drawer).toHaveTextContent("Services");
    expect(drawer).toHaveTextContent("Bookings");
    expect(drawer).toHaveTextContent("Orders");
    expect(drawer).toHaveTextContent("Settings");
    expect(drawer).toHaveTextContent("Public page");
    expect(drawer).toHaveTextContent("Logout");
  });

  it("closes drawer via backdrop, close button, Escape, and nav link", async () => {
    const user = userEvent.setup();
    renderAdminLayout();

    await user.click(screen.getByTestId("admin-mobile-menu-button"));
    expect(screen.getByTestId("admin-mobile-menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-mobile-menu-backdrop"));
    expect(screen.queryByTestId("admin-mobile-menu")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("admin-mobile-menu-button"));
    await user.click(screen.getByTestId("admin-mobile-menu-close"));
    expect(screen.queryByTestId("admin-mobile-menu")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("admin-mobile-menu-button"));
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("admin-mobile-menu")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("admin-mobile-menu-button"));
    await user.click(screen.getByTestId("admin-mobile-link-services"));
    expect(screen.queryByTestId("admin-mobile-menu")).not.toBeInTheDocument();
    expect(screen.getByText("Services content")).toBeInTheDocument();
  });
});
