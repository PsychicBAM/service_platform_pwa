import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as authApi from "@/api/authApi";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    login: vi.fn(),
  };
});

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. /forgot-password renders email form", () => {
    renderRoute(<ForgotPasswordPage />, {
      route: "/forgot-password",
      path: "/forgot-password",
    });

    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("B. /forgot-password validates invalid email", async () => {
    const user = userEvent.setup();
    renderRoute(<ForgotPasswordPage />, {
      route: "/forgot-password",
      path: "/forgot-password",
    });

    await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(authApi.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("C. successful request shows safe success message", async () => {
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue({ sent: true });
    const user = userEvent.setup();

    renderRoute(<ForgotPasswordPage />, {
      route: "/forgot-password",
      path: "/forgot-password",
    });

    await user.type(screen.getByLabelText(/^email$/i), "owner@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(
      await screen.findByText(
        "If an account exists for this email, we sent a password reset link.",
      ),
    ).toBeInTheDocument();
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith("owner@example.com");
  });
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("D. /reset-password without token shows missing token message", () => {
    renderRoute(<ResetPasswordPage />, {
      route: "/reset-password",
      path: "/reset-password",
    });

    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByText("Password reset link is missing.")).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("E. /reset-password validates password mismatch", async () => {
    const user = userEvent.setup();
    renderRoute(<ResetPasswordPage />, {
      route: "/reset-password?token=valid-token",
      path: "/reset-password",
    });

    await user.type(screen.getByLabelText(/new password/i), "NewPass123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Different123!");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("F. successful reset shows login link", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({ reset: true });
    const user = userEvent.setup();

    renderRoute(<ResetPasswordPage />, {
      route: "/reset-password?token=valid-token",
      path: "/reset-password",
    });

    await user.type(screen.getByLabelText(/new password/i), "NewPass123!");
    await user.type(screen.getByLabelText(/confirm password/i), "NewPass123!");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Password reset successfully.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(authApi.resetPassword).toHaveBeenCalledWith("valid-token", "NewPass123!");
  });

  it("G. invalid/expired token shows friendly error", async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      new ApiClientError(
        400,
        "PASSWORD_RESET_TOKEN_INVALID",
        "Password reset link is invalid or expired.",
      ),
    );
    const user = userEvent.setup();

    renderRoute(<ResetPasswordPage />, {
      route: "/reset-password?token=bad-token",
      path: "/reset-password",
    });

    await user.type(screen.getByLabelText(/new password/i), "NewPass123!");
    await user.type(screen.getByLabelText(/confirm password/i), "NewPass123!");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText("Password reset link is invalid or expired."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new reset link/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});

describe("LoginPage forgot password link", () => {
  it("H. login page has forgot password link", () => {
    renderRoute(<LoginPage />, { route: "/login", path: "/login" });

    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
