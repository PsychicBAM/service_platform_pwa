import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiClientError } from "@/api/client";
import * as authApi from "@/api/authApi";
import { CheckEmailPage } from "@/pages/CheckEmailPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  createTestQueryClient,
  mockAuthenticatedAuth,
  mockUnauthenticatedAuth,
  renderRoute,
} from "@/test/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { mockClientUser, mockUnverifiedClientUser } from "@/test/mock-fixtures";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    verifyEmail: vi.fn(),
    resendEmailVerification: vi.fn(),
  };
});

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. /verify-email without token shows missing token message", () => {
    renderRoute(<VerifyEmailPage />, {
      route: "/verify-email",
      path: "/verify-email",
    });

    expect(screen.getByRole("heading", { name: /verify email/i })).toBeInTheDocument();
    expect(screen.getByText("Verification link is missing.")).toBeInTheDocument();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });

  it("B. /verify-email with valid token shows success", async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      verified: true,
      email: "owner@example.com",
    });

    renderRoute(<VerifyEmailPage />, {
      route: "/verify-email?token=valid-token",
      path: "/verify-email",
    });

    expect(await screen.findByText("Email verified successfully.")).toBeInTheDocument();
    expect(screen.getByText(/owner@example.com/)).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledWith("valid-token");
  });

  it("C. /verify-email with invalid token shows generic error", async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(
      new ApiClientError(
        400,
        "EMAIL_VERIFICATION_TOKEN_INVALID",
        "Verification link is invalid or expired.",
      ),
    );

    renderRoute(<VerifyEmailPage />, {
      route: "/verify-email?token=bad-token",
      path: "/verify-email",
    });

    expect(
      await screen.findByText("Verification link is invalid or expired."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /resend verification email/i })).toHaveAttribute(
      "href",
      "/check-email",
    );
  });
});

describe("CheckEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("D. /check-email logged out shows login link", () => {
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());

    renderRoute(<CheckEmailPage />, {
      route: "/check-email",
      path: "/check-email",
    });

    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
  });

  it("E. /check-email logged in unverified shows resend button", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockUnverifiedClientUser));

    renderRoute(<CheckEmailPage />, {
      route: "/check-email",
      path: "/check-email",
    });

    expect(
      screen.getByText("Check your email and click the verification link."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("F. resend success shows confirmation", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockUnverifiedClientUser));
    vi.mocked(authApi.resendEmailVerification).mockResolvedValue({
      sent: true,
      already_verified: false,
    });
    const user = userEvent.setup();

    renderRoute(<CheckEmailPage />, {
      route: "/check-email",
      path: "/check-email",
    });

    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText("Verification email sent.")).toBeInTheDocument();
    expect(authApi.resendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it("G. verified user sees already verified message", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(<CheckEmailPage />, {
      route: "/check-email",
      path: "/check-email",
    });

    expect(screen.getByText("Your email is already verified.")).toBeInTheDocument();
  });
});

describe("Layout email verification banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("H. shows non-blocking verify email banner for unverified user", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockUnverifiedClientUser));

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/please verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to check email/i })).toHaveAttribute(
      "href",
      "/check-email",
    );
  });
});
