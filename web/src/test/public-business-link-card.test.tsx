import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DEMO_SLUG } from "@/test/mock-fixtures";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }: { value: string; title?: string }) => (
    <svg data-testid="public-business-qr" data-value={value} aria-label={title} />
  ),
  QRCodeCanvas: React.forwardRef<HTMLCanvasElement, { value: string; size?: number }>(
    ({ value, size }, ref) => (
      <canvas
        ref={ref}
        data-testid="public-business-qr-canvas"
        data-value={value}
        width={size}
        height={size}
      />
    ),
  ),
}));

import {
  PublicBusinessLinkCard,
  buildQrDownloadFilename,
  downloadQrPngFromCanvas,
} from "@/components/admin/PublicBusinessLinkCard";

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
    expect(screen.queryByRole("button", { name: "Download QR" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("public-business-qr-section")).not.toBeInTheDocument();
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

  it("renders QR section when businessSlug exists", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByTestId("public-business-qr-section")).toBeInTheDocument();
    expect(screen.getByText("QR code")).toBeInTheDocument();
    expect(screen.getByText("Scan to open page")).toBeInTheDocument();
    expect(
      screen.queryByText("Clients can scan this code to open your public page."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("This QR code stays valid as long as your public page link does not change."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("QR code for public business page")).toBeInTheDocument();
  });

  it("encodes the canonical public URL in the QR code", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByTestId("public-business-qr")).toHaveAttribute("data-value", publicUrl);
  });

  it("renders Download QR button when slug exists", () => {
    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);

    expect(screen.getByRole("button", { name: "Download QR" })).toBeInTheDocument();
    expect(screen.getByTestId("public-business-qr-canvas")).toHaveAttribute("data-value", publicUrl);
  });

  it("builds a stable QR download filename from business slug", () => {
    expect(buildQrDownloadFilename(DEMO_SLUG)).toBe(`${DEMO_SLUG}-qr-code.png`);
  });

  it("triggers PNG download with the expected filename", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.fn();
    const downloadAnchor = { current: null as HTMLAnchorElement | null };
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        const anchor = originalCreateElement("a");
        anchor.click = clickSpy;
        downloadAnchor.current = anchor;
        return anchor;
      }
      return originalCreateElement(tagName);
    });
    const toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,test");

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Download QR" }));

    expect(toDataURLSpy).toHaveBeenCalledWith("image/png");
    expect(clickSpy).toHaveBeenCalled();
    expect(downloadAnchor.current).not.toBeNull();
    expect(downloadAnchor.current?.download).toBe(`${DEMO_SLUG}-qr-code.png`);
    expect(downloadAnchor.current?.href).toBe("data:image/png;base64,test");

    createElementSpy.mockRestore();
    toDataURLSpy.mockRestore();
  });

  it("shows fallback message when QR download fails", async () => {
    const user = userEvent.setup();
    const toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockImplementation(() => {
        throw new Error("canvas export failed");
      });

    render(<PublicBusinessLinkCard businessSlug={DEMO_SLUG} />);
    await user.click(screen.getByRole("button", { name: "Download QR" }));

    expect(
      screen.getByText("QR download failed. You can still use the public link."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(publicUrl);

    toDataURLSpy.mockRestore();
  });

  it("downloadQrPngFromCanvas returns false when canvas export fails", () => {
    const canvas = document.createElement("canvas");
    const toDataURLSpy = vi.spyOn(canvas, "toDataURL").mockImplementation(() => {
      throw new Error("export failed");
    });

    expect(downloadQrPngFromCanvas(canvas, `${DEMO_SLUG}-qr-code.png`)).toBe(false);

    toDataURLSpy.mockRestore();
  });
});
