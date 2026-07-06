import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type PublicBusinessLinkCardProps = {
  businessName?: string;
  businessSlug?: string;
};

type CopyStatus = "idle" | "copied" | "failed";
type ShareStatus = "idle" | "opened" | "unavailable" | "failed";

const SHARE_TEXT = "Book services or send requests here.";
const DEFAULT_SHARE_TITLE = "Public business page";
const QR_CODE_SIZE = 112;

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

function isShareCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AbortError" || /cancel/i.test(error.message);
}

async function sharePublicUrl(payload: ShareData): Promise<"opened" | "unavailable" | "cancelled" | "failed"> {
  if (!navigator.share) {
    return "unavailable";
  }
  try {
    await navigator.share(payload);
    return "opened";
  } catch (error) {
    if (isShareCancellation(error)) {
      return "cancelled";
    }
    return "failed";
  }
}

export function PublicBusinessLinkCard({
  businessName,
  businessSlug,
}: PublicBusinessLinkCardProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
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

  const handleShare = async () => {
    if (!publicUrl) {
      return;
    }
    const title = businessName?.trim() || DEFAULT_SHARE_TITLE;
    const result = await sharePublicUrl({
      title,
      text: SHARE_TEXT,
      url: publicUrl,
    });
    if (result === "opened") {
      setShareStatus("opened");
      return;
    }
    if (result === "unavailable") {
      setShareStatus("unavailable");
      return;
    }
    if (result === "failed") {
      setShareStatus("failed");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {businessSlug && publicUrl && publicPath ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Public business page</h3>
              <p className="mt-1 text-sm text-slate-600">
                Send this link to clients so they can book services or submit requests.
              </p>
            </div>
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
              <button
                type="button"
                onClick={() => {
                  void handleShare();
                }}
                className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Share
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
            {shareStatus === "opened" ? (
              <p className="text-sm text-green-700" role="status">
                Share dialog opened
              </p>
            ) : null}
            {shareStatus === "unavailable" ? (
              <p className="text-sm text-amber-700" role="status">
                Sharing is not available in this browser. You can copy the link instead.
              </p>
            ) : null}
            {shareStatus === "failed" ? (
              <p className="text-sm text-amber-700" role="status">
                Sharing failed. You can copy the link instead.
              </p>
            ) : null}
          </div>
          <div
            className="w-fit max-w-full shrink-0 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0"
            data-testid="public-business-qr-section"
          >
            <p className="text-sm font-medium text-slate-700">QR code</p>
            <p className="mt-1 max-w-[11rem] text-xs text-slate-600 sm:text-sm">
              Clients can scan this code to open your public page.
            </p>
            <div className="mt-2 inline-block rounded-lg border border-slate-200 bg-white p-1.5">
              <QRCodeSVG
                value={publicUrl}
                size={QR_CODE_SIZE}
                title="QR code for public business page"
                aria-label="QR code for public business page"
              />
            </div>
            <p className="mt-2 max-w-[11rem] text-xs text-slate-500">
              This QR code stays valid as long as your public page link does not change.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-slate-900">Public business page</h3>
          <p className="mt-1 text-sm text-slate-600">
            Send this link to clients so they can book services or submit requests.
          </p>
          <p className="mt-3 text-sm text-amber-700" role="status">
            Public page is not ready yet. Business slug is missing.
          </p>
        </>
      )}
    </div>
  );
}
