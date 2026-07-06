type PublicBusinessLinkCardProps = {
  businessName?: string;
  businessSlug?: string;
};

export function PublicBusinessLinkCard({
  businessSlug,
}: PublicBusinessLinkCardProps) {
  const publicPath = businessSlug ? `/b/${businessSlug}` : null;
  const publicUrl =
    businessSlug && typeof window !== "undefined"
      ? `${window.location.origin}/b/${businessSlug}`
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Public business page</h3>
      <p className="mt-1 text-sm text-slate-600">
        Send this link to clients so they can book services or submit requests.
      </p>
      {businessSlug && publicUrl && publicPath ? (
        <div className="mt-3 space-y-3">
          <p
            className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
            data-testid="public-business-url"
          >
            {publicUrl}
          </p>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Preview page
          </a>
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-700" role="status">
          Public page is not ready yet. Business slug is missing.
        </p>
      )}
    </div>
  );
}
