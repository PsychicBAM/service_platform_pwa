import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
        latitude: null,
        longitude: null,
        location_note: null,
      },
    });
    vi.mocked(miniSiteApi.getMiniSiteConfig).mockResolvedValue(DEFAULT_MINI_SITE_CONFIG);
  });

  it("renders business location section with helper text", async () => {
    renderSettingsPage();

    const section = await screen.findByTestId("admin-business-location-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Business location")).toBeInTheDocument();
    expect(
      screen.getByText(/used on your public business page and marketplace listing/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toHaveValue("UAE");
    expect(screen.getByLabelText("City")).toHaveValue("Dubai");
    expect(screen.getByLabelText("District / area")).toHaveValue("Dubai Marina");
    expect(screen.getByLabelText("Public address")).toHaveValue("Marina Walk");
    expect(screen.getByLabelText("Latitude")).toBeInTheDocument();
    expect(screen.getByLabelText("Longitude")).toBeInTheDocument();
    expect(
      screen.getByText(/optional\. leave empty if you do not want to set a map pin yet/i),
    ).toBeInTheDocument();
  });

  it("saves edited location fields via updateBusiness", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateBusiness).mockResolvedValue({
      ...mockAdminBusiness,
      public_location: {
        country: "UAE",
        city: "Dubai",
        district_or_area: "Jumeirah",
        public_address: "Beach Road",
        latitude: 25.2,
        longitude: 55.25,
        location_note: "Near the beach",
      },
    });

    renderSettingsPage();
    await screen.findByTestId("admin-business-location-section");

    await user.clear(screen.getByLabelText("District / area"));
    await user.type(screen.getByLabelText("District / area"), "Jumeirah");
    await user.clear(screen.getByLabelText("Public address"));
    await user.type(screen.getByLabelText("Public address"), "Beach Road");
    await user.type(screen.getByLabelText("Latitude"), "25.2");
    await user.type(screen.getByLabelText("Longitude"), "55.25");
    await user.type(screen.getByLabelText("Directions note"), "Near the beach");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(adminApi.updateBusiness).toHaveBeenCalled();
    });
    const payload = vi.mocked(adminApi.updateBusiness).mock.calls.at(-1)?.[1];
    expect(payload?.public_location).toMatchObject({
      country: "UAE",
      city: "Dubai",
      district_or_area: "Jumeirah",
      public_address: "Beach Road",
      latitude: 25.2,
      longitude: 55.25,
      location_note: "Near the beach",
    });
  });

  it("shows validation error for invalid latitude", async () => {
    const user = userEvent.setup();

    renderSettingsPage();
    await screen.findByTestId("admin-business-location-section");

    await user.clear(screen.getByLabelText("Latitude"));
    await user.type(screen.getByLabelText("Latitude"), "999");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText(/latitude must be between -90 and 90/i)).toBeInTheDocument();
    expect(adminApi.updateBusiness).not.toHaveBeenCalled();
  });
});
