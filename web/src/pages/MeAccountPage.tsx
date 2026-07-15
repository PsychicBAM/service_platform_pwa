import { Link } from "react-router-dom";
import { AuthPrompt } from "@/components/AuthPrompt";
import { useAuth } from "@/hooks/useAuth";

const QUICK_LINKS = [
  {
    to: "/me/bookings",
    title: "My bookings",
    description: "View upcoming and past appointments.",
    testId: "me-link-bookings",
  },
  {
    to: "/me/orders",
    title: "My requests",
    description: "Track service requests and messages.",
    testId: "me-link-orders",
  },
  {
    to: "/me/claim",
    title: "Claim guest booking",
    description: "Link a guest booking or request to your account.",
    testId: "me-link-claim",
  },
  {
    to: "/businesses",
    title: "Browse businesses",
    description: "Find a business to book or contact.",
    testId: "me-link-businesses",
  },
] as const;

export function MeAccountPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="space-y-4" data-testid="me-account-page">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Account</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Sign in to manage your bookings and service requests.
          </p>
        </div>
        <AuthPrompt description="Log in to open your client account." />
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="me-account-page">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Account</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Manage your bookings, requests, and account links.
        </p>
        {user?.email ? (
          <p className="mt-2 truncate text-sm text-slate-500" title={user.email}>
            {user.email}
          </p>
        ) : null}
      </div>

      <div
        className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
        data-testid="me-account-links"
      >
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className="flex min-h-[5.5rem] flex-col justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="text-base font-semibold text-slate-900">{item.title}</span>
            <span className="mt-1 text-sm text-slate-600">{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
