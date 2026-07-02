import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { TermsPage } from "@/pages/legal/TermsPage";
import { PrivacyPage } from "@/pages/legal/PrivacyPage";
import { ConsentPage } from "@/pages/legal/ConsentPage";
import { CookiesPage } from "@/pages/legal/CookiesPage";
import { mockUnauthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");

const DRAFT_NOTICE = /draft placeholder — not legal advice/i;

describe("legal placeholder pages", () => {
  it("A. Terms page renders draft placeholder", () => {
    renderRoute(<TermsPage />, { route: "/legal/terms", path: "/legal/terms" });

    expect(screen.getByRole("heading", { name: /terms of service \(draft\)/i })).toBeInTheDocument();
    expect(screen.getByText(DRAFT_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(/must be reviewed before public launch/i)).toBeInTheDocument();
    expect(screen.getByText(/do not rely on this as final legal text/i)).toBeInTheDocument();
  });

  it("B. Privacy page renders draft placeholder", () => {
    renderRoute(<PrivacyPage />, { route: "/legal/privacy", path: "/legal/privacy" });

    expect(screen.getByRole("heading", { name: /privacy policy \(draft\)/i })).toBeInTheDocument();
    expect(screen.getByText(DRAFT_NOTICE)).toBeInTheDocument();
  });

  it("C. Consent page renders draft placeholder", () => {
    renderRoute(<ConsentPage />, { route: "/legal/consent", path: "/legal/consent" });

    expect(
      screen.getByRole("heading", { name: /personal data processing consent \(draft\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(DRAFT_NOTICE)).toBeInTheDocument();
  });

  it("D. Cookies page renders draft placeholder", () => {
    renderRoute(<CookiesPage />, { route: "/legal/cookies", path: "/legal/cookies" });

    expect(screen.getByRole("heading", { name: /cookie policy \(draft\)/i })).toBeInTheDocument();
    expect(screen.getByText(DRAFT_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(/does not use third-party analytics/i)).toBeInTheDocument();
  });
});

describe("legal footer links", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());
  });

  it("E. Footer contains links to all legal pages", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<span>Home</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: "Personal Data Consent" })).toHaveAttribute(
      "href",
      "/legal/consent",
    );
    expect(screen.getByRole("link", { name: "Cookies" })).toHaveAttribute("href", "/legal/cookies");
  });
});
