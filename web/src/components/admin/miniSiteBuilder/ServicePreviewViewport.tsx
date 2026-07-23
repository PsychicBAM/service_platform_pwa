import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MiniSiteLivePreview } from "@/components/admin/MiniSiteLivePreview";
import type { PublicService } from "@/types/api";
import type { MiniSiteConfig } from "@/types/miniSite";

export type ServicePreviewDevice = "desktop" | "tablet" | "mobile";

type ServicePreviewViewportProps = {
  config: MiniSiteConfig;
  businessName?: string;
  previewBadge?: string;
  services?: PublicService[];
};

const SIDE_PANEL_WIDTH: Record<"tablet" | "mobile", number> = {
  tablet: 768,
  mobile: 390,
};

const DESKTOP_MODAL_WIDTH = 1120;
const PREVIEW_MAX_HEIGHT = 700;
const MIN_SCALE = 0.55;

function SidePanelFrame({
  device,
  config,
  businessName,
  services,
}: {
  device: "tablet" | "mobile";
  config: MiniSiteConfig;
  businessName?: string;
  services?: PublicService[];
}) {
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const frameWidth = SIDE_PANEL_WIDTH[device];

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const updateScale = () => {
      const available = Math.max(0, node.clientWidth - 16);
      if (available <= 0) {
        setScale(1);
        return;
      }
      setScale(Math.min(1, Math.max(MIN_SCALE, available / frameWidth)));
    };
    updateScale();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, [frameWidth, device]);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const measure = () => setContentHeight(node.scrollHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [device, config, services, businessName]);

  const usesScale = scale < 0.999;
  const scaledOuterWidth = Math.round(frameWidth * scale);
  const scaledOuterHeight =
    contentHeight > 0 ? Math.round(contentHeight * scale) : undefined;

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-xl border border-slate-200 bg-slate-100/70 shadow-inner"
      style={{ maxHeight: PREVIEW_MAX_HEIGHT }}
      data-testid="service-preview-scroll"
      data-max-height={PREVIEW_MAX_HEIGHT}
      data-scaled={usesScale ? "true" : "false"}
    >
      <div
        className={`flex justify-center p-2 ${
          device === "mobile" ? "bg-gradient-to-b from-slate-200 to-slate-300/80" : ""
        }`}
      >
        <div
          className={
            device === "mobile"
              ? "overflow-hidden rounded-[1.5rem] border-[8px] border-slate-900 bg-white shadow-xl"
              : "overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm"
          }
          style={{
            width: scaledOuterWidth,
            minWidth: scaledOuterWidth,
            height: scaledOuterHeight,
            flexShrink: 0,
          }}
          data-testid="service-preview-frame"
          data-frame-width={frameWidth}
          data-device-mode={device}
          data-scale={scale.toFixed(2)}
        >
          <div
            ref={innerRef}
            style={{
              width: frameWidth,
              transform: usesScale ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          >
            <MiniSiteLivePreview
              config={config}
              businessName={businessName}
              services={services}
              previewDevice={device}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPreviewModal({
  open,
  onClose,
  config,
  businessName,
  services,
}: {
  open: boolean;
  onClose: () => void;
  config: MiniSiteConfig;
  businessName?: string;
  services?: PublicService[];
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      data-testid="service-desktop-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[min(1180px,95vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ height: "min(760px, 90vh)" }}
        data-testid="service-desktop-preview-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p
              id={titleId}
              className="text-sm font-semibold text-slate-900"
              data-testid="service-desktop-preview-title"
            >
              Desktop preview
            </p>
            <p className="text-xs text-slate-500">
              Full-width Service layout · scrolls inside this window
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            data-testid="service-desktop-preview-close"
          >
            Close
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto bg-slate-100"
          data-testid="service-desktop-preview-scroll"
        >
          <div
            className="mx-auto min-h-full bg-white shadow-sm"
            style={{ width: DESKTOP_MODAL_WIDTH, maxWidth: "100%" }}
            data-testid="service-desktop-preview-frame"
            data-frame-width={DESKTOP_MODAL_WIDTH}
            data-device-mode="desktop"
          >
            <MiniSiteLivePreview
              config={config}
              businessName={businessName}
              services={services}
              previewDevice="desktop"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ServicePreviewViewport({
  config,
  businessName,
  previewBadge,
  services,
}: ServicePreviewViewportProps) {
  const [device, setDevice] = useState<"tablet" | "mobile">("mobile");
  const [desktopModalOpen, setDesktopModalOpen] = useState(false);

  function selectDevice(next: ServicePreviewDevice) {
    if (next === "desktop") {
      setDesktopModalOpen(true);
      return;
    }
    setDevice(next);
  }

  return (
    <>
      <aside
        className="sticky top-4 w-full min-w-0 max-w-full space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
        data-testid="service-preview-viewport"
        data-device={device}
        data-preview-max-height={PREVIEW_MAX_HEIGHT}
        data-side-panel-mode={device}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {previewBadge ?? "Live preview"}
          </p>
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
            data-testid="service-preview-device-toggle"
            role="tablist"
            aria-label="Preview device"
          >
            {(["mobile", "tablet", "desktop"] as const).map((entry) => {
              const selected =
                entry === "desktop" ? desktopModalOpen : !desktopModalOpen && device === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`service-preview-device-${entry}`}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => selectDevice(entry)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold capitalize ${
                    selected
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {entry}
                </button>
              );
            })}
          </div>
        </div>

        <SidePanelFrame
          device={device}
          config={config}
          businessName={businessName}
          services={services}
        />

        <div
          className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5"
          data-testid="service-desktop-preview-hint"
        >
          <p className="text-[11px] font-medium text-slate-700">
            Desktop preview opens in a larger view
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
            The side panel stays phone/tablet sized so the editor remains readable.
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
            data-testid="service-desktop-preview-open"
            onClick={() => setDesktopModalOpen(true)}
          >
            Open desktop preview
          </button>
        </div>
      </aside>

      <DesktopPreviewModal
        open={desktopModalOpen}
        onClose={() => setDesktopModalOpen(false)}
        config={config}
        businessName={businessName}
        services={services}
      />
    </>
  );
}
