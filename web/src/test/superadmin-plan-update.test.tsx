import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuperadminBusinessDetailPanel } from "@/components/superadmin/SuperadminBusinessDetailPanel";
import * as superadminApi from "@/api/superadminApi";
import type { SuperadminBusinessDetail } from "@/types/api";
import { renderRoute } from "@/test/test-utils";

const businessId = "biz-plan-update-001";

const baseDetail: SuperadminBusinessDetail = {
  id: businessId,
  name: "Plan Test Business",
  slug: "plan-test-business",
  description: null,
  status: "active",
  operating_mode: "both",
  timezone: "UTC",
  contact_email: "owner@example.com",
  contact_phone: null,
  address: null,
  settings: {
    auto_confirm_bookings: false,
    cancellation_hours: 24,
    max_advance_booking_days: 60,
    min_advance_booking_hours: 2,
    allow_guest_checkout: true,
    slot_interval_minutes: 30,
    booking_buffer_minutes: 0,
    require_payment_default: false,
    notification_email_enabled: true,
  },
  selected_plan_intent: null,
  selected_plan_intent_source: null,
  selected_plan_intent_recorded_at: null,
  subscription: {
    plan: "business",
    status: "active",
    usage_bookings_count: 0,
    usage_orders_count: 0,
  },
  owner: {
    id: "owner-1",
    email: "owner@example.com",
    full_name: "Owner",
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/api/superadminApi", () => ({
  getSuperadminBusiness: vi.fn(),
  updateSuperadminBusiness: vi.fn(),
}));

describe("superadmin manual plan update UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superadminApi.getSuperadminBusiness).mockResolvedValue(baseDetail);
  });

  it("A. selecting Pro calls update API with plan pro", async () => {
    const user = userEvent.setup();
    const updated: SuperadminBusinessDetail = {
      ...baseDetail,
      subscription: { ...baseDetail.subscription!, plan: "pro" },
    };
    vi.mocked(superadminApi.updateSuperadminBusiness).mockResolvedValue(updated);

    const onSuccess = vi.fn();
    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={businessId}
        onClose={() => undefined}
        onSuccess={onSuccess}
        onError={() => undefined}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    await screen.findByLabelText(/set active plan manually/i);
    await user.selectOptions(screen.getByLabelText(/set active plan manually/i), "pro");
    await user.click(screen.getByRole("button", { name: /save manual plan change/i }));

    await waitFor(() => {
      expect(superadminApi.updateSuperadminBusiness).toHaveBeenCalledWith(businessId, {
        status: "active",
        plan: "pro",
      });
    });
  });

  it("B. success callback runs only after resolved API success", async () => {
    const user = userEvent.setup();
    const updated: SuperadminBusinessDetail = {
      ...baseDetail,
      subscription: { ...baseDetail.subscription!, plan: "pro" },
    };
    vi.mocked(superadminApi.updateSuperadminBusiness).mockResolvedValue(updated);

    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={businessId}
        onClose={() => undefined}
        onSuccess={onSuccess}
        onError={onError}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    await screen.findByLabelText(/set active plan manually/i);
    await user.selectOptions(screen.getByLabelText(/set active plan manually/i), "pro");
    await user.click(screen.getByRole("button", { name: /save manual plan change/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("Manual plan change saved.");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("C. UI displays Pro in subscription section after successful update", async () => {
    const user = userEvent.setup();
    const updated: SuperadminBusinessDetail = {
      ...baseDetail,
      subscription: { ...baseDetail.subscription!, plan: "pro" },
    };
    vi.mocked(superadminApi.updateSuperadminBusiness).mockResolvedValue(updated);

    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={businessId}
        onClose={() => undefined}
        onSuccess={() => undefined}
        onError={() => undefined}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    await screen.findByLabelText(/set active plan manually/i);
    await user.selectOptions(screen.getByLabelText(/set active plan manually/i), "pro");
    await user.click(screen.getByRole("button", { name: /save manual plan change/i }));

    await waitFor(() => {
      const activePlanRow = screen.getByText("Active plan").closest("div");
      expect(activePlanRow).toHaveTextContent("Pro");
    });
  });

  it("D. refetched detail shows Pro from API response", async () => {
    const user = userEvent.setup();
    const updated: SuperadminBusinessDetail = {
      ...baseDetail,
      subscription: { ...baseDetail.subscription!, plan: "pro" },
    };
    vi.mocked(superadminApi.updateSuperadminBusiness).mockResolvedValue(updated);
    vi.mocked(superadminApi.getSuperadminBusiness)
      .mockResolvedValueOnce(baseDetail)
      .mockResolvedValue(updated);

    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={businessId}
        onClose={() => undefined}
        onSuccess={() => undefined}
        onError={() => undefined}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    await screen.findByLabelText(/set active plan manually/i);
    await user.selectOptions(screen.getByLabelText(/set active plan manually/i), "pro");
    await user.click(screen.getByRole("button", { name: /save manual plan change/i }));

    await waitFor(() => {
      const activePlanRow = screen.getByText("Active plan").closest("div");
      expect(activePlanRow).toHaveTextContent("Pro");
    });
  });

  it("E. failed API shows error and does not call success callback", async () => {
    const user = userEvent.setup();
    vi.mocked(superadminApi.updateSuperadminBusiness).mockRejectedValue(
      new Error("Update failed"),
    );

    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={businessId}
        onClose={() => undefined}
        onSuccess={onSuccess}
        onError={onError}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    await screen.findByLabelText(/set active plan manually/i);
    await user.selectOptions(screen.getByLabelText(/set active plan manually/i), "pro");
    await user.click(screen.getByRole("button", { name: /save manual plan change/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
