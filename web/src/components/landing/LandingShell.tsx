import { Outlet } from "react-router-dom";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public/PublicSiteChrome";

export function LandingShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicSiteHeader active="home" />
      <Outlet />
      <PublicSiteFooter />
    </div>
  );
}
