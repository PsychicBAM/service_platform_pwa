import { PlanBadge, isProPlan } from "@/components/admin/PlanBadge";
import { MiniSiteEditorCard } from "@/components/admin/MiniSiteEditorCard";

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
      </div>

      <MiniSiteEditorCard
        businessId={businessId}
        businessName={businessName}
        businessSlug={businessSlug}
      />
    </div>
  );
}
