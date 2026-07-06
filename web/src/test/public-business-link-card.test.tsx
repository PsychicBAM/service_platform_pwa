import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicBusinessLinkCard } from "@/components/admin/PublicBusinessLinkCard";
import { DEMO_SLUG } from "@/test/mock-fixtures";

const DEMO_BUSINESS_NAME = "Demo Service Business";

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
      share: vi.fn().mockResolvedValue(undefined),
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
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
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

  it("renders Share button when slug exists", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("shares the public URL with businessName as title when provided", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share,
    });

    render(
      <PublicBusinessLinkCard businessName={DEMO_BUSINESS_NAME} businessSlug={DEMO_SLUG} />,
    );
    await user.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: DEMO_BUSINESS_NAME,
        text: "Book services or send requests here.",
        url: publicUrl,
      });
    });
    expect(screen.getByText("Share dialog opened")).toBeInTheDocument();
  });

  it("uses default share title when businessName is missing", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share,
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: "Public business page",
        text: "Book services or send requests here.",
        url: publicUrl,
      });
    });
  });

  it("shows fallback message when navigator.share is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: undefined,
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(
      screen.getByText("Sharing is not available in this browser. You can copy the link instead."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(publicUrl);
  });

  it("shows fallback message when navigator.share rejects", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: vi.fn().mockRejectedValue(new Error("share failed")),
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(screen.getByText("Sharing failed. You can copy the link instead.")).toBeInTheDocument();
    });
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(publicUrl);
  });

  it("does not show an error when share is cancelled by the user", async () => {
    const user = userEvent.setup();
    const abortError = new Error("Share canceled");
    abortError.name = "AbortError";
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: vi.fn().mockRejectedValue(abortError),
    });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(screen.queryByText("Sharing failed. You can copy the link instead.")).not.toBeInTheDocument();
    expect(screen.queryByText("Share dialog opened")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Sharing is not available in this browser. You can copy the link instead."),
    ).not.toBeInTheDocument();
  });
});
