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
