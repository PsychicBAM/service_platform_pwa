import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyBookings, listMyOrders } from "@/api/meApi";
import { AuthPrompt } from "@/components/AuthPrompt";
import { useAuth } from "@/hooks/useAuth";

const QUICK_ACTIONS = [
  {
    to: "/me/bookings",
    title: "My bookings",
    description: "View upcoming and past appointments.",
    cta: "Open bookings",
    testId: "me-link-bookings",
    accent: "bg-sky-50 border-sky-200 hover:border-sky-300 hover:bg-sky-100/70",
    badge: "B",
    badgeClass: "bg-sky-600 text-white",
  },
  {
    to: "/me/orders",
    title: "My requests",
    description: "Track service requests, messages, and status updates.",
    cta: "Open requests",
    testId: "me-link-orders",
    accent: "bg-violet-50 border-violet-200 hover:border-violet-300 hover:bg-violet-100/70",
    badge: "R",
    badgeClass: "bg-violet-600 text-white",
  },
  {
    to: "/me/claim",
    title: "Claim a guest booking or request",
    description: "Booked or contacted a business without logging in? Link it to this account.",
    cta: "Claim now",
    testId: "me-link-claim",
    accent: "bg-amber-50 border-amber-200 hover:border-amber-300 hover:bg-amber-100/70",
    badge: "C",
    badgeClass: "bg-amber-600 text-white",
  },
  {
    to: "/businesses",
    title: "Browse businesses",
    description: "Find a business, book a service, or send a request.",
    cta: "Browse businesses",
    testId: "me-link-businesses",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100/70",
    badge: "S",
    badgeClass: "bg-emerald-600 text-white",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Book or send a request",
    copy: "Enter your email and phone when booking or contacting a business. This creates a guest booking or request with a reference — not a login account.",
  },
  {
    step: "2",
    title: "Log in to your account",
    copy: "Use an existing login. Guest activity does not appear under My bookings or My requests until you claim it.",
  },
  {
    step: "3",
    title: "Claim guest activity if needed",
    copy: "Open Claim and enter your booking/request reference plus the same email or phone you used as a guest. That attaches it to your signed-in account.",
  },
] as const;

const NEXT_STEPS = [
  { to: "/businesses", label: "Book a service", testId: "me-next-browse" },
  { to: "/me/claim", label: "Claim guest booking/request", testId: "me-next-claim" },
  { to: "/me/bookings", label: "Check bookings", testId: "me-next-bookings" },
  { to: "/me/orders", label: "Check requests", testId: "me-next-orders" },
] as const;

export function MeAccountPage() {
  const { isAuthenticated, user } = useAuth();

  const upcomingBookingsQuery = useQuery({
    queryKey: ["my-bookings", "upcoming"],
    queryFn: () => listMyBookings("upcoming"),
    enabled: isAuthenticated,
  });

  const activeOrdersQuery = useQuery({
    queryKey: ["my-orders", "active"],
    queryFn: () => listMyOrders("active"),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <section className="space-y-6" data-testid="me-account-page">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Your account</h1>
          <p className="mt-1 text-sm text-slate-600">
            Keep track of your bookings, service requests, messages, and reviews in one place.
          </p>
        </div>

        <AuthPrompt description="Log in to open your client dashboard, then claim guest bookings or requests with your reference." />
        <p className="text-center text-sm text-slate-600">
          Booked as a guest?{" "}
          <Link to="/me/claim" className="font-medium text-brand-700 hover:underline">
            Claim a booking or request
          </Link>
        </p>
        <p className="text-center text-sm text-slate-600">
          Own a business?{" "}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Register your business
          </Link>
        </p>

        <HowItWorksSection showAuthLinks />
      </section>
    );
  }

  const upcomingCount = upcomingBookingsQuery.data?.data.length;
  const activeRequestsCount = activeOrdersQuery.data?.data.length;
  const countsReady =
    upcomingBookingsQuery.isSuccess && activeOrdersQuery.isSuccess;
  const showEmptyNextSteps =
    countsReady && upcomingCount === 0 && activeRequestsCount === 0;

  return (
    <section className="space-y-6" data-testid="me-account-page">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Your account</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">
          Keep track of your bookings, service requests, messages, and reviews in one place.
        </p>
      </div>

      {user?.email ? (
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
          data-testid="me-signed-in-card"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Signed in as
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={user.email}>
            {user.email}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Businesses use this email to connect bookings and requests to your account.
          </p>
        </div>
      ) : null}

      {countsReady ? (
        <div
          className="grid grid-cols-2 gap-3"
          data-testid="me-account-summary"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Upcoming bookings
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{upcomingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Open requests
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{activeRequestsCount}</p>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
        <div
          className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
          data-testid="me-account-links"
        >
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className={`flex min-h-[8rem] flex-col overflow-hidden rounded-2xl border p-4 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${item.accent}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${item.badgeClass}`}
                  aria-hidden="true"
                >
                  {item.badge}
                </span>
                <div className="min-w-0">
                  <span className="block text-base font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-600">{item.description}</span>
                </div>
              </div>
              <span className="mt-auto pt-3 text-sm font-semibold text-brand-700">
                {item.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <HowItWorksSection showAuthLinks={false} />

      {showEmptyNextSteps ? (
        <div
          className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:p-5"
          data-testid="me-next-steps"
        >
          <h2 className="text-base font-semibold text-slate-900">Next steps</h2>
          <p className="mt-1 text-sm text-slate-600">
            You do not have upcoming bookings or open requests yet. Here is where to start.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {NEXT_STEPS.map((step) => (
              <Link
                key={step.to}
                to={step.to}
                data-testid={step.testId}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {step.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HowItWorksSection({ showAuthLinks }: { showAuthLinks: boolean }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="me-how-it-works"
    >
      <h2 className="text-base font-semibold text-slate-900">How your client account works</h2>
      <ol className="mt-4 space-y-4">
        {HOW_IT_WORKS.map((item) => (
          <li key={item.step} className="flex gap-3">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {item.step}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{item.copy}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {showAuthLinks ? (
          <Link
            to="/login"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log in
          </Link>
        ) : null}
        <Link
          to="/me/claim"
          className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Claim guest activity
        </Link>
        <Link
          to="/businesses"
          className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Browse businesses
        </Link>
      </div>
    </div>
  );
}
