import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { resendEmailVerification } from "@/api/authApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { getEmailVerificationErrorMessage } from "@/utils/errors";

export function CheckEmailPage() {
  const { isAuthenticated, isLoadingUser, user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result = await resendEmailVerification();
      if (result.already_verified) {
        setNotice("Your email is already verified.");
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        return;
      }
      if (result.sent) {
        setNotice("Verification email sent.");
        return;
      }
      setNotice(result.message ?? "Verification email could not be sent. Try again later.");
    } catch (err) {
      setError(getEmailVerificationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-slate-600">
          Sign in to resend a verification email or confirm your account status.
        </p>
        <Link to="/login" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to login
        </Link>
      </AuthPageShell>
    );
  }

  if (isLoadingUser) {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-slate-600">Loading your account…</p>
      </AuthPageShell>
    );
  }

  if (user?.email_verified) {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-slate-700">Your email is already verified.</p>
        <Link to="/me/bookings" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to my bookings
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell className="space-y-4">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-sm text-slate-600">
        Check your email and click the verification link.
      </p>
      {error ? <ErrorState title="Could not resend" message={error} /> : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Sending…" : "Resend verification email"}
      </button>
    </AuthPageShell>
  );
}
