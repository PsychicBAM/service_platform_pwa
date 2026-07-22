import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import {
  buildQrDownloadFilename,
  downloadQrPngFromCanvas,
} from "@/components/admin/PublicBusinessLinkCard";
import {
  canUseMiniSite,
  getMiniSitePlanId,
  isProPlan,
} from "@/lib/miniSitePlanAccess";
import type { PublicPageVariant } from "@/types/api";

type MiniSiteStatusStripProps = {
  plan?: string | null;
  pageVariant?: PublicPageVariant;
  businessSlug?: string;
  businessName?: string;
  saveStatus?: "idle" | "saved" | "error";
  onPreview?: () => void;
  onShare?: () => void;
};

export function MiniSiteStatusStrip({
  plan,
  pageVariant = "standard",
  businessSlug,
  businessName,
  saveStatus = "idle",
  onPreview,
  onShare,
}: MiniSiteStatusStripProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [qrDownloadStatus, setQrDownloadStatus] = useState<"idle" | "failed">("idle");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const publicPath = businessSlug ? `/b/${businessSlug}` : null;
  const publicUrl =
    businessSlug && typeof window !== "undefined"
      ? `${window.location.origin}/b/${businessSlug}`
      : null;
  const tier = getMiniSitePlanId(plan);
  const usingDefault = pageVariant === "standard";
  const editorAvailable = canUseMiniSite(plan);

  const statusLabel = usingDefault ? "Published" : editorAvailable ? "Published" : "Locked";
  const statusDetail = usingDefault
    ? "Default business profile is live on the public page"
    : isProPlan(plan)
      ? "Your Pro mini-site is live on the public page"
      : "Your Clean mini-site is live on the public page";

  async function handleCopy() {
    if (!publicUrl || !navigator.clipboard?.writeText) {
      setCopyStatus("failed");
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function handleDownloadQr() {
    if (!businessSlug || !qrCanvasRef.current) {
      setQrDownloadStatus("failed");
      return;
    }
    const ok = downloadQrPngFromCanvas(
      qrCanvasRef.current,
      buildQrDownloadFilename(businessSlug),
    );
    setQrDownloadStatus(ok ? "idle" : "failed");
  }

  return (
    <div
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
      data-testid="admin-mini-site-status-strip"
      data-status={statusLabel.toLowerCase()}
      data-plan={tier}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              statusLabel === "Published"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                statusLabel === "Published" ? "bg-emerald-500" : "bg-slate-400"
              }`}
              aria-hidden="true"
            />
            {statusLabel === "Published"
              ? usingDefault
                ? "Default profile is live"
                : "Your mini-site is live"
              : "Mini-site locked"}
          </span>
        </div>
        <p className="text-sm text-slate-600">{statusDetail}</p>
        {publicUrl ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <a
              href={publicPath!}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-brand-700 hover:underline"
              data-testid="admin-mini-site-public-link"
            >
              {publicUrl}
            </a>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Public link unavailable until a slug is set.</p>
        )}
        <p className="text-xs text-slate-500" data-testid="admin-mini-site-analytics-note">
          Analytics coming soon
        </p>
        <p className="text-xs text-slate-500" data-testid="admin-mini-site-save-status">
          {saveStatus === "saved"
            ? "Status: All changes saved"
            : saveStatus === "error"
              ? "Status: Save failed"
              : editorAvailable
                ? "Status: Ready to edit"
                : "Status: Upgrade required"}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          onClick={onPreview}
          disabled={!publicPath}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="admin-mini-site-preview-button"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={!publicUrl}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="admin-mini-site-share-button"
        >
          Share
        </button>
        {publicPath ? (
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            data-testid="admin-mini-site-view-button"
          >
            View mini-site
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-xl bg-violet-600/50 px-3 py-2 text-sm font-semibold text-white"
            data-testid="admin-mini-site-view-button"
          >
            View mini-site
          </button>
        )}
      </div>

      {publicUrl ? (
        <aside
          className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
          data-testid="admin-mini-site-qr-card"
        >
          <QRCodeSVG
            value={publicUrl}
            size={88}
            title={`QR code for ${businessName ?? "public page"}`}
            aria-label={`QR code for ${businessName ?? "public page"}`}
          />
          <p className="text-center text-[11px] font-medium text-slate-600">QR code · Scan to view</p>
          <button
            type="button"
            onClick={handleDownloadQr}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Download
          </button>
          {qrDownloadStatus === "failed" ? (
            <p className="text-[11px] text-amber-700">Download failed</p>
          ) : null}
          <div className="sr-only" aria-hidden="true">
            <QRCodeCanvas ref={qrCanvasRef} value={publicUrl} size={88} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
