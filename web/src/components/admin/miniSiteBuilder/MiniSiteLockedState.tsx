import { Link } from "react-router-dom";
import { MINI_SITE_UPGRADE_HREF, getMiniSitePlanId } from "@/lib/miniSitePlanAccess";

type MiniSiteLockedStateProps = {
  plan?: string | null;
};

export function MiniSiteLockedState({ plan }: MiniSiteLockedStateProps) {
  const tier = getMiniSitePlanId(plan);
  const isBusiness = tier === "business";

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-8 text-center shadow-sm"
      data-testid="admin-mini-site-locked-state"
      data-plan={tier}
    >
      <span className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
        Pro feature
      </span>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
        {isBusiness
          ? "Upgrade to Pro to unlock all templates and advanced customization"
          : "Mini-site Builder is available on Pro"}
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        {isBusiness
          ? "You can edit the Clean template below. Other templates, advanced media, and full customization unlock with Pro."
          : "Create a polished public profile with templates, media sections, and advanced customization. Upgrade to Pro to start building."}
      </p>
      <Link
        to={MINI_SITE_UPGRADE_HREF}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
        data-testid="admin-mini-site-upgrade-to-pro"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
