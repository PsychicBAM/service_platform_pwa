import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { BusinessDirectoryPage } from "@/pages/BusinessDirectoryPage";
import * as publicApi from "@/api/publicApi";
import { DEMO_SLUG } from "@/test/mock-fixtures";
import { createTestQueryClient, renderRoute } from "@/test/test-utils";
import type { PublicBusinessDirectoryItem } from "@/types/api";

vi.mock("@/api/publicApi");

const mockDirectoryBusiness: PublicBusinessDirectoryItem = {
  name: "Bright Dental Studio",
  slug: DEMO_SLUG,
  description: "Trusted dental care with same-week appointments.",
  logo_url: null,
  address: "Indiranagar, Bangalore",
  location: {
    country: "India",
    city: "Bangalore",
    district_or_area: "Indiranagar",
    public_address: null,
    postal_code: null,
    latitude: null,
    longitude: null,
    location_note: null,
  },
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
    expect(screen.getByText(/explore top-rated businesses\. book an appointment or send a service request/i)).toBeInTheDocument();
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

  it("submits location filter to directory API and updates router search", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByTestId("marketplace-location-input"), "Dubai");
    await user.click(screen.getByTestId("marketplace-search-button"));

    expect(publicApi.listPublicBusinesses).toHaveBeenCalled();
    const lastCall = vi.mocked(publicApi.listPublicBusinesses).mock.calls.at(-1)?.[0];
    expect(lastCall?.location).toBe("Dubai");
    expect(router.state.location.search).toBe("?location=Dubai");
  });

  it("loads directory with location query param from URL", async () => {
    mockDirectoryResponse([], 0);

    renderRoute(<BusinessDirectoryPage />, {
      route: "/businesses?location=Dubai",
      path: "/businesses",
    });

    expect(await screen.findByTestId("marketplace-active-location")).toHaveTextContent("Dubai");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({ location: "Dubai" }),
    );
  });

  it("clears location filter from URL and API calls", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();

    renderRoute(<BusinessDirectoryPage />, {
      route: "/businesses?location=Dubai",
      path: "/businesses",
    });

    await screen.findByTestId("marketplace-active-location");
    await user.click(screen.getByTestId("marketplace-location-clear"));

    const lastCall = vi.mocked(publicApi.listPublicBusinesses).mock.calls.at(-1)?.[0];
    expect(lastCall?.location).toBeUndefined();
  });

  it("shows clean location text on cards without undefined punctuation", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    const card = await screen.findByTestId("marketplace-business-card");
    expect(within(card).getByText("Indiranagar, Bangalore, India")).toBeInTheDocument();
    expect(within(card).queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(within(card).queryByText(", ,")).not.toBeInTheDocument();
  });

  it("shows initial empty state when no businesses exist and no filters are active", async () => {
    mockDirectoryResponse([], 0);

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(await screen.findByTestId("marketplace-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no businesses listed yet/i)).toBeInTheDocument();
    expect(screen.getByText(/public businesses will appear here once they are published/i)).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-start-business-link")).toHaveAttribute("href", "/pricing");
  });

  it("shows no-results state when filters are active and API returns zero businesses", async () => {
    mockDirectoryResponse([], 0);

    renderRoute(<BusinessDirectoryPage />, {
      route: "/businesses?q=zzzzzzzz",
      path: "/businesses",
    });

    expect(await screen.findByTestId("marketplace-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no businesses found/i)).toBeInTheDocument();
    expect(
      screen.getByText(/try changing your search, location, category, rating, or filters/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-clear-filters")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-browse-all-link")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-active-filter-chips")).toHaveTextContent("Search: zzzzzzzz");
  });

  it("clears all marketplace filters from URL and local state", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      {
        initialEntries: [
          "/businesses?q=coach&location=Dubai&bookable=true&reviews=true&sort=rating",
        ],
      },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByTestId("marketplace-clear-filters"));

    expect(router.state.location.pathname).toBe("/businesses");
    expect(router.state.location.search).toBe("");
    expect(screen.getByTestId("marketplace-search-input")).toHaveValue("");
    expect(screen.getByTestId("marketplace-location-input")).toHaveValue("");
    expect(screen.getByTestId("marketplace-category-filter")).toHaveValue("all");
    expect(screen.getByTestId("marketplace-rating-filter")).toHaveValue("");
    expect(screen.getByTestId("marketplace-sort-filter")).toHaveValue("popular");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        location: undefined,
        bookable: undefined,
        reviews: undefined,
        sort: "popular",
      }),
    );
  });

  it("browse all businesses action clears filters and returns to /businesses", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses?q=zzzzzzzz"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByTestId("marketplace-browse-all-link"));

    expect(router.state.location.pathname).toBe("/businesses");
    expect(router.state.location.search).toBe("");
  });

  it("shows friendly error state with retry when directory API fails", async () => {
    vi.mocked(publicApi.listPublicBusinesses).mockRejectedValue(new Error("Network failed"));

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(await screen.findByTestId("marketplace-error-state")).toBeInTheDocument();
    expect(screen.getByText(/could not load businesses/i)).toBeInTheDocument();
    expect(
      screen.getByText(/something went wrong while loading the marketplace/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/network failed/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("marketplace-retry-button")).toBeInTheDocument();
  });

  it("does not show empty state while directory is loading", async () => {
    vi.mocked(publicApi.listPublicBusinesses).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderRoute(<BusinessDirectoryPage />, {
      route: "/businesses?q=zzzzzzzz",
      path: "/businesses",
    });

    expect(screen.getByText(/loading businesses/i)).toBeInTheDocument();
    expect(screen.queryByTestId("marketplace-empty-state")).not.toBeInTheDocument();
  });

  it("does not render private fields on cards", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    await screen.findByTestId("marketplace-business-card");
    expect(screen.queryByText(/secret@example.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contact_email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin_notes/i)).not.toBeInTheDocument();
  });

  it("shows real sidebar filters without coming soon placeholders", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(await screen.findByTestId("marketplace-sidebar-filters")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-desktop-sidebar").className).toMatch(/hidden/);
    expect(screen.getByTestId("marketplace-desktop-sidebar").className).toMatch(/lg:block/);
    expect(screen.getByTestId("marketplace-mobile-filters-button")).toBeInTheDocument();
    expect(screen.getByLabelText("Bookable online")).toBeInTheDocument();
    expect(screen.getByLabelText("Accepts requests")).toBeInTheDocument();
    expect(screen.getByLabelText("Has reviews")).toBeInTheDocument();
    expect(screen.getByLabelText("Has cover photo")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("opens mobile filters panel with categories and real filters", async () => {
    mockDirectoryResponse();
    const user = userEvent.setup();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    expect(screen.queryByTestId("marketplace-mobile-filters-panel")).not.toBeInTheDocument();
    await user.click(await screen.findByTestId("marketplace-mobile-filters-button"));

    const panel = screen.getByTestId("marketplace-mobile-filters-panel");
    expect(panel).toHaveTextContent("Categories");
    expect(panel).toHaveTextContent("Bookable online");
    expect(panel).toHaveTextContent("Accepts requests");
    expect(panel).toHaveTextContent("Has reviews");
    expect(panel).toHaveTextContent("Has cover photo");
  });

  it("updates URL from mobile filters panel and can clear filters", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses?location=Dubai"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByTestId("marketplace-mobile-filters-button"));
    await user.click(screen.getByTestId("marketplace-mobile-filter-bookable"));

    expect(router.state.location.search).toContain("bookable=true");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Dubai",
        bookable: true,
      }),
    );

    await user.click(screen.getByTestId("marketplace-mobile-clear-filters"));
    expect(router.state.location.search).toBe("?location=Dubai");
    const lastCall = vi.mocked(publicApi.listPublicBusinesses).mock.calls.at(-1)?.[0];
    expect(lastCall?.bookable).toBeUndefined();
  });

  it("updates URL and API call when sidebar filters are toggled", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses?location=Dubai&q=coach"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByTestId("marketplace-filter-bookable"));

    expect(router.state.location.search).toBe("?location=Dubai&q=coach&bookable=true");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Dubai",
        q: "coach",
        bookable: true,
      }),
    );
  });

  it("clears sidebar filters from URL and API calls", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses?bookable=true&reviews=true"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByTestId("marketplace-sidebar-clear-filters"));

    expect(router.state.location.search).toBe("");
    const lastCall = vi.mocked(publicApi.listPublicBusinesses).mock.calls.at(-1)?.[0];
    expect(lastCall?.bookable).toBeUndefined();
    expect(lastCall?.reviews).toBeUndefined();
  });

  it("shows marketplace sort options with clear labels", async () => {
    mockDirectoryResponse();

    renderRoute(<BusinessDirectoryPage />, { route: "/businesses", path: "/businesses" });

    const sortSelect = await screen.findByTestId("marketplace-sort-filter");
    expect(sortSelect).toHaveValue("popular");
    expect(within(sortSelect).getByRole("option", { name: "Popular" })).toBeInTheDocument();
    expect(within(sortSelect).getByRole("option", { name: "Highest rated" })).toBeInTheDocument();
    expect(within(sortSelect).getByRole("option", { name: "Most reviewed" })).toBeInTheDocument();
    expect(within(sortSelect).getByRole("option", { name: "Newest" })).toBeInTheDocument();
    expect(within(sortSelect).getByRole("option", { name: "Bookable first" })).toBeInTheDocument();
    expect(within(sortSelect).getByRole("option", { name: "Name A-Z" })).toBeInTheDocument();
  });

  it("updates URL and API call when sort changes and preserves other params", async () => {
    mockDirectoryResponse([], 0);
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/businesses", element: <BusinessDirectoryPage /> }],
      { initialEntries: ["/businesses?location=Dubai&q=coach&bookable=true"] },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await user.selectOptions(screen.getByTestId("marketplace-sort-filter"), "rating");

    expect(router.state.location.search).toBe("?location=Dubai&q=coach&bookable=true&sort=rating");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Dubai",
        q: "coach",
        bookable: true,
        sort: "rating",
      }),
    );
  });

  it("defaults invalid URL sort to popular without crashing", async () => {
    mockDirectoryResponse([], 0);

    renderRoute(<BusinessDirectoryPage />, {
      route: "/businesses?sort=not-valid",
      path: "/businesses",
    });

    expect(await screen.findByTestId("marketplace-sort-filter")).toHaveValue("popular");
    expect(publicApi.listPublicBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "popular" }),
    );
  });
});
