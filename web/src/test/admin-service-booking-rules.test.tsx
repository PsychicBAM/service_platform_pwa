import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { mockAdminServices, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    getBusiness: vi.fn(),
    listServiceSlotCapacityOverrides: vi.fn().mockResolvedValue({ data: [] }),
  };
});

describe("AdminServiceForm booking rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows booking rules fields for booking services with defaults", () => {
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-booking-rules")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-min-notice")).toHaveValue(0);
    expect(screen.getByTestId("admin-service-booking-window")).toHaveValue(null);
    expect(screen.getByLabelText("Minimum notice (minutes)")).toBeInTheDocument();
    expect(
      screen.getByText(/Example: 120 means customers must book at least 2 hours/),
    ).toBeInTheDocument();
  });

  it("hides booking rules for request services", async () => {
    const user = userEvent.setup();
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Type"), "order");
    expect(screen.queryByTestId("admin-service-booking-rules")).not.toBeInTheDocument();
  });

  it("shows saved booking rules when editing", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{
          ...mockAdminServices[0],
          booking_min_notice_minutes: 120,
          booking_window_days: 30,
        }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-min-notice")).toHaveValue(120);
    expect(screen.getByTestId("admin-service-booking-window")).toHaveValue(30);
  });

  it("hides booking rules when editing request service", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{
          ...mockAdminServices[1],
          id: ORDER_SERVICE_ID,
        }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.queryByTestId("admin-service-booking-rules")).not.toBeInTheDocument();
  });
});
