import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import * as adminApi from "@/api/adminApi";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { mockAdminBusiness, mockAdminServices, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    getBusiness: vi.fn(),
    listServiceSlotCapacityOverrides: vi.fn().mockResolvedValue({ data: [] }),
  };
});

describe("AdminServiceForm capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getBusiness).mockResolvedValue(mockAdminBusiness);
  });

  it("shows default capacity field for booking services in create mode with default 1", () => {
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-capacity")).toHaveValue(1);
    expect(screen.getByLabelText("Default capacity per time slot")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Applies to every normal time slot. Use 1 for individual bookings. Add special group time slots below for one-off group sessions.",
      ),
    ).toBeInTheDocument();
  });

  it("hides capacity field for request services in create mode", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();

    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Type"), "order");
    expect(screen.queryByTestId("admin-service-capacity")).not.toBeInTheDocument();
  });

  it("shows capacity field when editing a booking service", () => {
    renderRoute(
      <AdminServiceForm
        mode="edit"
        businessId="biz-1"
        initial={{ ...mockAdminServices[0], capacity: 5 }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-capacity")).toHaveValue(5);
    expect(screen.getByLabelText("Default capacity per time slot")).toBeInTheDocument();
  });

  it("does not show capacity field when editing a request service", () => {
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

    expect(screen.queryByTestId("admin-service-capacity")).not.toBeInTheDocument();
  });
});
