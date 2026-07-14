import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMarketplaceCoverSection } from "@/components/admin/AdminMarketplaceCoverSection";
import * as marketplaceCoverImageApi from "@/api/marketplaceCoverImageApi";
import { BUSINESS_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/marketplaceCoverImageApi");

const mockImage = {
  kind: "image" as const,
  url: "/uploads/businesses/test/marketplace_cover/cover.webp",
  thumbnailUrl: "/uploads/businesses/test/marketplace_cover/cover_thumb.webp",
  alt: "",
  filename: "cover.webp",
  contentType: "image/webp",
  size: 100,
  originalSize: 5000,
  width: 1600,
  height: 900,
};

describe("AdminMarketplaceCoverSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders marketplace cover section title and helper text", () => {
    renderRoute(
      <AdminMarketplaceCoverSection
        businessId={BUSINESS_ID}
        image={null}
        onImageChange={vi.fn()}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    expect(screen.getByTestId("admin-marketplace-cover-section")).toBeInTheDocument();
    expect(screen.getByText("Marketplace cover image")).toBeInTheDocument();
    expect(
      screen.getByText(/marketplace, homepage featured cards, and public discovery surfaces/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin-marketplace-cover-placeholder")).toBeInTheDocument();
  });

  it("renders existing cover image preview when present", () => {
    renderRoute(
      <AdminMarketplaceCoverSection
        businessId={BUSINESS_ID}
        image={mockImage}
        onImageChange={vi.fn()}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    expect(screen.getByTestId("admin-marketplace-cover-image")).toHaveAttribute(
      "src",
      mockImage.url,
    );
    expect(screen.getByTestId("admin-marketplace-cover-remove")).toBeInTheDocument();
  });

  it("upload success updates image via callback", async () => {
    const onImageChange = vi.fn();
    vi.mocked(marketplaceCoverImageApi.uploadMarketplaceCoverImage).mockResolvedValue({
      image: mockImage,
    });
    const user = userEvent.setup();

    renderRoute(
      <AdminMarketplaceCoverSection
        businessId={BUSINESS_ID}
        image={null}
        onImageChange={onImageChange}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(marketplaceCoverImageApi.uploadMarketplaceCoverImage).toHaveBeenCalledWith(
        BUSINESS_ID,
        file,
      );
      expect(onImageChange).toHaveBeenCalledWith(mockImage);
    });
  });

  it("remove clears explicit cover image via callback", async () => {
    const onImageChange = vi.fn();
    vi.mocked(marketplaceCoverImageApi.removeMarketplaceCoverImage).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderRoute(
      <AdminMarketplaceCoverSection
        businessId={BUSINESS_ID}
        image={mockImage}
        onImageChange={onImageChange}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    await user.click(screen.getByTestId("admin-marketplace-cover-remove"));

    await waitFor(() => {
      expect(marketplaceCoverImageApi.removeMarketplaceCoverImage).toHaveBeenCalledWith(BUSINESS_ID);
      expect(onImageChange).toHaveBeenCalledWith(null);
    });
  });
});
