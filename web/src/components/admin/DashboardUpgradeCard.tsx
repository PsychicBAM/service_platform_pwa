import { Link } from "react-router-dom";
import { formatPlanLabel } from "@/utils/planManagement";

type DashboardUpgradeCardProps = {
  plan?: string | null;
  settingsHref?: string;
};

type UpgradeTarget = {
  mode: "upgrade" | "pro";
  title: string;
  subtitle: string;
  cta: string;
  benefits: string[];
};

function normalizePlan(plan?: string | null): string {
  return plan?.trim().toLowerCase() || "free";
}

export function getDashboardUpgradeTarget(plan?: string | null): UpgradeTarget {
  const key = normalizePlan(plan);

  if (key === "pro") {
    return {
      mode: "pro",
      title: "You're on Pro",
      subtitle: "Thanks for growing with ServicePlatform. Advanced tools will appear here as they ship.",
      cta: "View plan details",
      benefits: ["Priority roadmap access", "Premium profile tools", "Advanced growth features"],
    };
  }

  if (key === "business") {
    return {
      mode: "upgrade",
      title: "Upgrade to Pro",
      subtitle: "Unlock more features for growing teams and premium client experiences.",
      cta: "Upgrade now",
      benefits: ["Advanced analytics", "Priority support", "Premium profile tools"],
    };
  }

  if (key === "starter") {
    return {
      mode: "upgrade",
      title: "Upgrade to Business",
      subtitle: "Get booking and request management built for growing businesses.",
      cta: "Upgrade now",
      benefits: ["Appointments & requests", "Team-ready workflows", "Richer client tools"],
    };
  }

  // free / unknown
  return {
    mode: "upgrade",
    title: "Upgrade to Starter",
    subtitle: "Unlock booking tools and a polished public page for your clients.",
    cta: "Upgrade now",
    benefits: ["Simple booking tools", "Public business page", "Client-ready sharing"],
  };
}

export function DashboardUpgradeCard({
  plan,
  settingsHref = "/admin/settings?tab=payments",
}: DashboardUpgradeCardProps) {
  const target = getDashboardUpgradeTarget(plan);
  const currentLabel = formatPlanLabel(normalizePlan(plan));
  const isPro = target.mode === "pro";

  return (
    <aside
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${
        isPro
          ? "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white"
      }`}
      data-testid="admin-dashboard-upgrade-card"
      data-upgrade-mode={target.mode}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-200/30 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isPro ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 16.5 8.2 8l3.3 5.5L15.2 8l3.8 8.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.5 18.5h15" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
              Current plan: {currentLabel}
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-gray-900">{target.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{target.subtitle}</p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {target.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-gray-700">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isPro ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
                }`}
                aria-hidden="true"
              >
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <Link
          to={settingsHref}
          className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
            isPro
              ? "border border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
          data-testid="admin-dashboard-upgrade-cta"
        >
          {!isPro ? (
            <span aria-hidden="true" className="text-base leading-none">
              ✦
            </span>
          ) : null}
          {target.cta}
        </Link>
      </div>
    </aside>
  );
}
