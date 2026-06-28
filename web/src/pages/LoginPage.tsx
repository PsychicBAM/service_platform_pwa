import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "@/api/authApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import { getLoginErrorMessage, isEmailVerificationRequiredError } from "@/utils/errors";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setVerificationRequired(false);
    setLoading(true);
    try {
      await login({ email, password });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/me/bookings");
    } catch (err) {
      setVerificationRequired(isEmailVerificationRequiredError(err));
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use demo owner credentials if you ran <code>seed_demo.py</code>.
        </p>
      </div>
      {error ? <ErrorState title="Login failed" message={error} /> : null}
      {verificationRequired ? (
        <p className="text-center text-sm text-slate-600">
          Need to verify?{" "}
          <Link to="/check-email" className="font-medium text-brand-700 hover:underline">
            Go to check email
          </Link>
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <p className="text-right text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Register
        </Link>
      </p>
    </AuthPageShell>
  );
}
