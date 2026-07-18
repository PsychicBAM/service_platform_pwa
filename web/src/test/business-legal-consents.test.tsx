import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLegalConsentsPage } from "@/pages/admin/AdminLegalConsentsPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as adminApi from "@/api/adminApi";
import { ApiClientError } from "@/api/client";
import {
  BUSINESS_ID,
  mockLegalConsentRecords,
  mockOwnerUser,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    getBusinessLegalConsents: vi.fn(),
  };
});

function renderAdminLegalConsentsPage(page: ReactElement = <AdminLegalConsentsPage />) {
  return renderRoute(
    <AdminBusinessProvider businesses={mockOwnerUser.businesses}>{page}</AdminBusinessProvider>,
    { route: "/admin/legal-consents", path: "/admin/legal-consents" },
  );
}

async function openConsentRecordsTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("admin-legal-consent-tab-records"));
}

describe("AdminLegalConsentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
  });

  it("A. renders title and audit notice", async () => {
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue(mockLegalConsentRecords);

    renderAdminLegalConsentsPage();

    expect(await screen.findByRole("heading", { name: "Legal consent" })).toBeInTheDocument();
    expect(screen.getByTestId("admin-legal-consent-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-legal-consent-tab-forms")).toBeInTheDocument();
    expect(screen.getByTestId("admin-legal-consent-tab-records")).toBeInTheDocument();
    expect(
      screen.getByText(/audit summary only\. legal text is still pending final review\./i),
    ).toBeInTheDocument();
  });

  it("B. shows loading state", () => {
    vi.mocked(adminApi.getBusinessLegalConsents).mockReturnValue(new Promise(() => {}));

    renderAdminLegalConsentsPage();

    expect(screen.getByText("Loading consent records…")).toBeInTheDocument();
  });

  it("C. shows empty state", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 25, total: 0 },
    });

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);

    expect(await screen.findByText("No consent records match this filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-consent-records-table")).toBeInTheDocument();
  });

  it("D. table renders data-minimized fields", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue(mockLegalConsentRecords);

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);

    expect(await screen.findByText("booking-id-001")).toBeInTheDocument();
    expect(screen.getAllByText("Public booking").length).toBeGreaterThan(0);
    expect(screen.getAllByText("draft-placeholder-v1").length).toBeGreaterThan(0);
    expect(screen.getByTestId("admin-consent-records-table")).toBeInTheDocument();
    expect(screen.getAllByTestId("admin-consent-record-row").length).toBeGreaterThan(0);
  });

  it("E. table does not render sensitive fields from mocked response", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue({
      data: [
        {
          ...mockLegalConsentRecords.data[0],
          form_data: { brief: "hidden" },
          password_hash: "hidden-hash",
          access_token: "hidden-token",
        } as typeof mockLegalConsentRecords.data[0] & {
          form_data?: Record<string, unknown>;
          password_hash?: string;
          access_token?: string;
        },
      ],
      meta: { page: 1, limit: 25, total: 1 },
    });

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);

    await screen.findByText("draft-placeholder-v1");
    expect(screen.queryByText("hidden-hash")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-token")).not.toBeInTheDocument();
    expect(screen.queryByText(/hidden/i)).not.toBeInTheDocument();
  });

  it("F. filter by source triggers API call with source", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue(mockLegalConsentRecords);

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);
    await screen.findByText("booking-id-001");

    await user.selectOptions(screen.getByLabelText("Source"), "public_booking");

    await waitFor(() => {
      expect(adminApi.getBusinessLegalConsents).toHaveBeenCalledWith(BUSINESS_ID, {
        source: "public_booking",
        entity_type: undefined,
        page: 1,
        limit: 25,
      });
    });
  });

  it("G. filter by entity_type triggers API call with entity_type", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue(mockLegalConsentRecords);

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);
    await screen.findByText("booking-id-001");

    await user.selectOptions(screen.getByLabelText("Entity type"), "order");

    await waitFor(() => {
      expect(adminApi.getBusinessLegalConsents).toHaveBeenCalledWith(BUSINESS_ID, {
        source: undefined,
        entity_type: "order",
        page: 1,
        limit: 25,
      });
    });
  });

  it("H. pagination next triggers API call with page 2", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getBusinessLegalConsents).mockResolvedValue({
      ...mockLegalConsentRecords,
      meta: { page: 1, limit: 25, total: 30 },
    });

    renderAdminLegalConsentsPage();
    await screen.findByTestId("admin-legal-consent-tab-records");
    await openConsentRecordsTab(user);
    await screen.findByText("booking-id-001");

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(adminApi.getBusinessLegalConsents).toHaveBeenCalledWith(BUSINESS_ID, {
        source: undefined,
        entity_type: undefined,
        page: 2,
        limit: 25,
      });
    });
  });

  it("I. API error shows safe error state", async () => {
    vi.mocked(adminApi.getBusinessLegalConsents).mockRejectedValue(
      new ApiClientError(403, "FORBIDDEN", "You do not have access to this business."),
    );

    renderAdminLegalConsentsPage();

    expect(await screen.findByText("Could not load consent records")).toBeInTheDocument();
    expect(screen.getByText("This item was not found.")).toBeInTheDocument();
  });

  it("J. admin navigation includes legal consent link", () => {
    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminLayout />
      </AdminBusinessProvider>,
      { route: "/admin/legal-consents", path: "/admin/*" },
    );

    expect(screen.getAllByRole("link", { name: "Legal consent" }).length).toBeGreaterThan(0);
  });
});
