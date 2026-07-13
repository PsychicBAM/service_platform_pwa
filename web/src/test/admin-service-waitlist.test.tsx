import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { AdminServiceWaitlistSection } from "@/components/admin/AdminServiceWaitlistSection";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import { mockAdminServices, BOOKING_SERVICE_ID, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    getBusiness: vi.fn(),
    listServiceSlotCapacityOverrides: vi.fn().mockResolvedValue({ data: [] }),
    listWaitlistEntries: vi.fn().mockResolvedValue({ data: [] }),
  };
});

describe("AdminServiceForm waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows enable waitlist for booking services", () => {
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-waitlist-enabled")).toBeInTheDocument();
    expect(screen.getByText("Enable waitlist")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-waitlist-enabled")).not.toBeChecked();
  });

  it("hides enable waitlist for request services", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={mockAdminServices.find((s) => s.id === ORDER_SERVICE_ID)}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.queryByTestId("admin-service-waitlist-enabled")).not.toBeInTheDocument();
  });

  it("shows waitlist entries section with no auto-promotion helper when enabled", async () => {
    renderRoute(
      <AdminServiceWaitlistSection
        businessId="biz-1"
        serviceId={BOOKING_SERVICE_ID}
        serviceType="booking"
        waitlistEnabled
      />,
    );

    expect(screen.getByText("Waitlist entries")).toBeInTheDocument();
    expect(
      screen.getByText(/Cancelling a booking does not automatically create a new booking yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Automatic promotion will be added later/i)).toBeInTheDocument();
    expect(await screen.findByText("No waitlist entries yet.")).toBeInTheDocument();
  });
});

describe("TimeSlotGrid waitlist", () => {
  it("shows join waitlist label for full waitlist slots", async () => {
    const onSelect = vi.fn();
    renderRoute(
      <TimeSlotGrid
        slots={[
          {
            starts_at: "2026-06-23T10:00:00-04:00",
            ends_at: "2026-06-23T10:30:00-04:00",
            is_fully_booked: true,
            waitlist_available: true,
          },
          {
            starts_at: "2026-06-23T11:00:00-04:00",
            ends_at: "2026-06-23T11:30:00-04:00",
          },
        ]}
        selectedStartsAt={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByTestId("waitlist-slot")).toHaveTextContent("Full · Join waitlist");
    expect(screen.getByTestId("bookable-slot")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("waitlist-slot"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("distinguishes bookable and waitlist slots with the same start time", () => {
    const onSelect = vi.fn();
    const sharedStart = "2026-06-23T10:00:00-04:00";
    renderRoute(
      <TimeSlotGrid
        slots={[
          {
            starts_at: sharedStart,
            ends_at: "2026-06-23T10:30:00-04:00",
            is_fully_booked: true,
            waitlist_available: true,
          },
          {
            starts_at: sharedStart,
            ends_at: "2026-06-23T10:30:00-04:00",
          },
        ]}
        selectedStartsAt={sharedStart}
        selectedWaitlist
        onSelect={onSelect}
      />,
    );

    expect(screen.getAllByTestId("waitlist-slot")).toHaveLength(1);
    expect(screen.getAllByTestId("bookable-slot")).toHaveLength(1);
  });
});
