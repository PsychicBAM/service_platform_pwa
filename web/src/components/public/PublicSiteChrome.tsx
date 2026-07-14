import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export type PublicSiteNavActive = "home" | "marketplace";

type PublicSiteHeaderProps = {
  active?: PublicSiteNavActive;
};

export function PublicSiteHeader({ active = "home" }: PublicSiteHeaderProps) {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-slate-900">Service Platform</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link
              to="/"
              className={
                active === "home"
                  ? "border-b-2 border-brand-700 pb-0.5 text-brand-700"
                  : "hover:text-brand-700"
              }
            >
              Home
            </Link>
            <Link
              to="/businesses"
              className={
                active === "marketplace"
                  ? "border-b-2 border-brand-700 pb-0.5 text-brand-700"
                  : "hover:text-brand-700"
              }
            >
              Marketplace
            </Link>
            <Link to="/businesses" className="hover:text-brand-700">
              Reviews
            </Link>
            <a href="#how-it-works" className="hover:text-brand-700">
              How it works
            </a>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/me/bookings"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
              >
                My bookings
              </Link>
              <Link
                to="/admin"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500 md:px-6">
      <p className="mb-3 text-sm font-medium text-slate-700">Service Platform</p>
      <nav
        aria-label="Footer"
        className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm"
      >
        <Link to="/businesses" className="hover:text-brand-700 hover:underline">
          Marketplace
        </Link>
        <Link to="/login" className="hover:text-brand-700 hover:underline">
          Sign in
        </Link>
        <Link to="/register" className="hover:text-brand-700 hover:underline">
          Get started
        </Link>
      </nav>
      <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/legal/terms" className="hover:text-brand-700 hover:underline">
          Terms
        </Link>
        <Link to="/legal/privacy" className="hover:text-brand-700 hover:underline">
          Privacy
        </Link>
        <Link to="/legal/consent" className="hover:text-brand-700 hover:underline">
          Personal Data Consent
        </Link>
        <Link to="/legal/cookies" className="hover:text-brand-700 hover:underline">
          Cookies
        </Link>
      </nav>
    </footer>
  );
}
