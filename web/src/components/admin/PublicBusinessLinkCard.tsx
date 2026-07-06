import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

type PublicBusinessLinkCardProps = {
  businessName?: string;
  businessSlug?: string;
};

type CopyStatus = "idle" | "copied" | "failed";
type ShareStatus = "idle" | "opened" | "unavailable" | "failed";
type QrDownloadStatus = "idle" | "failed";

const SHARE_TEXT = "Book services or send requests here.";
const DEFAULT_SHARE_TITLE = "Public business page";
const QR_CODE_SIZE = 112;

export function buildQrDownloadFilename(businessSlug: string): string {
  return `${businessSlug}-qr-code.png`;
}

export function downloadQrPngFromCanvas(canvas: HTMLCanvasElement, filename: string): boolean {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return true;
  } catch {
    return false;
  }
}

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
  const [qrDownloadStatus, setQrDownloadStatus] = useState<QrDownloadStatus>("idle");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
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

  const handleDownloadQr = () => {
    if (!businessSlug || !publicUrl) {
      return;
    }
    setQrDownloadStatus("idle");
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setQrDownloadStatus("failed");
      return;
    }
    const downloaded = downloadQrPngFromCanvas(
      canvas,
      buildQrDownloadFilename(businessSlug),
    );
    if (!downloaded) {
      setQrDownloadStatus("failed");
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
            className="flex w-fit max-w-full shrink-0 flex-col gap-2 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0"
            data-testid="public-business-qr-section"
          >
            <p className="text-sm font-medium text-slate-700">QR code</p>
            <p className="text-xs text-slate-500">Scan to open page</p>
            <div className="flex w-fit flex-col items-stretch gap-2">
              <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                <QRCodeSVG
                  value={publicUrl}
                  size={QR_CODE_SIZE}
                  title="QR code for public business page"
                  aria-label="QR code for public business page"
                />
              </div>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex w-full justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download QR
              </button>
            </div>
            {qrDownloadStatus === "failed" ? (
              <p className="max-w-[11rem] text-xs text-amber-700 sm:text-sm" role="status">
                QR download failed. You can still use the public link.
              </p>
            ) : null}
            <div className="sr-only" aria-hidden="true">
              <QRCodeCanvas ref={qrCanvasRef} value={publicUrl} size={QR_CODE_SIZE} />
            </div>
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
