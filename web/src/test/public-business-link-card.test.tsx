import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicBusinessLinkCard } from "@/components/admin/PublicBusinessLinkCard";
import { DEMO_SLUG } from "@/test/mock-fixtures";

describe("PublicBusinessLinkCard", () => {
  const originalOrigin = window.location.origin;
  const publicUrl = `http://localhost:5173/b/${DEMO_SLUG}`;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: "http://localhost:5173" },
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: originalOrigin },
    });
    vi.unstubAllGlobals();
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
    expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
  });

  it("renders Copy link button when slug exists", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("copies the public URL to clipboard on click", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(publicUrl);
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });

  it("shows fallback message when clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: undefined,
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(screen.getByText("Copy failed. You can copy the link manually.")).toBeInTheDocument();
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(publicUrl);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("shows fallback message when clipboard write fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(screen.getByText("Copy failed. You can copy the link manually.")).toBeInTheDocument();
    });
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(publicUrl);
  });
});
