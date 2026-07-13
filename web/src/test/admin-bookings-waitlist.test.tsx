import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import {
  emptyListMeta,
  mockOwnerUser,
  mockWaitlistEntries,
  WAITLIST_ENTRY_ID,
  BUSINESS_ID,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminBookings: vi.fn(),
    listWaitlistEntries: vi.fn(),
    updateWaitlistEntryStatus: vi.fn(),
    getAdminBooking: vi.fn(),
  };
});

function renderBookingsPage(route = "/admin/bookings") {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
      <AdminBookingsPage />
    </AdminBusinessProvider>,
    { route, path: "/admin/bookings" },
  );
}

describe("AdminBookingsPage waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-1",
          service_name: "Arabic Lesson",
          reference: "BK-001",
          client_name: "John Doe",
          client_email: "john@example.com",
          client_phone: null,
          starts_at: "2026-06-23T11:00:00-04:00",
          ends_at: "2026-06-23T12:00:00-04:00",
          status: "pending",
        },
      ],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.listWaitlistEntries).mockResolvedValue({ data: mockWaitlistEntries });
    vi.mocked(adminApi.updateWaitlistEntryStatus).mockResolvedValue({
      ...mockWaitlistEntries[0],
      status: "contacted",
    });
  });

  it("shows main tabs Bookings and Waitlist", async () => {
    renderBookingsPage();

    expect(await screen.findByTestId("admin-bookings-tab-bookings")).toBeInTheDocument();
    expect(screen.getByTestId("admin-bookings-tab-waitlist")).toBeInTheDocument();
  });

  it("defaults to bookings view with booking status filters", async () => {
    renderBookingsPage();

    expect(await screen.findByText("BK-001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmed" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-waitlist-view")).not.toBeInTheDocument();
  });

  it("fetches and renders waitlist entries on Waitlist tab", async () => {
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));

    expect(await screen.findByTestId("admin-waitlist-view")).toBeInTheDocument();
    expect(adminApi.listWaitlistEntries).toHaveBeenCalledWith(BUSINESS_ID, undefined);
    expect(screen.getByText("Jane Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Arabic Lesson")).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Prefer morning/)).toBeInTheDocument();
    expect(screen.getByTestId("waitlist-entry-card")).toBeInTheDocument();
  });

  it("shows empty waitlist state", async () => {
    vi.mocked(adminApi.listWaitlistEntries).mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));

    expect(await screen.findByText("No waitlist entries yet.")).toBeInTheDocument();
  });

  it("updates waitlist status via admin API", async () => {
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    expect(await screen.findByTestId(`waitlist-status-select-${WAITLIST_ENTRY_ID}`)).toBeInTheDocument();

    await user.selectOptions(
      screen.getByTestId(`waitlist-status-select-${WAITLIST_ENTRY_ID}`),
      "contacted",
    );

    await waitFor(() => {
      expect(adminApi.updateWaitlistEntryStatus).toHaveBeenCalledWith(
        BUSINESS_ID,
        WAITLIST_ENTRY_ID,
        "contacted",
      );
    });
  });

  it("opens waitlist tab from query param", async () => {
    renderBookingsPage("/admin/bookings?tab=waitlist");

    expect(await screen.findByTestId("admin-waitlist-view")).toBeInTheDocument();
    expect(await screen.findByText("Jane Waitlist")).toBeInTheDocument();
  });
});
