import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import { mockAdminServices, ORDER_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

describe("AdminServiceForm capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows capacity field for booking services in create mode with default 1", () => {
    renderRoute(
      <AdminServiceForm
        mode="create"
        businessId="biz-1"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-capacity")).toHaveValue(1);
    expect(screen.getByLabelText("Capacity per time slot")).toBeInTheDocument();
    expect(
      screen.getByText("How many clients can book the same time slot."),
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
