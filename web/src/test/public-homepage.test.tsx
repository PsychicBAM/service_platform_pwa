import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformLandingPage } from "@/pages/PlatformLandingPage";
import * as publicApi from "@/api/publicApi";
import { DEMO_SLUG } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";
import type { PublicBusinessDirectoryItem } from "@/types/api";

vi.mock("@/api/publicApi");

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFeaturedBusiness: PublicBusinessDirectoryItem = {
  name: "CarePlus Clinic",
  slug: DEMO_SLUG,
  description: "Trusted clinic with same-week appointments.",
  logo_url: null,
  address: "Indiranagar, Bangalore",
  operating_mode: "both",
  average_rating: 4.9,
  review_count: 128,
  cover_image_url: "/uploads/services/demo/cover.webp",
  has_booking_service: true,
  starts_at_price_cents: 5000,
  starts_at_currency: "USD",
  services_preview: [
    {
      name: "General Checkup",
      type: "booking",
      price_cents: 5000,
      currency: "USD",
      price_type: "fixed",
      duration_minutes: 45,
      image_url: "/uploads/services/demo/cover.webp",
    },
  ],
};

function mockFeaturedResponse(
  data: PublicBusinessDirectoryItem[] = [mockFeaturedBusiness],
  total = data.length,
) {
  vi.mocked(publicApi.listPublicBusinesses).mockResolvedValue({
    data,
    meta: { page: 1, limit: 5, total },
  });
}

describe("public homepage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("renders homepage hero heading", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    expect(await screen.findByTestId("homepage-hero-heading")).toHaveTextContent(
      /discover and book trusted/i,
    );
    expect(screen.getByText(/local services/i)).toBeInTheDocument();
  });

  it("navigates search to /businesses?q=...", async () => {
    mockFeaturedResponse([], 0);
    const user = userEvent.setup();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    await user.type(screen.getByTestId("homepage-service-search"), "dental");
    await user.click(screen.getByTestId("homepage-search-button"));

    expect(mockNavigate).toHaveBeenCalledWith("/businesses?q=dental");
  });

  it("renders featured businesses from mocked public endpoint", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    expect(await screen.findByTestId("homepage-featured-grid")).toBeInTheDocument();
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith({
      sort: "popular",
      limit: 5,
      page: 1,
    });
    expect(screen.getByRole("heading", { name: mockFeaturedBusiness.name })).toBeInTheDocument();
  });

  it("links featured business CTA to /b/:slug", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    const cta = await screen.findByTestId("featured-business-cta");
    expect(cta).toHaveAttribute("href", `/b/${DEMO_SLUG}`);
  });

  it("links browse businesses to /businesses", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    expect(await screen.findByTestId("homepage-browse-businesses")).toHaveAttribute(
      "href",
      "/businesses",
    );
    expect(screen.getByTestId("homepage-view-all-businesses")).toHaveAttribute(
      "href",
      "/businesses",
    );
  });

  it("renders how it works section", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    const section = await screen.findByTestId("homepage-how-it-works");
    expect(within(section).getByText("Find the right service")).toBeInTheDocument();
    expect(within(section).getByText("Book in minutes")).toBeInTheDocument();
    expect(within(section).getByText("Enjoy and review")).toBeInTheDocument();
  });

  it("does not render private fields in mocked featured data", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    await screen.findByTestId("featured-business-card");
    expect(screen.queryByText(/secret@example.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contact_email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin_notes/i)).not.toBeInTheDocument();
  });
});
