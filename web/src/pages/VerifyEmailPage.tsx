import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/api/authApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import { getEmailVerificationErrorMessage } from "@/utils/errors";

type VerifyState = "missing" | "loading" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<VerifyState>(token ? "loading" : "missing");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;

    async function runVerification() {
      setState("loading");
      setErrorMessage(null);
      try {
        const result = await verifyEmail(token);
        if (cancelled) {
          return;
        }
        setVerifiedEmail(result.email);
        setState("success");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setErrorMessage(getEmailVerificationErrorMessage(error));
        setState("error");
      }
    }

    void runVerification();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "missing") {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Verify email</h1>
        <ErrorState
          title="Verification link is missing"
          message="Verification link is missing."
        />
        <p className="text-sm text-slate-600">
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Go to login
          </Link>
          {" · "}
          <Link to="/check-email" className="font-medium text-brand-700 hover:underline">
            Check email help
          </Link>
        </p>
      </AuthPageShell>
    );
  }

  if (state === "loading") {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Verify email</h1>
        <p className="text-sm text-slate-600">Verifying your email…</p>
      </AuthPageShell>
    );
  }

  if (state === "success") {
    return (
      <AuthPageShell className="space-y-4">
        <h1 className="text-2xl font-bold">Verify email</h1>
        <p className="text-sm text-slate-700">Email verified successfully.</p>
        {verifiedEmail ? (
          <p className="text-sm text-slate-600">
            Verified address: <span className="font-medium">{verifiedEmail}</span>
          </p>
        ) : null}
        <Link to="/login" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to login
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell className="space-y-4">
      <h1 className="text-2xl font-bold">Verify email</h1>
      <ErrorState
        title="Verification failed"
        message={errorMessage ?? "Verification link is invalid or expired."}
      />
      <p className="text-sm text-slate-600">
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Go to login
        </Link>
        {" · "}
        <Link to="/check-email" className="font-medium text-brand-700 hover:underline">
          Resend verification email
        </Link>
      </p>
    </AuthPageShell>
  );
}
