import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as authApi from "@/api/authApi";
import { RegisterPage } from "@/pages/RegisterPage";
import { renderRoute } from "@/test/test-utils";

function getConsentCheckbox() {
  return screen.getByRole("checkbox", { name: /acknowledge the draft privacy policy/i });
}

async function acceptLegalConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getConsentCheckbox());
}

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    register: vi.fn(),
  };
});

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. register page renders fields", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/^Full name$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Business name$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Business slug$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("B. missing required fields show validation", async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(screen.getByText("Business name is required.")).toBeInTheDocument();
    expect(screen.getByText("Business slug is required.")).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("C. successful register calls API and navigates to /check-email", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@new.com",
        full_name: "New Owner",
        role: "business_admin",
      },
      business: { id: "biz-1", name: "New Biz", slug: "new-biz" },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
      },
    });

    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    await user.type(screen.getByLabelText(/full name/i), "New Owner");
    await user.type(screen.getByLabelText(/^email$/i), "owner@new.com");
    await user.type(screen.getByLabelText(/password/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/business name/i), "New Biz");
    await user.type(screen.getByLabelText(/business slug/i), "new-biz");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: "owner@new.com",
        password: "ChangeMe123!",
        full_name: "New Owner",
        selected_plan_intent: "free",
        legal_consent_accepted: true,
        business: {
          name: "New Biz",
          slug: "new-biz",
        },
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/check-email");
  });

  it("D. duplicate email/slug error shows friendly message", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiClientError(409, "EMAIL_ALREADY_EXISTS", "Email already exists"),
    );

    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    await user.type(screen.getByLabelText(/full name/i), "New Owner");
    await user.type(screen.getByLabelText(/^email$/i), "owner@example.com");
    await user.type(screen.getByLabelText(/password/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/business name/i), "Demo Biz");
    await user.type(screen.getByLabelText(/business slug/i), "demo-biz");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("This email is already registered.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("E. register page links to login", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("F. register page with business plan sends selected_plan_intent", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@new.com",
        full_name: "New Owner",
        role: "business_admin",
      },
      business: { id: "biz-1", name: "New Biz", slug: "new-biz" },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
      },
    });

    renderRoute(<RegisterPage />, { route: "/register?plan=business", path: "/register" });

    await user.type(screen.getByLabelText(/full name/i), "New Owner");
    await user.type(screen.getByLabelText(/^email$/i), "owner@new.com");
    await user.type(screen.getByLabelText(/password/i), "ChangeMe123!");
    await user.type(screen.getByLabelText(/business name/i), "New Biz");
    await user.type(screen.getByLabelText(/business slug/i), "new-biz");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ selected_plan_intent: "business", legal_consent_accepted: true }),
      );
    });
  });
});
