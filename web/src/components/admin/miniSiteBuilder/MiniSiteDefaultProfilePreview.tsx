type MiniSiteDefaultProfilePreviewProps = {
  businessSlug?: string;
  businessName?: string;
  saveStatus?: "idle" | "saved" | "error";
  saving?: boolean;
  onSave?: () => void;
};

const MANAGED_LINKS = [
  {
    label: "Business profile & location",
    href: "/admin/settings?tab=business",
    detail: "Settings → Business",
  },
  {
    label: "Services",
    href: "/admin/services",
    detail: "Admin → Services",
  },
  {
    label: "Booking & schedule",
    href: "/admin/schedule",
    detail: "Admin → Schedule",
  },
  {
    label: "Reviews",
    href: "/admin/reviews",
    detail: "Admin → Reviews",
  },
] as const;

/**
 * Honest overview for Default business profile (standard public page).
 * No fake section nav — content is managed in existing admin areas.
 */
export function MiniSiteDefaultProfilePreview({
  businessSlug,
  businessName,
  saveStatus = "idle",
  saving = false,
  onSave,
}: MiniSiteDefaultProfilePreviewProps) {
  const publicPath = businessSlug ? `/b/${businessSlug}` : null;

  return (
    <div
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="admin-mini-site-default-preview"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Default business profile selected
        </p>
        <h3 className="text-lg font-semibold text-slate-900">Original public page layout</h3>
        <p className="max-w-xl text-sm text-slate-600">
          This page uses your existing business data
          {businessName ? ` for ${businessName}` : ""}. Mini-site customizations stay saved and
          inactive until you switch back to Clean or another template.
        </p>
      </div>

      <ul className="space-y-2" data-testid="admin-mini-site-default-managed-links">
        {MANAGED_LINKS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
              data-testid="admin-mini-site-default-managed-link"
              data-href={item.href}
            >
              <span>
                <span className="font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
              </span>
              <span aria-hidden="true" className="text-emerald-700">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {publicPath ? (
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            data-testid="admin-mini-site-default-view-page"
          >
            View page
          </a>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="admin-mini-site-default-save"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saveStatus === "saved" ? (
          <span className="text-sm text-emerald-700" role="status">
            Default profile saved
          </span>
        ) : null}
        {saveStatus === "error" ? (
          <span className="text-sm text-red-600" role="status">
            Could not save default profile
          </span>
        ) : null}
      </div>
    </div>
  );
}
