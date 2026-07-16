import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { registerClient } from "@/api/authApi";
import { claimGuestBooking, claimGuestOrder } from "@/api/meApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import { getRegisterErrorMessage } from "@/utils/errors";

const MIN_PASSWORD_LENGTH = 8;

const AUTO_CLAIM_FAILED_MESSAGE =
  "Your account was created. We could not link this item automatically. Please confirm the guest email or phone used when booking.";

export function ClientRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference")?.trim() || "";
  const claimType = searchParams.get("type") === "order" ? "order" : "booking";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function buildClaimPath(extra?: Record<string, string>): string {
    const params = new URLSearchParams();
    params.set("type", claimType);
    if (reference) {
      params.set("reference", reference);
    }
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        params.set(key, value);
      }
    }
    return `/me/claim?${params.toString()}`;
  }

  async function tryAutoClaim(claimEmail: string): Promise<boolean> {
    if (!reference) {
      return false;
    }
    const payload = { reference, email: claimEmail };
    if (claimType === "booking") {
      await claimGuestBooking(payload);
    } else {
      await claimGuestOrder(payload);
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const errors: Record<string, string> = {};
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      errors.email = "Email is required.";
    }
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await registerClient({
        email: normalizedEmail,
        password,
        full_name: fullName.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      if (reference) {
        try {
          await tryAutoClaim(normalizedEmail);
          navigate(claimType === "booking" ? "/me/bookings" : "/me/orders");
          return;
        } catch {
          navigate(buildClaimPath({ autoClaimFailed: "1" }), {
            state: { message: AUTO_CLAIM_FAILED_MESSAGE },
          });
          return;
        }
      }

      navigate(buildClaimPath());
    } catch (err) {
      setSubmitError(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create your client account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track bookings, requests, messages, and reviews in one place.
        </p>
      </div>

      <div
        className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"
        data-testid="client-register-info"
      >
        <p className="font-medium">Use the same email you used when booking or sending a request.</p>
        <p className="mt-1">
          After creating your account, we can link your booking or request using its reference.
        </p>
        {reference ? (
          <p className="mt-2 break-all font-mono text-xs font-semibold">
            Reference ready to claim: {reference}
          </p>
        ) : null}
      </div>

      {submitError ? <ErrorState title="Could not create account" message={submitError} /> : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="client-register-form">
        <label htmlFor="client-register-email" className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            id="client-register-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.email ? <p className="text-xs text-red-600">{fieldErrors.email}</p> : null}
        </label>

        <label htmlFor="client-register-name" className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Name (optional)</span>
          <input
            id="client-register-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="space-y-1">
          <label htmlFor="client-register-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="client-register-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
          {fieldErrors.password ? (
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="client-register-confirm" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="client-register-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create client account"}
        </button>
      </form>

      <div className="space-y-2 text-center text-sm text-slate-600">
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
        <p>
          Own a business?{" "}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Register your business
          </Link>
        </p>
        <p>
          Booked as a guest?{" "}
          <Link to={buildClaimPath()} className="font-medium text-brand-700 hover:underline">
            Claim a booking or request
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
