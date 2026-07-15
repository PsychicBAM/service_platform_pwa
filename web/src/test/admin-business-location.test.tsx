import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as adminApi from "@/api/adminApi";
import * as miniSiteApi from "@/api/miniSiteApi";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_MINI_SITE_CONFIG } from "@/lib/miniSiteConfig";
import { mockAdminBusiness, mockOwnerUser } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  updateBusiness: vi.fn(),
}));
vi.mock("@/api/billingApi", () => ({
  createBillingCheckoutSession: vi.fn(),
}));
vi.mock("@/api/miniSiteApi", () => ({
  getMiniSiteConfig: vi.fn(),
  updateMiniSiteConfig: vi.fn(),
}));
vi.mock("@/api/marketplaceCoverImageApi", () => ({
  uploadMarketplaceCoverImage: vi.fn(),
  removeMarketplaceCoverImage: vi.fn(),
}));

function renderSettingsPage(page: ReactElement = <AdminSettingsPage />) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route: "/admin/settings", path: "/admin/settings" },
  );
}

describe("admin business location settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Dubai Marina",
        public_address: "Marina Walk",
        postal_code: null,
        latitude: 25.08,
        longitude: 55.14,
        location_note: null,
      },
    });
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
  });

  it("shows compact business location summary by default", async () => {
    renderSettingsPage();

    const section = await screen.findByTestId("admin-business-location-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-location-summary")).toHaveTextContent(
      "Dubai Marina, Dubai, UAE",
    );
    expect(screen.getByTestId("admin-business-location-edit")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-business-location-form")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();
  });

  it("shows empty summary when no public location is set", async () => {
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: null,
    });

    renderSettingsPage();

    expect(await screen.findByTestId("admin-business-location-summary")).toHaveTextContent(
      "No public location set",
    );
  });

  it("opens location form when Edit is clicked", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(await screen.findByTestId("admin-business-location-edit"));

    const form = screen.getByTestId("admin-business-location-form");
    expect(form).toBeInTheDocument();
    expect(within(form).getByLabelText("Country")).toHaveValue("UAE");
    expect(within(form).getByLabelText("City")).toHaveValue("Dubai");
    expect(within(form).getByLabelText("District / area")).toHaveValue("Dubai Marina");
    expect(within(form).getByLabelText("Street, building, office")).toHaveValue("Marina Walk");
    expect(within(form).getByLabelText("Postal code")).toBeInTheDocument();
    expect(within(form).getByLabelText("Directions note")).toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();
    expect(
      screen.getByText(/used on your public business page and marketplace listing/i),
    ).toBeInTheDocument();
  });

  it("saves location via updateBusiness and collapses after success", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Jumeirah",
        public_address: "Beach Road",
        postal_code: "12345",
        latitude: 25.08,
        longitude: 55.14,
        location_note: "Near the beach",
      },
    });

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-business-location-edit"));

    await user.clear(screen.getByLabelText("District / area"));
    await user.type(screen.getByLabelText("District / area"), "Jumeirah");
    await user.clear(screen.getByLabelText("Street, building, office"));
    await user.type(screen.getByLabelText("Street, building, office"), "Beach Road");
    await user.type(screen.getByLabelText("Postal code"), "12345");
    await user.type(screen.getByLabelText("Directions note"), "Near the beach");
    await user.click(screen.getByTestId("admin-business-location-save"));

    await waitFor(() => {
      expect(adminApi.updateBusiness).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        expect.objectContaining({
          public_location: {
            country: "UAE",
            city: "Dubai",
            district_or_area: "Jumeirah",
            public_address: "Beach Road",
            postal_code: "12345",
            latitude: 25.08,
            longitude: 55.14,
            location_note: "Near the beach",
          },
        }),
      );
    });

    expect(screen.queryByTestId("admin-business-location-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-business-location-edit")).toBeInTheDocument();
  });

  it("cancel collapses without saving changes", async () => {
    const user = userEvent.setup();

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-business-location-edit"));

    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Abu Dhabi");
    await user.click(screen.getByTestId("admin-business-location-cancel"));

    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-business-location-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-business-location-summary")).toHaveTextContent(
      "Dubai Marina, Dubai, UAE",
    );
  });
});

describe("admin business map pin settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Dubai Marina",
        public_address: "Marina Walk",
        postal_code: null,
        latitude: 25.08,
        longitude: 55.14,
        location_note: null,
      },
    });
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
  });

  it("shows compact map pin card by default", async () => {
    renderSettingsPage();

    expect(await screen.findByTestId("admin-business-map-pin-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-map-pin-summary")).toHaveTextContent("Map pin set");
    expect(screen.getByTestId("admin-business-map-pin-edit")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-business-map-pin-form")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();
  });

  it("shows empty map pin summary when coordinates are missing", async () => {
    vi.mocked(adminApi.getBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Dubai Marina",
        public_address: "Marina Walk",
        postal_code: null,
        latitude: null,
        longitude: null,
        location_note: null,
      },
    });

    renderSettingsPage();

    expect(await screen.findByTestId("admin-business-map-pin-summary")).toHaveTextContent(
      "No map pin set",
    );
  });

  it("opens latitude and longitude fields when Edit is clicked", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));

    const form = screen.getByTestId("admin-business-map-pin-form");
    expect(form).toBeInTheDocument();
    expect(within(form).getByLabelText("Latitude")).toHaveValue("25.08");
    expect(within(form).getByLabelText("Longitude")).toHaveValue("55.14");
    expect(screen.getByText(/optional\. used later for map discovery/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid latitude", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));
    await user.clear(screen.getByLabelText("Latitude"));
    await user.type(screen.getByLabelText("Latitude"), "999");
    await user.click(screen.getByTestId("admin-business-map-pin-save"));

    expect(await screen.findByText(/latitude must be between -90 and 90/i)).toBeInTheDocument();
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid longitude", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));
    await user.clear(screen.getByLabelText("Longitude"));
    await user.type(screen.getByLabelText("Longitude"), "999");
    await user.click(screen.getByTestId("admin-business-map-pin-save"));

    expect(await screen.findByText(/longitude must be between -180 and 180/i)).toBeInTheDocument();
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
  });

  it("shows validation error when only one coordinate is filled", async () => {
    const user = userEvent.setup();
    renderSettingsPage();

    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));
    await user.clear(screen.getByLabelText("Longitude"));
    await user.click(screen.getByTestId("admin-business-map-pin-save"));

    expect(
      await screen.findByText(/enter both latitude and longitude, or clear both fields/i),
    ).toBeInTheDocument();
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
  });

  it("saves valid coordinates and collapses after success", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Dubai Marina",
        public_address: "Marina Walk",
        postal_code: null,
        latitude: 25.2,
        longitude: 55.25,
        location_note: null,
      },
    });

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));

    await user.clear(screen.getByLabelText("Latitude"));
    await user.type(screen.getByLabelText("Latitude"), "25.2");
    await user.clear(screen.getByLabelText("Longitude"));
    await user.type(screen.getByLabelText("Longitude"), "55.25");
    await user.click(screen.getByTestId("admin-business-map-pin-save"));

    await waitFor(() => {
      expect(adminApi.updateBusiness).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        expect.objectContaining({
          public_location: expect.objectContaining({
            latitude: 25.2,
            longitude: 55.25,
            city: "Dubai",
          }),
        }),
      );
    });

    expect(screen.queryByTestId("admin-business-map-pin-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-business-map-pin-edit")).toBeInTheDocument();
  });

  it("cancel collapses without saving map pin changes", async () => {
    const user = userEvent.setup();

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));

    await user.clear(screen.getByLabelText("Latitude"));
    await user.type(screen.getByLabelText("Latitude"), "10");
    await user.click(screen.getByTestId("admin-business-map-pin-cancel"));

    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-business-map-pin-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-business-map-pin-summary")).toHaveTextContent("Map pin set");
  });

  it("clear pin removes latitude and longitude", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Dubai Marina",
        public_address: "Marina Walk",
        postal_code: null,
        latitude: null,
        longitude: null,
        location_note: null,
      },
    });

    renderSettingsPage();
    await user.click(await screen.findByTestId("admin-business-map-pin-edit"));
    await user.click(screen.getByTestId("admin-business-map-pin-clear"));

    await waitFor(() => {
      expect(adminApi.updateBusiness).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        expect.objectContaining({
          public_location: expect.objectContaining({
            latitude: null,
            longitude: null,
            city: "Dubai",
          }),
        }),
      );
    });

    expect(screen.queryByTestId("admin-business-map-pin-form")).not.toBeInTheDocument();
  });
});
