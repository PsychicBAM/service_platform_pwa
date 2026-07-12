import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as adminApi from "@/api/adminApi";
import { ApiClientError } from "@/api/client";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { mockAdminBusiness, mockAdminServices, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    getBusiness: vi.fn(),
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

const mockAdminBusinessNy = {
  ...mockAdminBusiness,
  timezone: "America/New_York",
};

function fillOverrideForm(date: string, time: string, capacity = "5") {
  fireEvent.change(screen.getByTestId("admin-service-slot-capacity-date"), {
    target: { value: date },
  });
  fireEvent.change(screen.getByTestId("admin-service-slot-capacity-time"), {
    target: { value: time },
  });
  fireEvent.change(screen.getByTestId("admin-service-slot-capacity-input"), {
    target: { value: capacity },
  });
}

const createdOverride = {
  id: "override-new",
  business_id: "biz-1",
  service_id: "booking-service-id",
  starts_at: "2026-07-13T09:00:00-04:00",
  capacity: 5,
  note: "Morning group",
  created_at: "2026-07-12T12:00:00Z",
  updated_at: "2026-07-12T12:00:00Z",
};

describe("AdminServiceForm special group time slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
    vi.mocked(adminApi.listServiceSlotCapacityOverrides).mockResolvedValue({ data: [] });
  });

  it("shows section when editing a booking service with existing overrides", async () => {
    vi.mocked(adminApi.listServiceSlotCapacityOverrides).mockResolvedValue(mockOverrides);

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

  it("shows create-mode note and pending override list", async () => {
    const user = userEvent.setup();
    const onPendingChange = vi.fn();

    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        pendingSlotCapacityOverrides={[]}
        onPendingSlotCapacityOverridesChange={onPendingChange}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(adminApi.getBusiness).toHaveBeenCalled();
    });

    expect(screen.getByTestId("admin-service-slot-capacity-create-note")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-slot-capacity-add")).toBeInTheDocument();

    fillOverrideForm("2026-07-13", "09:00", "5");
    await user.click(screen.getByTestId("admin-service-slot-capacity-add"));

    expect(onPendingChange).toHaveBeenCalledWith([
      expect.objectContaining({
        date: "2026-07-13",
        time: "09:00",
        capacity: 5,
      }),
    ]);
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

  it("edit mode Add calls API and saved override appears in list", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusinessNy);
    vi.mocked(adminApi.createServiceSlotCapacityOverride).mockResolvedValue(createdOverride);

    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 1 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(adminApi.getBusiness).toHaveBeenCalled();
    });

    fillOverrideForm("2026-07-13", "09:00", "5");
    await user.click(screen.getByTestId("admin-service-slot-capacity-add"));

    await waitFor(() => {
      expect(adminApi.createServiceSlotCapacityOverride).toHaveBeenCalledWith(
        "biz-1",
        "booking-service-id",
        expect.objectContaining({
          capacity: 5,
          note: null,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-service-slot-capacity-list")).toBeInTheDocument();
      expect(screen.getByText(/Capacity 5/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-service-slot-capacity-empty")).not.toBeInTheDocument();
  });

  it("shows API error visibly when Add fails", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusinessNy);
    vi.mocked(adminApi.createServiceSlotCapacityOverride).mockRejectedValue(
      new ApiClientError(409, "SLOT_CAPACITY_OVERRIDE_EXISTS", "Already exists."),
    );

    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 1 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(adminApi.getBusiness).toHaveBeenCalled();
    });

    fillOverrideForm("2026-07-13", "09:00");
    await user.click(screen.getByTestId("admin-service-slot-capacity-add"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-service-slot-capacity-error")).toHaveTextContent(
        "Already exists.",
      );
    });
  });

  it("requires date and time before Add", async () => {
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

    await user.click(screen.getByTestId("admin-service-slot-capacity-add"));
    expect(screen.getByTestId("admin-service-slot-capacity-error")).toHaveTextContent(
      "Date and time are required.",
    );
    expect(adminApi.createServiceSlotCapacityOverride).not.toHaveBeenCalled();
  });
});
