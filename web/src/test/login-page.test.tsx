import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as authApi from "@/api/authApi";
import { LoginPage } from "@/pages/LoginPage";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    login: vi.fn(),
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("F. shows friendly verification-required message when API returns EMAIL_VERIFICATION_REQUIRED", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Please verify your email before logging in.",
      ),
    );
    const user = userEvent.setup();

    renderRoute(<LoginPage />, { route: "/login", path: "/login" });

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Please verify your email before logging in."),
    ).toBeInTheDocument();
  });

  it("G. includes link to /check-email when verification required", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Please verify your email before logging in.",
      ),
    );
    const user = userEvent.setup();

    renderRoute(<LoginPage />, { route: "/login", path: "/login" });

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /go to check email/i })).toHaveAttribute(
        "href",
        "/check-email",
      );
    });
  });
});
