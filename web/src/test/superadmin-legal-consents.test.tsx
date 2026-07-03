import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { SuperadminLegalConsentsPage } from "@/pages/superadmin/SuperadminLegalConsentsPage";
import { useAuth } from "@/hooks/useAuth";
import * as superadminApi from "@/api/superadminApi";
import { ApiClientError } from "@/api/client";
import {
  BUSINESS_ID,
  mockSuperadminLegalConsentRecords,
  mockSuperadminUser,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/superadminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/superadminApi")>();
  return {
    ...actual,
    getSuperadminLegalConsents: vi.fn(),
  };
});

describe("SuperadminLegalConsentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockSuperadminUser));
  });

  it("A. renders title and audit notice", async () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue(
      mockSuperadminLegalConsentRecords,
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    expect(
      await screen.findByRole("heading", { name: "Platform legal consent records" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/audit summary only\. legal text is still pending final review\./i),
    ).toBeInTheDocument();
  });

  it("B. shows loading state", () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockReturnValue(new Promise(() => {}));

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    expect(screen.getByText("Loading consent records…")).toBeInTheDocument();
  });

  it("C. shows empty state", async () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 25, total: 0 },
    });

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    expect(await screen.findByText("No consent records match this filter")).toBeInTheDocument();
  });

  it("D. table renders data-minimized fields", async () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue(
      mockSuperadminLegalConsentRecords,
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    expect(await screen.findByText("booking-id-001")).toBeInTheDocument();
    expect(screen.getAllByText("Demo Service Business").length).toBeGreaterThan(0);
    expect(screen.getAllByText("draft-placeholder-v1").length).toBeGreaterThan(0);
  });

  it("E. table does not render sensitive fields from mocked response", async () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue({
      data: [
        {
          ...mockSuperadminLegalConsentRecords.data[0],
          form_data: { brief: "hidden" },
          password_hash: "hidden-hash",
          access_token: "hidden-token",
        } as typeof mockSuperadminLegalConsentRecords.data[0] & {
          form_data?: Record<string, unknown>;
          password_hash?: string;
          access_token?: string;
        },
      ],
      meta: { page: 1, limit: 25, total: 1 },
    });

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    await screen.findByText("draft-placeholder-v1");
    expect(screen.queryByText("hidden-hash")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-token")).not.toBeInTheDocument();
  });

  it("F. filter by business_id triggers API call with business_id", async () => {
    const user = userEvent.setup();
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue(
      mockSuperadminLegalConsentRecords,
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });
    await screen.findByText("booking-id-001");

    await user.type(screen.getByLabelText("Business ID"), BUSINESS_ID);

    await waitFor(() => {
      expect(superadminApi.getSuperadminLegalConsents).toHaveBeenCalledWith({
        business_id: BUSINESS_ID,
        source: undefined,
        entity_type: undefined,
        page: 1,
        limit: 25,
      });
    });
  });

  it("G. filter by source triggers API call with source", async () => {
    const user = userEvent.setup();
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue(
      mockSuperadminLegalConsentRecords,
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });
    await screen.findByText("booking-id-001");

    await user.selectOptions(screen.getByLabelText("Source"), "public_order");

    await waitFor(() => {
      expect(superadminApi.getSuperadminLegalConsents).toHaveBeenCalledWith({
        business_id: undefined,
        source: "public_order",
        entity_type: undefined,
        page: 1,
        limit: 25,
      });
    });
  });

  it("H. filter by entity_type triggers API call with entity_type", async () => {
    const user = userEvent.setup();
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue(
      mockSuperadminLegalConsentRecords,
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });
    await screen.findByText("booking-id-001");

    await user.selectOptions(screen.getByLabelText("Entity type"), "order");

    await waitFor(() => {
      expect(superadminApi.getSuperadminLegalConsents).toHaveBeenCalledWith({
        business_id: undefined,
        source: undefined,
        entity_type: "order",
        page: 1,
        limit: 25,
      });
    });
  });

  it("I. pagination next triggers API call with page 2", async () => {
    const user = userEvent.setup();
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockResolvedValue({
      ...mockSuperadminLegalConsentRecords,
      meta: { page: 1, limit: 25, total: 30 },
    });

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });
    await screen.findByText("booking-id-001");

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(superadminApi.getSuperadminLegalConsents).toHaveBeenCalledWith({
        business_id: undefined,
        source: undefined,
        entity_type: undefined,
        page: 2,
        limit: 25,
      });
    });
  });

  it("J. API error shows safe error state", async () => {
    vi.mocked(superadminApi.getSuperadminLegalConsents).mockRejectedValue(
      new ApiClientError(403, "FORBIDDEN", "Superadmin access required."),
    );

    renderRoute(<SuperadminLegalConsentsPage />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/legal-consents",
    });

    expect(await screen.findByText("Could not load consent records")).toBeInTheDocument();
    expect(screen.getByText("Superadmin access required.")).toBeInTheDocument();
  });

  it("K. superadmin navigation includes legal consent link", () => {
    renderRoute(<SuperadminLayout />, {
      route: "/superadmin/legal-consents",
      path: "/superadmin/*",
    });

    expect(screen.getByRole("link", { name: "Legal consent" })).toBeInTheDocument();
  });
});
