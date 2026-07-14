import { Outlet, useLocation } from "react-router-dom";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public/PublicSiteChrome";

export function LandingShell() {
  const location = useLocation();
  const active = location.pathname === "/pricing" ? "pricing" : "home";

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicSiteHeader active={active} />
      <Outlet />
      <PublicSiteFooter />
    </div>
  );
}
