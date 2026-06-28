import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { renderRoute } from "@/test/test-utils";

describe("platform landing page", () => {
  it("A. renders all platform pricing plans", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByRole("heading", { name: /choose the right plan/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Free", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Starter", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Business", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro", exact: true })).toBeInTheDocument();
  });

  it("B. shows Business plan as recommended", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Business", exact: true })).toBeInTheDocument();
  });

  it("C. notes that payments and plan upgrades are coming later", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(
      screen.getByText(/payments and plan upgrades are coming later/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/manual plan management/i)).toBeInTheDocument();
  });
});
