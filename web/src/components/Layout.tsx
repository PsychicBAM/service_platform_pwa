import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-lg font-semibold text-brand-700">
            Service Platform
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-slate-600 hover:text-brand-700">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
        Client PWA skeleton — Phase 2
      </footer>
    </div>
  );
}
