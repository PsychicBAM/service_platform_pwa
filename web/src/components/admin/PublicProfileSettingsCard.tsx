import { Link } from "react-router-dom";
import { PlanBadge, isProPlan } from "@/components/admin/PlanBadge";
import { MiniSiteEditorCard } from "@/components/admin/MiniSiteEditorCard";
import {
  canUseMiniSite,
  getAllowedMiniSiteTemplates,
} from "@/lib/miniSitePlanAccess";

export const PUBLIC_PROFILE_TITLE = "Public profile";
export const PUBLIC_PROFILE_DESCRIPTION =
  "Customize the public mini-site profile that clients see on your business page.";
export const PUBLIC_PROFILE_ON_PRO_MESSAGE =
  "Customize your Pro mini-site sections and theme below.";
export const PUBLIC_PROFILE_COMING_SOON_MESSAGE =
  "Public profile customization is being prepared for Pro businesses. You can still edit and save draft settings below.";
export const PUBLIC_PROFILE_MEDIA_PLACEHOLDER =
  "Gallery and media uploads are coming soon.";

type PublicProfileSettingsCardProps = {
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  currentPlan?: string;
};

export function PublicProfileSettingsCard({
  businessId,
  businessName,
  businessSlug,
  currentPlan,
}: PublicProfileSettingsCardProps) {
  const onPro = isProPlan(currentPlan);
  const editorUnlocked = canUseMiniSite(currentPlan);
  const allowedTemplates = getAllowedMiniSiteTemplates(currentPlan);

  return (
    <div
      className="space-y-4"
      data-testid="public-profile-settings-card"
      data-appearance-tab="admin-settings-appearance-tab"
    >
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">{PUBLIC_PROFILE_TITLE}</h3>
          {onPro ? (
            <PlanBadge variant="pro" testId="public-profile-badge-pro" />
          ) : (
            <PlanBadge variant="coming-soon" testId="public-profile-badge-coming-soon" />
          )}
        </div>
        <p className="text-sm text-slate-600">{PUBLIC_PROFILE_DESCRIPTION}</p>
        <p className="text-sm text-slate-600" data-testid="public-profile-plan-message">
          {onPro ? PUBLIC_PROFILE_ON_PRO_MESSAGE : PUBLIC_PROFILE_COMING_SOON_MESSAGE}
        </p>
        <Link
          to="/admin/mini-site"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
          data-testid="public-profile-open-mini-site-builder"
        >
          Open full Mini-site Builder
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {editorUnlocked ? (
        <MiniSiteEditorCard
          businessId={businessId}
          businessName={businessName}
          businessSlug={businessSlug}
          allowedTemplates={allowedTemplates}
        />
      ) : (
        <div
          className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center"
          data-testid="public-profile-mini-site-locked"
        >
          <p className="text-sm font-medium text-slate-800">
            Mini-site editing unlocks on Business (Clean) or Pro.
          </p>
          <Link
            to="/admin/settings?tab=payments"
            className="mt-3 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            View plans
          </Link>
        </div>
      )}
    </div>
  );
}
