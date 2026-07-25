import { useRef, useState } from "react";
import { removeMiniSiteMedia, uploadMiniSiteMedia } from "@/api/miniSiteMediaApi";
import {
  isAllowedMiniSiteImageFile,
  MINI_SITE_IMAGE_ACCEPT,
  MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE,
  MINI_SITE_IMAGE_MAX_BYTES,
  MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
  MINI_SITE_IMAGE_UPLOAD_HINT,
} from "@/lib/miniSiteMedia";
import type { MiniSiteTemplate } from "@/types/miniSite";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

export type MiniSiteCompactImageUploadProps = {
  businessId: string;
  template: MiniSiteTemplate;
  slot: string;
  label: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
  testId?: string;
};

const BTN =
  "inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-medium leading-none disabled:cursor-not-allowed disabled:opacity-60";

export function MiniSiteCompactImageUpload({
  businessId,
  template,
  slot,
  label,
  imageUrl,
  onImageUrlChange,
  disabled = false,
  testId,
}: MiniSiteCompactImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasImage = Boolean(imageUrl.trim());

  async function handleFileSelected(file: File | undefined) {
    if (!file || disabled || busy) return;

    if (!isAllowedMiniSiteImageFile(file)) {
      setError(MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE);
      return;
    }
    if (file.size > MINI_SITE_IMAGE_MAX_BYTES) {
      setError(MINI_SITE_IMAGE_TOO_LARGE_MESSAGE);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await uploadMiniSiteMedia(businessId, file, { template, slot });
      onImageUrlChange(response.media.url);
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeMiniSiteMedia(businessId, { template, slot });
      onImageUrlChange("");
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-2"
      data-testid={testId}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
          {hasImage ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-800">{label}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{MINI_SITE_IMAGE_UPLOAD_HINT}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              disabled={disabled || busy}
              data-testid={testId ? `${testId}-upload` : undefined}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : hasImage ? "Replace" : "Upload"}
            </button>
            {hasImage ? (
              <button
                type="button"
                className={`${BTN} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                disabled={disabled || busy}
                data-testid={testId ? `${testId}-remove` : undefined}
                onClick={() => void handleRemove()}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={MINI_SITE_IMAGE_ACCEPT}
          className="sr-only"
          disabled={disabled || busy}
          data-testid={testId ? `${testId}-input` : undefined}
          onChange={(event) => void handleFileSelected(event.target.files?.[0])}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600" role="alert" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
