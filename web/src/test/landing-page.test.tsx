import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { renderRoute } from "@/test/test-utils";

describe("platform landing page", () => {
  it("A. renders all platform pricing plans", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByRole("heading", { name: /choose the right plan/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Free$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Starter$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Business$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Pro$/i })).toBeInTheDocument();
  });

  it("B. shows Business plan as recommended", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Business$/i })).toBeInTheDocument();
  });

  it("C. notes that payments are not live yet", () => {
    renderRoute(<PublicHomePage />, { route: "/", path: "/" });

    expect(
      screen.getByText(/payments and automatic upgrades are not live yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/demo\/manual/i)).toBeInTheDocument();
  });
});
