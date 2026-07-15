import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export type PublicSiteNavActive = "home" | "marketplace" | "pricing";

type PublicSiteHeaderProps = {
  active?: PublicSiteNavActive;
};

function navLinkClass(isActive: boolean): string {
  return isActive
    ? "border-b-2 border-brand-700 pb-0.5 text-brand-700"
    : "hover:text-brand-700";
}

export function PublicSiteHeader({ active = "home" }: PublicSiteHeaderProps) {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-slate-900">Service Platform</span>
          </Link>
          <nav
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
            data-testid="public-site-desktop-nav"
          >
            <Link to="/" className={navLinkClass(active === "home")}>
              Home
            </Link>
            <Link to="/businesses" className={navLinkClass(active === "marketplace")}>
              Marketplace
            </Link>
            <Link to="/businesses" className="hover:text-brand-700">
              Reviews
            </Link>
            <Link to="/pricing" className={navLinkClass(active === "pricing")}>
              Pricing
            </Link>
            <Link to="/#how-it-works" className="hover:text-brand-700">
              How it works
            </Link>
          </nav>
        </div>

        <div
          className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex"
          data-testid="public-site-desktop-actions"
        >
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
                to="/pricing"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          data-testid="public-site-mobile-menu-button"
          onClick={() => setMenuOpen(true)}
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded bg-slate-700" />
            <span className="block h-0.5 w-5 rounded bg-slate-700" />
            <span className="block h-0.5 w-5 rounded bg-slate-700" />
          </span>
        </button>
      </div>

      {menuOpen
        ? createPortal(
            <div className="md:hidden" data-testid="public-site-mobile-menu-layer">
              <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/40"
                aria-label="Close menu backdrop"
                data-testid="public-site-mobile-menu-backdrop"
                onClick={closeMenu}
              />
              <div
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label="Site menu"
                className="fixed inset-y-0 right-0 z-50 flex w-[min(80vw,360px)] max-w-full flex-col bg-white shadow-xl"
                data-testid="public-site-mobile-menu"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Menu</p>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-xl leading-none text-slate-700 hover:bg-slate-50"
                    aria-label="Close menu"
                    data-testid="public-site-mobile-menu-close"
                    onClick={closeMenu}
                  >
                    ×
                  </button>
                </div>
                <nav
                  aria-label="Mobile"
                  className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm font-medium text-slate-700"
                >
                  <Link
                    to="/"
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                    onClick={closeMenu}
                    data-testid="public-site-mobile-link-home"
                  >
                    Home
                  </Link>
                  <Link
                    to="/businesses"
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                    onClick={closeMenu}
                    data-testid="public-site-mobile-link-marketplace"
                  >
                    Marketplace
                  </Link>
                  <Link
                    to="/businesses"
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                    onClick={closeMenu}
                    data-testid="public-site-mobile-link-reviews"
                  >
                    Reviews
                  </Link>
                  <Link
                    to="/pricing"
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                    onClick={closeMenu}
                    data-testid="public-site-mobile-link-pricing"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/#how-it-works"
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                    onClick={closeMenu}
                    data-testid="public-site-mobile-link-how-it-works"
                  >
                    How it works
                  </Link>
                  <div className="my-2 border-t border-slate-100" />
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/me/bookings"
                        className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                        onClick={closeMenu}
                        data-testid="public-site-mobile-link-bookings"
                      >
                        My bookings
                      </Link>
                      <Link
                        to="/admin"
                        className="rounded-lg bg-brand-700 px-3 py-2.5 text-center font-semibold text-white hover:bg-brand-800"
                        onClick={closeMenu}
                        data-testid="public-site-mobile-link-dashboard"
                      >
                        Dashboard
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
                        onClick={closeMenu}
                        data-testid="public-site-mobile-link-signin"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/pricing"
                        className="rounded-lg bg-brand-700 px-3 py-2.5 text-center font-semibold text-white hover:bg-brand-800"
                        onClick={closeMenu}
                        data-testid="public-site-mobile-link-get-started"
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
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
        <Link to="/pricing" className="hover:text-brand-700 hover:underline">
          Pricing
        </Link>
        <Link to="/login" className="hover:text-brand-700 hover:underline">
          Sign in
        </Link>
        <Link to="/pricing" className="hover:text-brand-700 hover:underline">
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
