import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessDirectoryPage } from "@/pages/BusinessDirectoryPage";
import * as publicApi from "@/api/publicApi";
import { DEMO_SLUG } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";
import type { PublicBusinessDirectoryItem } from "@/types/api";

vi.mock("@/api/publicApi");

const mockDirectoryBusiness: PublicBusinessDirectoryItem = {
  name: "Bright Dental Studio",
  slug: DEMO_SLUG,
  description: "Trusted dental care with same-week appointments.",
  logo_url: null,
  address: "Indiranagar, Bangalore",
  operating_mode: "both",
  average_rating: 4.8,
  review_count: 256,
  cover_image_url: "/uploads/services/demo/cover.webp",
  has_booking_service: true,
  starts_at_price_cents: 50000,
  starts_at_currency: "USD",
  services_preview: [
    {
      name: "Dental Checkup",
      type: "booking",
      price_cents: 50000,
      currency: "USD",
      price_type: "fixed",
      duration_minutes: 45,
      image_url: "/uploads/services/demo/cover.webp",
    },
    {
      name: "Teeth Whitening",
      type: "booking",
      price_cents: 12000,
      currency: "USD",
      price_type: "fixed",
      duration_minutes: 60,
      image_url: null,
    },
  ],
};

function mockDirectoryResponse(
  data: PublicBusinessDirectoryItem[] = [mockDirectoryBusiness],
  total = data.length,
) {
  vi.mocked(publicApi.listPublicBusinesses).mockResolvedValue({
    data,
    meta: { page: 1, limit: 12, total },
  });
}

describe("public business directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading, search, sidebar, and filter row", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(
      screen.getByRole("heading", { name: /find trusted services near you/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/explore top-rated businesses and book with confidence/i)).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-filter-row")).toBeInTheDocument();
    expect(await screen.findByTestId("marketplace-sidebar")).toBeInTheDocument();
  });

  it("renders business cards with media, rating, review count, and service chips", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    const card = await screen.findByTestId("marketplace-business-card");
    expect(within(card).getByRole("heading", { name: mockDirectoryBusiness.name })).toBeInTheDocument();
    expect(within(card).getByText("4.8")).toBeInTheDocument();
    expect(within(card).getByText("(256)")).toBeInTheDocument();
    expect(within(card).getByText("Dental Checkup")).toBeInTheDocument();
    expect(within(card).getByText("Teeth Whitening")).toBeInTheDocument();
    expect(within(card).getByRole("presentation")).toHaveAttribute(
      "src",
      mockDirectoryBusiness.cover_image_url,
    );
  });

  it("links CTA to public business page", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    const cta = await screen.findByTestId("marketplace-business-cta");
    expect(cta).toHaveAttribute("href", `/b/${DEMO_SLUG}`);
    expect(cta).toHaveTextContent("Book now");
  });

  it("submits search query to directory API", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    await user.type(screen.getByTestId("marketplace-search-input"), "dental");
    await user.click(screen.getByTestId("marketplace-search-button"));

    expect(publicApi.listPublicBusinesses).toHaveBeenCalled();
    const lastCall = vi.mocked(publicApi.listPublicBusinesses).mock.calls.at(-1)?.[0];
    expect(lastCall?.q).toBe("dental");
  });

  it("renders empty state when no businesses match", async () => {
    mockDirectoryResponse([], 0);

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(await screen.findByTestId("marketplace-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no businesses found/i)).toBeInTheDocument();
  });

  it("does not render private fields on cards", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    await screen.findByTestId("marketplace-business-card");
    expect(screen.queryByText(/secret@example.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contact_email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin_notes/i)).not.toBeInTheDocument();
  });
});
