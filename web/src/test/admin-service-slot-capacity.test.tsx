import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as adminApi from "@/api/adminApi";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { mockAdminServices, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listServiceSlotCapacityOverrides: vi.fn(),
    createServiceSlotCapacityOverride: vi.fn(),
    deleteServiceSlotCapacityOverride: vi.fn(),
  };
});

const mockOverrides = {
  data: [
    {
      id: "override-1",
      business_id: "biz-1",
      service_id: "booking-service-id",
      starts_at: "2026-07-13T10:00:00-04:00",
      capacity: 10,
      note: "Group session",
      created_at: "2026-07-12T12:00:00Z",
      updated_at: "2026-07-12T12:00:00Z",
    },
  ],
};

describe("AdminServiceForm special group time slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listServiceSlotCapacityOverrides).mockResolvedValue(mockOverrides);
  });

  it("shows section when editing a booking service", async () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 1 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-slot-capacity-section")).toBeInTheDocument();
    expect(screen.getByText("Special group time slots")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("admin-service-slot-capacity-list")).toBeInTheDocument();
    });
    expect(screen.getByText(/Group session/)).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-slot-capacity-delete-override-1")).toBeInTheDocument();
  });

  it("shows save-first helper in create mode", () => {
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-slot-capacity-save-first")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-service-slot-capacity-add")).not.toBeInTheDocument();
  });

  it("hides section for request services", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{
          ...mockAdminServices[1],
          id: ORDER_SERVICE_ID,
          capacity: 1,
        }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.queryByTestId("admin-service-slot-capacity-section")).not.toBeInTheDocument();
  });

  it("capacity input enforces min=1", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 1 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-slot-capacity-input")).toHaveAttribute("min", "1");
  });

  it("shows add form controls in edit mode", async () => {
    const user = userEvent.setup();
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 1 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-slot-capacity-date")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-slot-capacity-time")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-slot-capacity-add")).toBeInTheDocument();

    await user.click(screen.getByTestId("admin-service-slot-capacity-add"));
    expect(screen.getByText("Date and time are required.")).toBeInTheDocument();
  });
});
