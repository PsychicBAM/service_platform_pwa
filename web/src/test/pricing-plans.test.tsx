import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { renderRoute } from "@/test/test-utils";

describe("pricing plans UX", () => {
  it("A. pricing section shows all four plan names", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByRole("heading", { name: /^Free$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Starter$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Business$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Pro$/i })).toBeInTheDocument();
  });

  it("B. pricing section shows price labels", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByText("$0/mo")).toBeInTheDocument();
    expect(screen.getByText("$19/mo")).toBeInTheDocument();
    expect(screen.getByText("$49/mo")).toBeInTheDocument();
    expect(screen.getByText("$99/mo")).toBeInTheDocument();
  });

  it("C. Business plan shows Recommended badge", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("D. View details expands plan limits", async () => {
    const user = userEvent.setup();
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    const businessCard = screen.getByRole("heading", { name: /^Business$/i }).closest("article");
    expect(businessCard).not.toBeNull();

    await user.click(within(businessCard!).getByRole("button", { name: /view details/i }));
    expect(within(businessCard!).getByText(/unlimited services, bookings, and orders/i)).toBeInTheDocument();
  });

  it("E. Choose plan links to register with selected plan", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByRole("link", { name: /choose business/i })).toHaveAttribute(
      "href",
      "/register?plan=business",
    );
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
