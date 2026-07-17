import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { SuperadminGuard } from "@/components/SuperadminGuard";
import { SuperadminBusinessDetailPanel } from "@/components/superadmin/SuperadminBusinessDetailPanel";
import { SuperadminBusinessesPage } from "@/pages/superadmin/SuperadminBusinessesPage";
import { SuperadminAuditLogsPage } from "@/pages/superadmin/SuperadminAuditLogsPage";
import { useAuth } from "@/hooks/useAuth";
import * as superadminApi from "@/api/superadminApi";
import type { SuperadminBusinessDetail, SuperadminBusinessListItem } from "@/types/api";
import {
  emptyListMeta,
  mockAuditLog,
  mockOwnerUser,
  mockSuperadminBusiness,
  mockSuperadminUser,
} from "@/test/mock-fixtures";
import {
  mockAuthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";

const mockBusinessWithIntent: SuperadminBusinessListItem = {
  ...mockSuperadminBusiness,
  id: "biz-intent-001",
  selected_plan_intent: "business",
};

const mockBusinessDetailWithIntent: SuperadminBusinessDetail = {
  id: mockBusinessWithIntent.id,
  name: mockBusinessWithIntent.name,
  slug: mockBusinessWithIntent.slug,
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
    auto_review_request_enabled: false,
    auto_review_request_delay_minutes: 1440,
  },
  selected_plan_intent: "business",
  selected_plan_intent_source: "registration",
  selected_plan_intent_recorded_at: "2026-06-01T10:00:00Z",
  subscription: {
    plan: "free",
    status: "active",
    usage_bookings_count: 2,
    usage_orders_count: 1,
  },
  owner: {
    id: "owner-1",
    email: "owner@example.com",
    full_name: "Demo Owner",
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/hooks/useAuth");
vi.mock("@/api/superadminApi", () => ({
  listSuperadminBusinesses: vi.fn(),
  listAuditLogs: vi.fn(),
  getSuperadminBusiness: vi.fn(),
  updateSuperadminBusiness: vi.fn(),
}));

describe("superadmin pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("N. owner user cannot access /superadmin", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));

    renderRoute(<SuperadminGuard />, { route: "/superadmin", path: "/superadmin/*" });

    expect(screen.getByText("Superadmin access required")).toBeInTheDocument();
  });

  it("O. superadmin user can render businesses with mocked business", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockSuperadminUser));
    vi.mocked(superadminApi.listSuperadminBusinesses).mockResolvedValue({
      data: [mockSuperadminBusiness],
      meta: { ...emptyListMeta, total: 1 },
    });

    renderRoute(<SuperadminBusinessesPage />, {
      route: "/superadmin/businesses",
      path: "/superadmin/businesses",
    });

    expect(await screen.findByRole("heading", { name: "Businesses" })).toBeInTheDocument();
    expect(await screen.findByText(mockSuperadminBusiness.name)).toBeInTheDocument();
    expect(screen.getByText(mockSuperadminBusiness.slug)).toBeInTheDocument();
  });

  it("P. audit logs page renders mocked log", async () => {
    vi.mocked(superadminApi.listAuditLogs).mockResolvedValue({
      data: [mockAuditLog],
      meta: { ...emptyListMeta, total: 1 },
    });

    renderRoute(<SuperadminAuditLogsPage />, {
      route: "/superadmin/audit-logs",
      path: "/superadmin/audit-logs",
    });

    expect(await screen.findByRole("heading", { name: "Audit logs" })).toBeInTheDocument();
    expect(await screen.findByText(mockAuditLog.action)).toBeInTheDocument();
  });

  it("Q. business list shows plan request badge when intent differs", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockSuperadminUser));
    vi.mocked(superadminApi.listSuperadminBusinesses).mockResolvedValue({
      data: [mockBusinessWithIntent],
      meta: { ...emptyListMeta, total: 1 },
    });

    renderRoute(<SuperadminBusinessesPage />, {
      route: "/superadmin/businesses",
      path: "/superadmin/businesses",
    });

    expect(await screen.findByText(/plan request: business/i)).toBeInTheDocument();
    expect(screen.getByText(/active plan:/i)).toBeInTheDocument();
  });

  it("R. detail panel shows active plan, signup intent, and manual billing note", async () => {
    vi.mocked(superadminApi.getSuperadminBusiness).mockResolvedValue(
      mockBusinessDetailWithIntent,
    );

    renderRoute(
      <SuperadminBusinessDetailPanel
        businessId={mockBusinessDetailWithIntent.id}
        onClose={() => undefined}
        onSuccess={() => undefined}
        onError={() => undefined}
      />,
      { route: "/superadmin/businesses", path: "/superadmin/businesses" },
    );

    expect(await screen.findByRole("heading", { name: "Subscription" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Signup plan intent" })).toBeInTheDocument();
    expect(screen.getByText(/stripe checkout is not connected yet/i)).toBeInTheDocument();
    expect(screen.getByText(/customer requested business during signup/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/set active plan manually/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save manual plan change/i })).toBeInTheDocument();
  });
});
