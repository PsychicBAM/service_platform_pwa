import { Outlet } from "react-router-dom";
import { AuthPrompt } from "@/components/AuthPrompt";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/api/client";
import { getMeErrorMessage } from "@/utils/errors";

export function AdminGuard() {
  const { isAuthenticated, isLoadingUser, user, meQuery } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold">Admin</h1>
        <AuthPrompt description="Sign in with a business account to access admin." />
      </section>
    );
  }

  if (isLoadingUser) {
    return <LoadingState message="Loading account…" />;
  }

  if (meQuery.error) {
    const isForbidden =
      meQuery.error instanceof ApiClientError && meQuery.error.status === 403;
    return (
      <ErrorState
        title={isForbidden ? "You do not have access." : "Could not load account"}
        message={getMeErrorMessage(meQuery.error, "Unable to verify access")}
      />
    );
  }

  const businesses = user?.businesses ?? [];
  if (businesses.length === 0) {
    return (
      <section className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold">Admin</h1>
        <EmptyState
          title="No business access"
          description="Your account is not linked to any business. Admin pages are only available to business members."
        />
      </section>
    );
  }

  return (
    <AdminBusinessProvider businesses={businesses}>
      <Outlet />
    </AdminBusinessProvider>
  );
}
