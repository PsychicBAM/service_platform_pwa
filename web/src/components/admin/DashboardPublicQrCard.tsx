import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  buildQrDownloadFilename,
  downloadQrPngFromCanvas,
} from "@/components/admin/PublicBusinessLinkCard";

type DashboardPublicQrCardProps = {
  businessSlug?: string;
};

const QR_CODE_SIZE = 160;

export function DashboardPublicQrCard({ businessSlug }: DashboardPublicQrCardProps) {
  const [qrDownloadStatus, setQrDownloadStatus] = useState<"idle" | "failed">("idle");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const publicUrl =
    businessSlug && typeof window !== "undefined"
      ? `${window.location.origin}/b/${businessSlug}`
      : null;

  if (!businessSlug || !publicUrl) {
    return null;
  }

  function handleDownloadQr() {
    setQrDownloadStatus("idle");
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setQrDownloadStatus("failed");
      return;
    }
    const downloaded = downloadQrPngFromCanvas(canvas, buildQrDownloadFilename(businessSlug!));
    if (!downloaded) {
      setQrDownloadStatus("failed");
    }
  }

  return (
    <aside
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      data-testid="admin-dashboard-public-qr-card"
    >
      <h3 className="text-base font-semibold text-gray-900">Public page QR</h3>
      <p className="mt-1 text-sm text-gray-500">Scan to view your business page</p>
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
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
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <span aria-hidden="true">⇩</span>
          Download QR
        </button>
        {qrDownloadStatus === "failed" ? (
          <p className="text-center text-xs text-amber-700" role="status">
            QR download failed. You can still use the public link.
          </p>
        ) : null}
      </div>
      <div className="sr-only" aria-hidden="true">
        <QRCodeCanvas ref={qrCanvasRef} value={publicUrl} size={QR_CODE_SIZE} />
      </div>
    </aside>
  );
}
