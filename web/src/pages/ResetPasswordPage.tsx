import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/api/authApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import { getPasswordResetErrorMessage } from "@/utils/errors";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setSubmitError(getPasswordResetErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <ErrorState
          title="Reset link is missing"
          message="Password reset link is missing."
        />
        <p className="text-sm text-slate-600">
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Go to login
          </Link>
          {" · "}
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Request a new reset link
          </Link>
        </p>
      </AuthPageShell>
    );
  }

  if (success) {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-sm text-slate-700">Password reset successfully.</p>
        <Link to="/login" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to login
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a new password for your account.</p>
      </div>
      {submitError ? (
        <>
          <ErrorState title="Reset failed" message={submitError} />
          <p className="text-center text-sm text-slate-600">
            <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
              Request a new reset link
            </Link>
          </p>
        </>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
          {fieldErrors.password ? (
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
          ) : null}
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
