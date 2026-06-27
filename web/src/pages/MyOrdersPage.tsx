import { Link } from "react-router-dom";
import { isAuthenticated } from "@/hooks/useAuthToken";
import { EmptyState } from "@/components/EmptyState";

export function MyOrdersPage() {
  if (!isAuthenticated()) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-bold">My orders</h1>
        <EmptyState
          title="Sign in required"
          description="Log in to view orders linked to your account."
        />
        <Link
          to="/login"
          className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
        >
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      <EmptyState
        title="Coming soon"
        description="GET /me/orders will be wired in a future slice."
      />
    </section>
  );
}
