import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col md:max-w-3xl lg:max-w-5xl">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-lg font-semibold text-brand-700">
            Service Platform
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                {user?.role === "superadmin" ? (
                  <Link to="/superadmin" className="text-slate-600 hover:text-brand-700">
                    Superadmin
                  </Link>
                ) : null}
                {(user?.businesses?.length ?? 0) > 0 ? (
                  <Link to="/admin" className="text-slate-600 hover:text-brand-700">
                    Admin
                  </Link>
                ) : null}
                <Link to="/me/bookings" className="text-slate-600 hover:text-brand-700">
                  Bookings
                </Link>
                <Link to="/me/orders" className="text-slate-600 hover:text-brand-700">
                  Orders
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-slate-600 hover:text-brand-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="text-slate-600 hover:text-brand-700">
                Login
              </Link>
            )}
          </nav>
        </div>
        {isAuthenticated && user && user.email_verified === false ? (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Please verify your email.{" "}
            <Link to="/check-email" className="font-medium text-brand-700 hover:underline">
              Go to check email
            </Link>
          </div>
        ) : null}
        {isAuthenticated && user?.email ? (
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
        ) : null}
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
        Service Platform · Bookings &amp; requests
      </footer>
    </div>
  );
}
