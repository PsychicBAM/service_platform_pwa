import { Link } from "react-router-dom";
import { PlanBadge, isProPlan } from "@/components/admin/PlanBadge";

export const PRO_TOOLS_COMING_SOON_HEADING = "Pro tools coming soon";
export const PRO_TOOLS_PREPARED_MESSAGE =
  "Pro tools are being prepared, including advanced public profile, media, and growth features.";
export const PRO_TOOLS_ON_PRO_MESSAGE =
  "You are on Pro. Advanced tools will appear here as they are released.";
export const PRO_FEATURES_COMING_SOON_HINT = "Pro features are coming soon.";

type ProToolsComingSoonCardProps = {
  currentPlan?: string;
  showSettingsLink?: boolean;
  settingsHref?: string;
};

export function ProToolsComingSoonCard({
  currentPlan,
  showSettingsLink = false,
  settingsHref = "/admin/settings",
}: ProToolsComingSoonCardProps) {
  const onPro = isProPlan(currentPlan);

  return (
    <div
      className="rounded-xl border border-violet-200 bg-violet-50/40 p-3"
      data-testid="pro-tools-coming-soon-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-slate-800">{PRO_TOOLS_COMING_SOON_HEADING}</h4>
        <PlanBadge variant="pro" testId="pro-tools-badge-pro" />
        {onPro ? null : <PlanBadge variant="coming-soon" testId="pro-tools-badge-coming-soon" />}
      </div>
      <p className="mt-2 text-sm text-slate-600" data-testid="pro-tools-message">
        {onPro ? PRO_TOOLS_ON_PRO_MESSAGE : PRO_TOOLS_PREPARED_MESSAGE}
      </p>
      {!onPro && showSettingsLink ? (
        <p className="mt-2 text-sm text-slate-600">
          {PRO_FEATURES_COMING_SOON_HINT}{" "}
          <Link
            to={settingsHref}
            className="font-medium text-brand-700 hover:underline"
            data-testid="pro-tools-settings-link"
          >
            View plan details
          </Link>
        </p>
      ) : null}
    </div>
  );
}
