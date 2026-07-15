import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminServicesPage } from "@/pages/admin/AdminServicesPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import { getAdminOnboardingDismissStorageKey } from "@/lib/adminOnboarding";
import {
  emptyListMeta,
  mockAdminBusiness,
  mockAdminServices,
  mockClientUser,
  mockOwnerUser,
  mockSchedule,
  BOOKING_SERVICE_ID,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

const COMPLETE_ADMIN_BUSINESS = {
  ...mockAdminBusiness,
  address: "123 Demo Street",
  public_location: {
    country: "UAE",
    city: "Dubai",
    district_or_area: "Marina",
    public_address: null,
    postal_code: null,
    latitude: null,
    longitude: null,
    location_note: null,
  },
  marketplace_cover_image: {
    kind: "image" as const,
    url: "/uploads/cover.webp",
    thumbnailUrl: "/uploads/cover_thumb.webp",
    alt: "",
    filename: "cover.webp",
    contentType: "image/webp",
    size: 1000,
    originalSize: 2000,
    width: 1200,
    height: 800,
  },
};

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", () => ({
  getBusiness: vi.fn(),
  getSchedule: vi.fn(),
  listAdminServices: vi.fn(),
  listAdminBookings: vi.fn(),
  listAdminOrders: vi.fn(),
  listAdminClients: vi.fn(),
  createAdminService: vi.fn(),
  updateAdminService: vi.fn(),
  deleteAdminService: vi.fn(),
}));

function setupAdminApiMocks() {
  vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
  vi.mocked(adminApi.getSchedule).mockResolvedValue(mockSchedule);
  vi.mocked(adminApi.listAdminServices).mockResolvedValue({
    data: mockAdminServices,
    meta: { page: 1, limit: 100, total: mockAdminServices.length },
  });
  vi.mocked(adminApi.listAdminBookings).mockResolvedValue({ data: [], meta: emptyListMeta });
  vi.mocked(adminApi.listAdminOrders).mockResolvedValue({ data: [], meta: emptyListMeta });
  vi.mocked(adminApi.listAdminClients).mockResolvedValue({ data: [], meta: emptyListMeta });
}

function renderAdminPage(page: ReactElement, route = "/admin") {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      {page}
    </AdminBusinessProvider>,
    { route, path: "/admin/*" },
  );
}

describe("admin pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminApiMocks();
    window.localStorage.clear();
  });

  it("J. non-authenticated /admin shows login prompt", () => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());

    renderRoute(<AdminGuard />, { route: "/admin", path: "/admin/*" });

    expect(screen.getByRole("heading", { name: /^admin$/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in with a business account to access admin."),
    ).toBeInTheDocument();
  });

  it("K. client user without business membership cannot access /admin", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<AdminGuard />, { route: "/admin", path: "/admin/*" });

    expect(screen.getByText("No business access")).toBeInTheDocument();
  });

  it("L. owner user can render admin dashboard with mocked business", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderAdminPage(<AdminDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(`Overview for ${mockAdminBusiness.name}`)).toBeInTheDocument();
    const checklist = screen.getByTestId("admin-onboarding-checklist");
    expect(checklist).toBeInTheDocument();
    expect(checklist.className).toMatch(/bg-slate-50\/40/);
    expect(screen.getByText(/complete your business profile/i)).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-progress")).toHaveTextContent(/of 6 completed/);
    expect(screen.getByTestId("admin-onboarding-hide")).toHaveAttribute(
      "aria-label",
      "Hide onboarding checklist",
    );
    expect(screen.getByTestId("admin-onboarding-item-services")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-item-location")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-item-cover")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-item-hours")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-item-preview")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-item-share")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-action-services")).toHaveAttribute(
      "href",
      "/admin/services?focus=add-service",
    );
    expect(screen.getByTestId("admin-onboarding-action-location")).toHaveAttribute(
      "href",
      "/admin/settings?focus=business-location",
    );
    expect(screen.getByTestId("admin-onboarding-action-hours")).toHaveAttribute(
      "href",
      "/admin/schedule?focus=working-hours",
    );
    expect(screen.getByTestId("admin-onboarding-action-cover")).toHaveAttribute(
      "href",
      "/admin/settings?focus=marketplace-cover",
    );
    expect(screen.getByTestId("admin-onboarding-action-preview")).toHaveAttribute(
      "href",
      `/b/${mockAdminBusiness.slug}`,
    );
    expect(screen.getByRole("heading", { name: "Public business page" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current plan" })).toBeInTheDocument();
    expect(screen.getByTestId("current-plan-badge")).toHaveTextContent("Free");
    expect(screen.getByRole("link", { name: "View plan details" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByTestId("public-business-url")).toHaveTextContent(
      `/b/${mockAdminBusiness.slug}`,
    );
    expect(screen.getByRole("link", { name: "Preview page" })).toHaveAttribute(
      "href",
      `/b/${mockAdminBusiness.slug}`,
    );
    expect(screen.getByText("Appointments and requests")).toBeInTheDocument();
  });

  it("L2. completed onboarding shows compact success state without full checklist rows", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.getBusiness).mockResolvedValue(COMPLETE_ADMIN_BUSINESS);

    renderAdminPage(<AdminDashboardPage />);

    expect(await screen.findByTestId("admin-onboarding-complete")).toBeInTheDocument();
    expect(screen.getByTestId("admin-onboarding-complete-label")).toHaveTextContent(
      "Business profile complete",
    );
    expect(screen.queryByTestId("admin-onboarding-checklist")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-onboarding-item-services")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-onboarding-item-location")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-onboarding-progress")).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("L3. hiding onboarding checklist persists dismissal via localStorage", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    const { unmount } = renderAdminPage(<AdminDashboardPage />);

    expect(await screen.findByTestId("admin-onboarding-checklist")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-onboarding-hide"));
    expect(screen.queryByTestId("admin-onboarding-checklist")).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(getAdminOnboardingDismissStorageKey(mockAdminBusiness)),
    ).toBe("1");

    unmount();
    renderAdminPage(<AdminDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-onboarding-checklist")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-onboarding-complete")).not.toBeInTheDocument();
  });

  it("L4. services focus=add-service opens create flow and highlights Add service", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    Element.prototype.scrollIntoView = vi.fn();

    renderAdminPage(<AdminServicesPage />, "/admin/services?focus=add-service");

    expect(await screen.findByRole("heading", { name: "Services" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("admin-services-add")).toHaveAttribute("data-admin-focused", "true");
    });
    expect(screen.getByTestId("admin-services-add").className).toMatch(/ring-2/);
    expect(screen.getByTestId("admin-services-create-area")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add service" })).toBeInTheDocument();
  });

  it("M. admin services page renders mocked services", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderAdminPage(<AdminServicesPage />);

    expect(await screen.findByRole("heading", { name: "Services" })).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-header")).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-add")).toBeInTheDocument();
    expect(await screen.findByText(mockAdminServices[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockAdminServices[1].name)).toBeInTheDocument();
    const list = screen.getByTestId("admin-services-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const cards = screen.getAllByTestId("admin-service-card");
    expect(cards).toHaveLength(mockAdminServices.length);
    expect(within(cards[0]).getByText("Booking")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Request")).toBeInTheDocument();
    expect(screen.getByTestId(`admin-service-status-${BOOKING_SERVICE_ID}`)).toHaveTextContent(
      "Active",
    );
    expect(screen.getByTestId(`admin-service-edit-${BOOKING_SERVICE_ID}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-service-list-thumb-placeholder-${BOOKING_SERVICE_ID}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-service-list-image-status-${BOOKING_SERVICE_ID}`),
    ).toHaveTextContent("No image");
    expect(screen.getByTestId(`admin-service-waitlist-badge-${BOOKING_SERVICE_ID}`)).toHaveTextContent(
      "Waitlist enabled",
    );
    expect(screen.getByTestId(`admin-service-waitlist-hint-${BOOKING_SERVICE_ID}`)).toHaveTextContent(
      "Manage entries in Bookings → Waitlist.",
    );
    expect(screen.getByTestId(`admin-service-view-waitlist-${BOOKING_SERVICE_ID}`)).toBeInTheDocument();
  });

  it("M2. admin services empty state shows Add service CTA", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [],
      meta: emptyListMeta,
    });

    renderAdminPage(<AdminServicesPage />);

    expect(await screen.findByTestId("admin-services-empty")).toBeInTheDocument();
    expect(screen.getByText("No services yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first service so customers can book or send requests."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin-services-empty-add")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-service-card")).not.toBeInTheDocument();
  });

  it("M3. long service names clamp without undefined text", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    const longName =
      "Very Long Coaching Package With Extra Extra Extra Words For Mobile Overflow Testing";
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [
        {
          ...mockAdminServices[0],
          name: longName,
          description:
            "A long description that should clamp to two lines so the mobile card stays compact and readable for business owners managing their catalog.",
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    });

    renderAdminPage(<AdminServicesPage />);

    const card = await screen.findByTestId("admin-service-card");
    expect(within(card).getByRole("heading", { name: longName }).className).toMatch(/truncate/);
    expect(within(card).getByText(/long description that should clamp/i).className).toMatch(
      /line-clamp-2/,
    );
    expect(card.textContent).not.toMatch(/undefined/i);
  });

  it("N. admin services list shows thumbnail when service has image", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminServices).mockResolvedValue({
      data: [
        {
          ...mockAdminServices[0],
          image: {
            kind: "image" as const,
            url: "/uploads/services/biz-1/svc-1/abc.webp",
            thumbnailUrl: "/uploads/services/biz-1/svc-1/abc_thumb.webp",
            alt: "",
            filename: "photo.jpg",
            contentType: "image/webp",
            size: 1200,
            originalSize: 4500,
            width: 1200,
            height: 800,
          },
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    });

    renderAdminPage(<AdminServicesPage />);

    expect(await screen.findByTestId(`admin-service-list-thumb-${BOOKING_SERVICE_ID}`)).toHaveAttribute(
      "src",
      "/uploads/services/biz-1/svc-1/abc_thumb.webp",
    );
    expect(
      screen.getByTestId(`admin-service-list-image-status-${BOOKING_SERVICE_ID}`),
    ).toHaveTextContent("photo.jpg");
    expect(
      screen.queryByTestId(`admin-service-list-thumb-placeholder-${BOOKING_SERVICE_ID}`),
    ).not.toBeInTheDocument();
  });

  it("O. deactivate opens custom dialog and cancel does not mutate", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.updateAdminService).mockResolvedValue({
      ...mockAdminServices[0],
      is_active: false,
    });

    renderAdminPage(<AdminServicesPage />);

    await screen.findByTestId(`admin-service-toggle-${BOOKING_SERVICE_ID}`);
    await user.click(screen.getByTestId(`admin-service-toggle-${BOOKING_SERVICE_ID}`));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("admin-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deactivate service?" })).toBeInTheDocument();
    expect(
      screen.getByText("This service will be hidden from your public catalog."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-cancel")).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-confirm")).toHaveTextContent("Deactivate");

    await user.click(screen.getByTestId("admin-confirm-dialog-cancel"));
    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    expect(adminApi.updateAdminService).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("P. deactivate confirm calls updateAdminService", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.updateAdminService).mockResolvedValue({
      ...mockAdminServices[0],
      is_active: false,
    });

    renderAdminPage(<AdminServicesPage />);

    await user.click(await screen.findByTestId(`admin-service-toggle-${BOOKING_SERVICE_ID}`));
    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(adminApi.updateAdminService).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        BOOKING_SERVICE_ID,
        { is_active: false },
      );
    });
    await waitFor(() => {
      expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    });
  });

  it("Q. delete opens destructive custom dialog and confirm deletes", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.deleteAdminService).mockResolvedValue(undefined as never);

    renderAdminPage(<AdminServicesPage />);

    await user.click(await screen.findByTestId(`admin-service-delete-${BOOKING_SERVICE_ID}`));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Delete service?" })).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-confirm")).toHaveTextContent("Delete");
    expect(screen.getByTestId("admin-confirm-dialog").className).toMatch(/bottom-0|rounded-t/);

    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(adminApi.deleteAdminService).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        BOOKING_SERVICE_ID,
      );
    });
    confirmSpy.mockRestore();
  });

  it("R. escape closes custom confirm dialog", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderAdminPage(<AdminServicesPage />);

    await user.click(await screen.findByTestId(`admin-service-toggle-${BOOKING_SERVICE_ID}`));
    expect(await screen.findByTestId("admin-confirm-dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    expect(adminApi.updateAdminService).not.toHaveBeenCalled();
  });
});
