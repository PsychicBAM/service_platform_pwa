import { useRef, useState } from "react";
import {
  removeMarketplaceCoverImage,
  uploadMarketplaceCoverImage,
} from "@/api/marketplaceCoverImageApi";
import { useAdminSectionFocus } from "@/hooks/useAdminSectionFocus";
import { ADMIN_ONBOARDING_FOCUS } from "@/lib/adminFocus";
import {
  isAllowedServiceImageFile,
  normalizeServiceImageMedia,
  SERVICE_IMAGE_ACCEPT,
  SERVICE_IMAGE_INVALID_TYPE_MESSAGE,
  SERVICE_IMAGE_TOO_LARGE_MESSAGE,
  SERVICE_IMAGE_MAX_BYTES,
  SERVICE_IMAGE_UPLOAD_HINT,
  type ServiceImageMedia,
} from "@/lib/serviceImage";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type AdminMarketplaceCoverSectionProps = {
  businessId: string;
  image: ServiceImageMedia | null;
  disabled?: boolean;
  onImageChange: (image: ServiceImageMedia | null) => void;
};

function marketplaceCoverDisplayFilename(image: ServiceImageMedia): string {
  const filename = image.filename.trim();
  if (filename) {
    return filename;
  }

  const basename = image.url.split("?")[0]?.split("/").pop();
  return basename || "marketplace-cover.webp";
}

export function AdminMarketplaceCoverSection({
  businessId,
  image,
  disabled = false,
  onImageChange,
}: AdminMarketplaceCoverSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const focus = useAdminSectionFocus(ADMIN_ONBOARDING_FOCUS.marketplaceCover);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedImage = normalizeServiceImageMedia(image);
  const canPickFile = !disabled && !uploading && !removing;

  async function handleFileSelected(file: File | undefined) {
    if (!file || !canPickFile) {
      return;
    }

    if (!isAllowedServiceImageFile(file)) {
      setError(SERVICE_IMAGE_INVALID_TYPE_MESSAGE);
      return;
    }

    if (file.size > SERVICE_IMAGE_MAX_BYTES) {
      setError(SERVICE_IMAGE_TOO_LARGE_MESSAGE);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await uploadMarketplaceCoverImage(businessId, file);
      onImageChange(response.image);
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not upload marketplace cover image."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    if (!normalizedImage || disabled || uploading || removing) {
      return;
    }

    setRemoving(true);
    setError(null);

    try {
      await removeMarketplaceCoverImage(businessId);
      onImageChange(null);
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not remove marketplace cover image."));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      ref={focus.ref}
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 ${focus.highlightClassName}`.trim()}
      data-testid="admin-marketplace-cover-section"
      data-admin-focused={focus.highlighted ? "true" : undefined}
    >
      <div>
        <p className="text-sm font-medium text-slate-900">Marketplace cover image</p>
        <p className="mt-1 text-xs text-slate-600">
          Used on the marketplace, homepage featured cards, and public discovery surfaces.
        </p>
        <p className="mt-1 text-xs text-slate-500">{SERVICE_IMAGE_UPLOAD_HINT}</p>
      </div>

      <div
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        data-testid="admin-marketplace-cover-status"
      >
        {normalizedImage ? (
          <p className="text-xs text-slate-700">
            Current file:{" "}
            <span
              className="font-medium text-slate-900"
              data-testid="admin-marketplace-cover-filename"
            >
              {marketplaceCoverDisplayFilename(normalizedImage)}
            </span>
          </p>
        ) : (
          <p className="text-xs text-slate-600" data-testid="admin-marketplace-cover-empty">
            No marketplace cover image uploaded.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canPickFile}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="admin-marketplace-cover-upload"
        >
          {uploading ? "Uploading…" : normalizedImage ? "Replace" : "Upload"}
        </button>
        {normalizedImage ? (
          <button
            type="button"
            disabled={disabled || uploading || removing}
            onClick={() => void handleRemove()}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="admin-marketplace-cover-remove"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={SERVICE_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFileSelected(event.target.files?.[0])}
      />

      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
