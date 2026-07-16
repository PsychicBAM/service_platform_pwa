import { useCallback, useId, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  SiteMobileMenuButton,
  SiteMobileMenuDrawer,
  siteHeaderBarClass,
  siteHeaderOffsetClass,
  siteMobileMenuLinkClass,
} from "@/components/SiteMobileMenu";

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  function handleLogout() {
    closeMenu();
    logout();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col md:max-w-3xl lg:max-w-5xl">
      <header className={siteHeaderBarClass} data-testid="app-layout-header">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-3 px-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2" onClick={closeMenu}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              S
            </span>
            <span className="truncate text-lg font-semibold text-slate-900">Service Platform</span>
          </Link>

          <nav
            className="hidden items-center gap-3 text-sm md:flex"
            data-testid="app-layout-desktop-nav"
          >
            {isAuthenticated ? (
              <>
                {user?.role === "superadmin" ? (
                  <Link to="/superadmin" className="py-1 text-slate-600 hover:text-brand-700">
                    Superadmin
                  </Link>
                ) : null}
                {(user?.businesses?.length ?? 0) > 0 ? (
                  <Link to="/admin" className="py-1 text-slate-600 hover:text-brand-700">
                    Admin
                  </Link>
                ) : null}
                <Link to="/me" className="py-1 text-slate-600 hover:text-brand-700">
                  Account
                </Link>
                <Link to="/me/bookings" className="py-1 text-slate-600 hover:text-brand-700">
                  Bookings
                </Link>
                <Link to="/me/orders" className="py-1 text-slate-600 hover:text-brand-700">
                  Requests
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-1 text-slate-600 hover:text-brand-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="py-1 text-slate-600 hover:text-brand-700">
                Login
              </Link>
            )}
          </nav>

          <SiteMobileMenuButton
            menuOpen={menuOpen}
            menuId={menuId}
            onOpen={() => setMenuOpen(true)}
            testId="app-layout-mobile-menu-button"
          />
        </div>
      </header>
      <div
        className={siteHeaderOffsetClass}
        aria-hidden="true"
        data-testid="app-layout-header-offset"
      />

      {isAuthenticated && user && user.email_verified === false ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
          data-testid="app-layout-verify-banner"
        >
          Please verify your email.{" "}
          <Link to="/check-email" className="font-medium text-brand-700 hover:underline">
            Go to check email
          </Link>
        </div>
      ) : null}

      {isAuthenticated && user?.email ? (
        <p
          className="truncate border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-500"
          data-testid="app-layout-user-email"
        >
          {user.email}
        </p>
      ) : null}

      <SiteMobileMenuDrawer
        open={menuOpen}
        menuId={menuId}
        onClose={closeMenu}
        testIdPrefix="app-layout-mobile-menu"
      >
        {isAuthenticated ? (
          <>
            <Link
              to="/me"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-account"
            >
              Account
            </Link>
            <Link
              to="/me/bookings"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-bookings"
            >
              Bookings
            </Link>
            <Link
              to="/me/orders"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-requests"
            >
              Requests
            </Link>
            <Link
              to="/businesses"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-businesses"
            >
              Browse businesses
            </Link>
            <Link
              to="/me/claim"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-claim"
            >
              Claim booking/request
            </Link>
            {(user?.businesses?.length ?? 0) > 0 ? (
              <Link
                to="/admin"
                className={siteMobileMenuLinkClass}
                onClick={closeMenu}
                data-testid="app-layout-mobile-link-admin"
              >
                Admin
              </Link>
            ) : null}
            {user?.role === "superadmin" ? (
              <Link
                to="/superadmin"
                className={siteMobileMenuLinkClass}
                onClick={closeMenu}
                data-testid="app-layout-mobile-link-superadmin"
              >
                Superadmin
              </Link>
            ) : null}
            <div className="my-2 border-t border-slate-100" />
            <button
              type="button"
              onClick={handleLogout}
              className={`${siteMobileMenuLinkClass} w-full text-left`}
              data-testid="app-layout-mobile-logout"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-login"
            >
              Log in
            </Link>
            <Link
              to="/client/register"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-client-register"
            >
              Create client account
            </Link>
            <Link
              to="/businesses"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-businesses"
            >
              Browse businesses
            </Link>
            <Link
              to="/register"
              className={siteMobileMenuLinkClass}
              onClick={closeMenu}
              data-testid="app-layout-mobile-link-register-business"
            >
              Register your business
            </Link>
          </>
        )}
      </SiteMobileMenuDrawer>

      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 pb-24 text-center text-xs text-slate-500 md:pb-4">
        <p className="mb-2">Service Platform · Bookings &amp; requests</p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        >
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
    </div>
  );
}
