import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS: Array<{ to: string; label: string; end?: boolean; testId?: string }> = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/messages", label: "Messages", testId: "admin-messages-sidebar-link" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/schedule", label: "Schedule" },
  { to: "/admin/mini-site", label: "Mini-site", testId: "admin-mini-site-sidebar-link" },
  { to: "/admin/legal-consents", label: "Legal consent" },
  { to: "/admin/settings", label: "Settings" },
];

function navClass(isActive: boolean): string {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-700 hover:bg-gray-50"
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
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 xl:px-8">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {businessName ?? "Business"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/me"
              className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 lg:inline"
              data-testid="admin-client-area-link"
            >
              Client area
            </Link>
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
                      data-testid={
                        item.testId ??
                        `admin-mobile-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`
                      }
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
                  <NavLink
                    to="/me"
                    className={({ isActive }) => drawerNavClass(isActive)}
                    onClick={closeMenu}
                    data-testid="admin-mobile-link-client-area"
                  >
                    Client area
                  </NavLink>
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

      <div className="flex w-full flex-1 flex-col">
        {/* Top zone: sidebar + page content side-by-side only */}
        <div className="mx-auto flex w-full max-w-[1600px] flex-col bg-gray-50/40 lg:flex-row">
          <aside
            className="hidden w-60 shrink-0 border-r border-gray-200 bg-white px-3 py-5 lg:block"
            data-testid="admin-desktop-sidebar"
          >
            <p className="mb-4 px-3 text-sm font-bold tracking-tight text-blue-600">
              ServicePlatform
            </p>
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navClass(isActive)}
                  data-testid={item.testId}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-6 border-t border-slate-100 px-3 pt-4">
              <Link
                to="/me"
                className="block text-sm font-medium text-slate-600 hover:text-brand-700"
                data-testid="admin-sidebar-client-area-link"
              >
                Client area
              </Link>
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8 xl:px-8 xl:py-8 2xl:px-10">
            <Outlet />
          </main>
        </div>

        {/*
          Full-shell-width slot BELOW the entire top zone (sidebar + main).
          Email Delivery showcase portals here so it starts at the page left edge,
          not trapped to the right of the sidebar.
        */}
        <div id="admin-layout-shell-breakout" data-testid="admin-layout-shell-breakout" />
      </div>
    </div>
  );
}
