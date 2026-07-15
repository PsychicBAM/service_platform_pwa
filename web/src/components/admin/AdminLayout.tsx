import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet } from "react-router-dom";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/schedule", label: "Schedule" },
  { to: "/admin/legal-consents", label: "Legal consent" },
  { to: "/admin/settings", label: "Settings" },
];

function navClass(isActive: boolean): string {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-brand-600 text-white"
      : "text-slate-700 hover:bg-slate-100"
  }`;
}

function drawerNavClass(isActive: boolean): string {
  return `rounded-lg px-3 py-2.5 text-sm font-medium ${
    isActive
      ? "bg-brand-600 text-white"
      : "text-slate-700 hover:bg-slate-50"
  }`;
}

export function AdminLayout() {
  const { businessName, businessSlug } = useAdminBusiness();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const publicPath = businessSlug ? `/b/${businessSlug}` : null;

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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {businessName ?? "Business"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="hidden text-sm text-slate-600 hover:text-brand-700 lg:inline"
              data-testid="admin-desktop-logout"
            >
              Logout
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open admin menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              data-testid="admin-mobile-menu-button"
              onClick={() => setMenuOpen(true)}
            >
              <span className="flex flex-col gap-1.5" aria-hidden="true">
                <span className="block h-0.5 w-5 rounded bg-slate-700" />
                <span className="block h-0.5 w-5 rounded bg-slate-700" />
                <span className="block h-0.5 w-5 rounded bg-slate-700" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen
        ? createPortal(
            <div className="lg:hidden" data-testid="admin-mobile-menu-layer">
              <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/40"
                aria-label="Close admin menu backdrop"
                data-testid="admin-mobile-menu-backdrop"
                onClick={closeMenu}
              />
              <div
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label="Admin menu"
                className="fixed inset-y-0 right-0 z-50 flex w-[min(80vw,360px)] max-w-full flex-col bg-white shadow-xl"
                data-testid="admin-mobile-menu"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {businessName ?? "Business"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-xl leading-none text-slate-700 hover:bg-slate-50"
                    aria-label="Close admin menu"
                    data-testid="admin-mobile-menu-close"
                    onClick={closeMenu}
                  >
                    ×
                  </button>
                </div>
                <nav
                  aria-label="Admin mobile"
                  className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                  {NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => drawerNavClass(isActive)}
                      onClick={closeMenu}
                      data-testid={`admin-mobile-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  {publicPath ? (
                    <NavLink
                      to={publicPath}
                      className={({ isActive }) => drawerNavClass(isActive)}
                      onClick={closeMenu}
                      data-testid="admin-mobile-link-public-page"
                    >
                      Public page
                    </NavLink>
                  ) : null}
                  <div className="my-2 border-t border-slate-100" />
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    data-testid="admin-mobile-link-logout"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside
          className="hidden w-48 shrink-0 border-r border-slate-200 bg-slate-50 p-4 lg:block"
          data-testid="admin-desktop-sidebar"
        >
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
