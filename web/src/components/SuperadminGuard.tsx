import { Link, Outlet } from "react-router-dom";
import { AuthPrompt } from "@/components/AuthPrompt";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { getSuperadminErrorMessage } from "@/utils/errors";

export function SuperadminGuard() {
  const { isAuthenticated, isLoadingUser, user, meQuery } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold">Superadmin</h1>
        <AuthPrompt description="Sign in with a superadmin account to continue." />
      </section>
    );
  }

  if (isLoadingUser) {
    return <LoadingState message="Loading account…" />;
  }

  if (meQuery.error) {
    return (
      <ErrorState
        title="Could not load account"
        message={getSuperadminErrorMessage(meQuery.error, "Unable to verify access")}
      />
    );
  }

  if (user?.role !== "superadmin") {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold">Superadmin</h1>
        <EmptyState
          title="Superadmin access required"
          description="Only superadmin accounts can access this area."
        />
        <Link to="/" className="inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          Back to app
        </Link>
      </section>
    );
  }

  return <Outlet />;
}
