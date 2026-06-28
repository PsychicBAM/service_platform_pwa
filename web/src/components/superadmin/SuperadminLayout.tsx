import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/superadmin", label: "Overview", end: true },
  { to: "/superadmin/businesses", label: "Businesses" },
  { to: "/superadmin/audit-logs", label: "Audit logs" },
];

function navClass(isActive: boolean): string {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;
}

export function SuperadminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Superadmin</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">Platform management</h1>
            {user?.email ? (
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link to="/" className="text-slate-600 hover:text-brand-700">
              Back to app
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-slate-600 hover:text-brand-700"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
