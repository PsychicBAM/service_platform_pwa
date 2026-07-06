import { PlanBadge, isProPlan } from "@/components/admin/PlanBadge";

export const PUBLIC_PROFILE_TITLE = "Public profile";
export const PUBLIC_PROFILE_DESCRIPTION =
  "Customize the public mini-site profile that clients see on your business page.";
export const PUBLIC_PROFILE_ON_PRO_MESSAGE =
  "Your Pro mini-site layout is enabled. Profile editing will be available here soon.";
export const PUBLIC_PROFILE_COMING_SOON_MESSAGE =
  "Public profile customization is being prepared for Pro businesses.";
export const PUBLIC_PROFILE_MEDIA_PLACEHOLDER =
  "Media gallery settings will be available after media uploads are added.";

type PublicProfileSettingsCardProps = {
  currentPlan?: string;
};

function DisabledField({
  id,
  label,
  placeholder,
  multiline = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  const sharedClassName =
    "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 disabled:cursor-not-allowed";

  return (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          id={id}
          disabled
          readOnly
          rows={3}
          placeholder={placeholder}
          className={sharedClassName}
          data-testid={id}
        />
      ) : (
        <input
          id={id}
          type="text"
          disabled
          readOnly
          placeholder={placeholder}
          className={sharedClassName}
          data-testid={id}
        />
      )}
    </label>
  );
}

export function PublicProfileSettingsCard({ currentPlan }: PublicProfileSettingsCardProps) {
  const onPro = isProPlan(currentPlan);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
      data-testid="public-profile-settings-card"
    >
      <div className="space-y-2">
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

      <div className="space-y-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Profile fields (preview)
        </p>
        <DisabledField
          id="public-profile-tagline"
          label="Tagline"
          placeholder="Short line shown on your public page"
        />
        <DisabledField
          id="public-profile-about"
          label="About"
          placeholder="Tell clients about your business"
          multiline
        />
        <DisabledField
          id="public-profile-website"
          label="Website"
          placeholder="https://example.com"
        />
        <DisabledField
          id="public-profile-instagram"
          label="Instagram"
          placeholder="https://instagram.com/your-handle"
        />
        <p
          className="text-sm text-slate-500"
          data-testid="public-profile-media-placeholder"
        >
          {PUBLIC_PROFILE_MEDIA_PLACEHOLDER}
        </p>
      </div>

      <button
        type="button"
        disabled
        className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed"
        data-testid="public-profile-save-button"
      >
        Saving coming soon
      </button>
    </div>
  );
}
