import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import { ApiClientError } from "@/api/client";
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
    promoteWaitlistEntry: vi.fn(),
    getAdminBooking: vi.fn(),
    updateAdminBooking: vi.fn(),
    cancelAdminBooking: vi.fn(),
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
          has_review: false,
          can_review: false,
          follow_up_email_consent: false,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.listWaitlistEntries).mockResolvedValue({ data: mockWaitlistEntries });
    vi.mocked(adminApi.updateWaitlistEntryStatus).mockResolvedValue({
      ...mockWaitlistEntries[0],
      status: "contacted",
    });
    vi.mocked(adminApi.promoteWaitlistEntry).mockResolvedValue({
      booking: {
        id: "booking-promoted-1",
        business_id: BUSINESS_ID,
        reference: "BK-PROMO",
        status: "pending",
        starts_at: mockWaitlistEntries[0].starts_at,
        ends_at: "2026-06-23T11:00:00-04:00",
        client_notes: "Promoted from waitlist",
        admin_notes: "Promoted from waitlist",
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        service: {
          id: mockWaitlistEntries[0].service_id,
          name: "Arabic Lesson",
          type: "booking",
          duration_minutes: 60,
        },
        client: {
          id: "client-1",
          full_name: "Jane Waitlist",
          email: "jane@example.com",
          phone: "+15551234567",
        },
        created_at: "2026-06-20T08:00:00Z",
        updated_at: "2026-06-20T08:00:00Z",
        has_review: false,
        can_review: false,
        follow_up_email_consent: false,
          review_request_email_sent_at: null,
      },
      waitlist_entry: {
        ...mockWaitlistEntries[0],
        status: "resolved",
      },
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

  it("renders mobile-friendly booking cards with client/service/status/actions", async () => {
    renderBookingsPage();

    const list = await screen.findByTestId("admin-bookings-list");
    expect(list.className).toMatch(/grid-cols-1/);
    const card = screen.getByTestId("admin-booking-card");
    expect(card).toHaveTextContent("John Doe");
    expect(card).toHaveTextContent("Arabic Lesson");
    expect(card).toHaveTextContent("BK-001");
    expect(card).toHaveTextContent("Pending");
    expect(screen.getByTestId("admin-booking-view-booking-1")).toBeInTheDocument();
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

  it("shows Promote button for waiting and contacted entries", async () => {
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    expect(await screen.findByTestId(`waitlist-promote-${WAITLIST_ENTRY_ID}`)).toBeInTheDocument();
  });

  it("hides Promote button for cancelled and resolved entries", async () => {
    vi.mocked(adminApi.listWaitlistEntries).mockResolvedValue({
      data: [
        { ...mockWaitlistEntries[0], id: "wait-cancelled", status: "cancelled" },
        { ...mockWaitlistEntries[0], id: "wait-resolved", status: "resolved" },
      ],
    });
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    expect(await screen.findByTestId("admin-waitlist-view")).toBeInTheDocument();
    expect(screen.queryByTestId("waitlist-promote-wait-cancelled")).not.toBeInTheDocument();
    expect(screen.queryByTestId("waitlist-promote-wait-resolved")).not.toBeInTheDocument();
  });

  it("calls promote API and shows success message", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    await user.click(await screen.findByTestId(`waitlist-promote-${WAITLIST_ENTRY_ID}`));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByTestId("admin-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Promote waitlist entry?" })).toBeInTheDocument();
    expect(
      screen.getByText("This will create a booking if capacity is still available."),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));

    await waitFor(() => {
      expect(adminApi.promoteWaitlistEntry).toHaveBeenCalledWith(
        BUSINESS_ID,
        WAITLIST_ENTRY_ID,
      );
    });
    expect(await screen.findByText("Booking created from waitlist.")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("promote dialog cancel closes without calling promote API", async () => {
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    await user.click(await screen.findByTestId(`waitlist-promote-${WAITLIST_ENTRY_ID}`));
    await user.click(await screen.findByTestId("admin-confirm-dialog-cancel"));

    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
    expect(adminApi.promoteWaitlistEntry).not.toHaveBeenCalled();
  });

  it("shows visible error when promote fails", async () => {
    vi.mocked(adminApi.promoteWaitlistEntry).mockRejectedValue(
      new ApiClientError(409, "SLOT_UNAVAILABLE", "This time slot is fully booked."),
    );
    const user = userEvent.setup();
    renderBookingsPage();

    await user.click(screen.getByTestId("admin-bookings-tab-waitlist"));
    await user.click(await screen.findByTestId(`waitlist-promote-${WAITLIST_ENTRY_ID}`));
    await user.click(await screen.findByTestId("admin-confirm-dialog-confirm"));

    expect(await screen.findByText("This time slot is fully booked.")).toBeInTheDocument();
  });

  it("booking status action opens custom confirm dialog instead of window.confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(adminApi.getAdminBooking).mockResolvedValue({
      id: "booking-1",
      business_id: BUSINESS_ID,
      reference: "BK-001",
      status: "pending",
      starts_at: "2026-06-23T11:00:00-04:00",
      ends_at: "2026-06-23T12:00:00-04:00",
      client_notes: null,
      admin_notes: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      service: {
        id: "svc-1",
        name: "Arabic Lesson",
        type: "booking",
        duration_minutes: 60,
      },
      client: {
        id: "client-1",
        full_name: "John Doe",
        email: "john@example.com",
        phone: null,
      },
      created_at: "2026-06-20T08:00:00Z",
      updated_at: "2026-06-20T08:00:00Z",
      has_review: false,
      can_review: false,
      follow_up_email_consent: false,
          review_request_email_sent_at: null,
    });
    vi.mocked(adminApi.updateAdminBooking).mockResolvedValue({
      id: "booking-1",
      business_id: BUSINESS_ID,
      reference: "BK-001",
      status: "confirmed",
      starts_at: "2026-06-23T11:00:00-04:00",
      ends_at: "2026-06-23T12:00:00-04:00",
      client_notes: null,
      admin_notes: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      service: {
        id: "svc-1",
        name: "Arabic Lesson",
        type: "booking",
        duration_minutes: 60,
      },
      client: {
        id: "client-1",
        full_name: "John Doe",
        email: "john@example.com",
        phone: null,
      },
      created_at: "2026-06-20T08:00:00Z",
      updated_at: "2026-06-20T08:00:00Z",
      has_review: false,
      can_review: false,
      follow_up_email_consent: false,
          review_request_email_sent_at: null,
    });

    renderBookingsPage();

    await user.click(await screen.findByTestId("admin-booking-view-booking-1"));
    expect(await screen.findByTestId("admin-booking-detail-panel")).toBeInTheDocument();
    await user.click(screen.getByTestId("admin-booking-action-confirm"));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Confirm booking?" })).toBeInTheDocument();
    expect(screen.getByTestId("admin-confirm-dialog-confirm")).toHaveTextContent("Confirm booking");

    await user.click(screen.getByTestId("admin-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(adminApi.updateAdminBooking).toHaveBeenCalledWith(BUSINESS_ID, "booking-1", {
        status: "confirmed",
      });
    });
    confirmSpy.mockRestore();
  });
});
