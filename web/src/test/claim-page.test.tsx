import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as meApi from "@/api/meApi";
import { ClaimGuestPage } from "@/pages/ClaimGuestPage";
import { useAuth } from "@/hooks/useAuth";
import { mockAuthenticatedAuth, mockUnauthenticatedAuth, renderRoute } from "@/test/test-utils";
import { mockClientUser, mockMyBookingDetail } from "@/test/mock-fixtures";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/meApi");

describe("ClaimGuestPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. unauthenticated /me/claim shows login prompt", () => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    expect(
      screen.getByRole("heading", { name: /claim a booking or request/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
  });

  it("B. authenticated /me/claim renders form", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    expect(screen.getByLabelText(/^reference$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim booking/i })).toBeInTheDocument();
  });

  it("C. missing reference shows validation", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    const user = userEvent.setup();

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    await user.type(screen.getByLabelText(/^email$/i), "guest@example.com");
    await user.click(screen.getByRole("button", { name: /claim booking/i }));

    expect(await screen.findByText("Reference is required.")).toBeInTheDocument();
    expect(meApi.claimGuestBooking).not.toHaveBeenCalled();
  });

  it("D. missing email and phone shows validation", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    const user = userEvent.setup();

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    await user.type(screen.getByLabelText(/^reference$/i), "BKG-2026-0002");
    await user.click(screen.getByRole("button", { name: /claim booking/i }));

    expect(
      await screen.findByText("Enter the email or phone you used as a guest."),
    ).toBeInTheDocument();
    expect(meApi.claimGuestBooking).not.toHaveBeenCalled();
  });

  it("E. successful booking claim shows success and link to /me/bookings", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.claimGuestBooking).mockResolvedValue({
      booking: mockMyBookingDetail,
    });
    const user = userEvent.setup();

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    await user.type(screen.getByLabelText(/^reference$/i), mockMyBookingDetail.reference);
    await user.type(screen.getByLabelText(/^email$/i), "john.demo@example.com");
    await user.click(screen.getByRole("button", { name: /claim booking/i }));

    expect(await screen.findByText("Claimed successfully")).toBeInTheDocument();
    expect(screen.getByText(mockMyBookingDetail.reference)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to my bookings/i })).toHaveAttribute(
      "href",
      "/me/bookings",
    );
  });

  it("F. failed claim shows generic error", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(meApi.claimGuestBooking).mockRejectedValue(
      new ApiClientError(
        404,
        "CLAIM_NOT_FOUND_OR_MISMATCH",
        "Claim target not found or contact does not match.",
      ),
    );
    const user = userEvent.setup();

    renderRoute(<ClaimGuestPage />, {
      route: "/me/claim",
      path: "/me/claim",
    });

    await user.type(screen.getByLabelText(/^reference$/i), "BKG-2026-9999");
    await user.type(screen.getByLabelText(/^email$/i), "wrong@example.com");
    await user.click(screen.getByRole("button", { name: /claim booking/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "We could not find a matching guest item. Check the reference and contact.",
        ),
      ).toBeInTheDocument();
    });
  });
});
