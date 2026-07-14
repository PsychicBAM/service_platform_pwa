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

const mockFeaturedBusinessTwo: PublicBusinessDirectoryItem = {
  ...mockFeaturedBusiness,
  name: "Peak Performance Coaching",
  slug: "peak-performance-coaching",
  cover_image_url: "/uploads/services/coach/cover.webp",
  services_preview: [
    {
      name: "Personal Training",
      type: "booking",
      price_cents: 7500,
      currency: "USD",
      price_type: "fixed",
      duration_minutes: 60,
      image_url: "/uploads/services/coach/training.webp",
    },
  ],
};

const mockFeaturedBusinessThree: PublicBusinessDirectoryItem = {
  ...mockFeaturedBusiness,
  name: "EduSmart Tutors",
  slug: "edusmart-tutors",
  cover_image_url: "/uploads/services/tutor/cover.webp",
  services_preview: [
    {
      name: "Math Lesson",
      type: "booking",
      price_cents: 4500,
      currency: "USD",
      price_type: "fixed",
      duration_minutes: 60,
      image_url: "/uploads/services/tutor/math.webp",
    },
  ],
};

function mockFeaturedResponse(
  data: PublicBusinessDirectoryItem[] = [mockFeaturedBusiness],
  total = data.length,
) {
  vi.mocked(publicApi.listPublicBusinesses).mockResolvedValue({
    data,
    meta: { page: 1, limit: 12, total },
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
      limit: 12,
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

  it("renders four collage tiles when only one business exists", async () => {
    mockFeaturedResponse([mockFeaturedBusiness]);

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    const collage = await screen.findByTestId("homepage-hero-collage");
    expect(collage).toBeInTheDocument();
    expect(screen.getAllByTestId("hero-collage-tile")).toHaveLength(4);
    expect(screen.getByText("Coaching")).toBeInTheDocument();
    expect(screen.getByText("Tutoring")).toBeInTheDocument();
  });

  it("renders hero collage with multiple media tiles", async () => {
    mockFeaturedResponse([
      mockFeaturedBusiness,
      mockFeaturedBusinessTwo,
      mockFeaturedBusinessThree,
    ]);

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    await screen.findByTestId("homepage-featured-grid");
    const collage = screen.getByTestId("homepage-hero-collage");
    expect(collage).toBeInTheDocument();
    expect(screen.getAllByTestId("hero-collage-tile")).toHaveLength(4);

    const imageSrcs = Array.from(collage.querySelectorAll("img")).map((img) =>
      img.getAttribute("src"),
    );
    expect(imageSrcs).toContain("/uploads/services/demo/cover.webp");
    expect(imageSrcs).toContain("/uploads/services/coach/cover.webp");
    expect(imageSrcs).toContain("/uploads/services/tutor/cover.webp");
  });

  it("renders Get started before Browse businesses in hero CTAs", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    const ctaArea = await screen.findByTestId("homepage-hero-ctas");
    const links = within(ctaArea).getAllByRole("link");

    expect(links[0]).toHaveTextContent("Get started");
    expect(links[0]).toHaveAttribute("href", "/pricing");
    expect(links[0].className).toMatch(/bg-brand-700/);

    expect(links[1]).toHaveTextContent("Browse businesses");
    expect(links[1]).toHaveAttribute("href", "/businesses");
    expect(links[1].className).toMatch(/border-slate-200/);
    expect(links[1].className).not.toMatch(/bg-brand-700/);
  });

  it("links get started CTAs to /pricing", async () => {
    mockFeaturedResponse();

    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    expect(await screen.findByTestId("homepage-get-started")).toHaveAttribute("href", "/pricing");
    expect(screen.getByTestId("homepage-get-started")).toHaveTextContent("Get started");
    expect(screen.getByTestId("homepage-business-cta")).toHaveAttribute("href", "/pricing");
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
