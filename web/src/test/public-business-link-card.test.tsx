import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicBusinessLinkCard } from "@/components/admin/PublicBusinessLinkCard";
import { DEMO_SLUG } from "@/test/mock-fixtures";

describe("PublicBusinessLinkCard", () => {
  const originalOrigin = window.location.origin;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: "http://localhost:5173" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: originalOrigin },
    });
  });

  it("renders Public business page card", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByRole("heading", { name: "Public business page" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Send this link to clients so they can book services or submit requests.",
      ),
    ).toBeInTheDocument();
  });

  it("renders public URL when slug exists", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByTestId("public-business-url")).toHaveTextContent(
      `http://localhost:5173/b/${DEMO_SLUG}`,
    );
  });

  it("uses window.location.origin and /b/<slug> in the public URL", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: "http://127.0.0.1:18080" },
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByTestId("public-business-url")).toHaveTextContent(
      `http://127.0.0.1:18080/b/${DEMO_SLUG}`,
    );
  });

  it("renders Preview page link with correct href, target, and rel", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    const previewLink = screen.getByRole("link", { name: "Preview page" });
    expect(previewLink).toHaveAttribute("href", `/b/${DEMO_SLUG}`);
    expect(previewLink).toHaveAttribute("target", "_blank");
    expect(previewLink).toHaveAttribute("rel", "noreferrer");
  });

  it("shows warning when slug is missing and does not render a broken link", () => {
    render(<PublicBusinessLinkCard businessName="Demo Business" />);

    expect(
      screen.getByText("Public page is not ready yet. Business slug is missing."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("public-business-url")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Preview page" })).not.toBeInTheDocument();
  });
});
