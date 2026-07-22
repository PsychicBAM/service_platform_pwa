import { Link } from "react-router-dom";
import { MINI_SITE_UPGRADE_HREF, getMiniSitePlanId } from "@/lib/miniSitePlanAccess";

type MiniSiteUpgradeBannerProps = {
  plan?: string | null;
};

export function MiniSiteUpgradeBanner({ plan }: MiniSiteUpgradeBannerProps) {
  const tier = getMiniSitePlanId(plan);

  if (tier === "pro") {
    return (
      <div
        className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5 shadow-sm"
        data-testid="admin-mini-site-upgrade-banner"
        data-plan="pro"
      >
        <p className="text-sm font-semibold text-violet-900">You have Pro</p>
        <p className="mt-1 text-sm text-violet-700">All templates and advanced customization are unlocked.</p>
      </div>
    );
  }

  const title =
    tier === "business"
      ? "Unlock all templates with Pro"
      : "Unlock Clean and mini-site templates with Pro";
  const benefits =
    tier === "business"
      ? [
          "Every template unlocked",
          "Advanced media & layout options",
          "Full section customization",
        ]
      : [
          "Keep Default business profile free",
          "Unlock Clean and premium templates",
          "Media sections & advanced customization",
        ];

  return (
    <div
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white shadow-sm sm:p-6"
      data-testid="admin-mini-site-upgrade-banner"
      data-plan={tier}
    >
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <ul className="mt-3 grid gap-1.5 text-sm text-violet-100 sm:grid-cols-2">
        {benefits.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-violet-200">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link
        to={MINI_SITE_UPGRADE_HREF}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-50"
        data-testid="admin-mini-site-upgrade-to-pro"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
