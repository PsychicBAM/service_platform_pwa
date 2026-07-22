type MiniSiteDefaultProfilePanelProps = {
  businessSlug?: string;
  businessName?: string;
  saveStatus?: "idle" | "saved" | "error";
  saving?: boolean;
  onSave?: () => void;
};

/**
 * Honest preview for Default business profile (standard public page).
 * Does not fake a mini-site template preview.
 */
export function MiniSiteDefaultProfilePanel({
  businessSlug,
  businessName,
  saveStatus = "idle",
  saving = false,
  onSave,
}: MiniSiteDefaultProfilePanelProps) {
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
        <h3 className="text-lg font-semibold text-slate-900">
          Original public page layout
        </h3>
        <p className="max-w-xl text-sm text-slate-600">
          Your public page uses the standard business profile with bookings, requests, reviews,
          quick info, and location
          {businessName ? ` for ${businessName}` : ""}. Mini-site customizations stay saved and
          inactive until you switch back to Clean or another template.
        </p>
      </div>

      <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {[
          "Hero / business profile card",
          "Service cards",
          "Reviews",
          "Quick info & location",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span aria-hidden="true" className="text-emerald-600">
              ✓
            </span>
            {item}
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
