import { useState } from "react";

type PublicBusinessLinkCardProps = {
  businessName?: string;
  businessSlug?: string;
};

type CopyStatus = "idle" | "copied" | "failed";

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PublicBusinessLinkCard({
  businessSlug,
}: PublicBusinessLinkCardProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const publicPath = businessSlug ? `/b/${businessSlug}` : null;
  const publicUrl =
    businessSlug && typeof window !== "undefined"
      ? `${window.location.origin}/b/${businessSlug}`
      : null;

  const handleCopyLink = async () => {
    if (!publicUrl) {
      return;
    }
    const copied = await copyTextToClipboard(publicUrl);
    setCopyStatus(copied ? "copied" : "failed");
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCopyLink();
              }}
              className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copyStatus === "copied" ? "Copied" : "Copy link"}
            </button>
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Preview page
            </a>
          </div>
          {copyStatus === "copied" ? (
            <p className="text-sm text-green-700" role="status">
              Link copied
            </p>
          ) : null}
          {copyStatus === "failed" ? (
            <p className="text-sm text-amber-700" role="status">
              Copy failed. You can copy the link manually.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-700" role="status">
          Public page is not ready yet. Business slug is missing.
        </p>
      )}
    </div>
  );
}
