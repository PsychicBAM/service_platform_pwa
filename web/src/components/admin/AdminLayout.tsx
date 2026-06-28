import { NavLink, Outlet } from "react-router-dom";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/schedule", label: "Schedule" },
  { to: "/admin/settings", label: "Settings" },
];

function navClass(isActive: boolean): string {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-brand-600 text-white"
      : "text-slate-700 hover:bg-slate-100"
  }`;
}

export function AdminLayout() {
  const { businessName } = useAdminBusiness();
  const { logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {businessName ?? "Business"}
            </h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 text-sm text-slate-600 hover:text-brand-700"
          >
            Logout
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
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
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-slate-50 p-4 lg:block">
          <nav className="flex flex-col gap-1">
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
        </aside>
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
