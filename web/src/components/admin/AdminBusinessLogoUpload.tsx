import { useRef, useState } from "react";
import {
  removeBusinessLogoImage,
  uploadBusinessLogoImage,
} from "@/api/businessLogoImageApi";
import {
  isAllowedServiceImageFile,
  SERVICE_IMAGE_ACCEPT,
  SERVICE_IMAGE_INVALID_TYPE_MESSAGE,
  SERVICE_IMAGE_MAX_BYTES,
  SERVICE_IMAGE_TOO_LARGE_MESSAGE,
  SERVICE_IMAGE_UPLOAD_HINT,
} from "@/lib/serviceImage";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type AdminBusinessLogoUploadProps = {
  businessId: string;
  logoUrl: string;
  disabled?: boolean;
  onLogoUrlChange: (logoUrl: string) => void;
};

export function AdminBusinessLogoUpload({
  businessId,
  logoUrl,
  disabled = false,
  onLogoUrlChange,
}: AdminBusinessLogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasLogo = Boolean(logoUrl.trim());
  const busy = uploading || removing;
  const canPickFile = !disabled && !busy;

  async function handleFileSelected(file: File | undefined) {
    if (!file || !canPickFile) {
      return;
    }

    if (!isAllowedServiceImageFile(file)) {
      setError(SERVICE_IMAGE_INVALID_TYPE_MESSAGE);
      setSuccess(null);
      return;
    }

    if (file.size > SERVICE_IMAGE_MAX_BYTES) {
      setError(SERVICE_IMAGE_TOO_LARGE_MESSAGE);
      setSuccess(null);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await uploadBusinessLogoImage(businessId, file);
      onLogoUrlChange(response.logo_url);
      setSuccess(hasLogo ? "Logo updated." : "Logo uploaded.");
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not upload business logo."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    if (!hasLogo || disabled || busy) {
      return;
    }

    setRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      await removeBusinessLogoImage(businessId);
      onLogoUrlChange("");
      setSuccess("Logo removed.");
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not remove business logo."));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left" data-testid="admin-business-logo-upload">
      <div
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
        data-testid="admin-business-logo-avatar"
      >
        {hasLogo ? (
          <img
            src={logoUrl.trim()}
            alt=""
            className="h-full w-full object-cover"
            data-testid="admin-business-logo-preview"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            data-testid="admin-business-logo-placeholder"
          >
            <path d="M12 3c2.5 3 4 5.5 4 8a4 4 0 1 1-8 0c0-2.5 1.5-5 4-8Z" />
            <path d="M8 19c1.2-1.5 2.5-2 4-2s2.8.5 4 2" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
        <button
          type="button"
          disabled={!canPickFile}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="admin-business-logo-upload-button"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 16V8m0 0 3 3m-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" strokeLinecap="round" />
          </svg>
          {uploading ? "Uploading…" : hasLogo ? "Change logo" : "Upload logo"}
        </button>
        {hasLogo ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void handleRemove()}
            className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="admin-business-logo-remove"
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-gray-500" data-testid="admin-business-logo-hint">
        Circular business logo (not the marketplace cover). {SERVICE_IMAGE_UPLOAD_HINT}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={SERVICE_IMAGE_ACCEPT}
        className="hidden"
        data-testid="admin-business-logo-file-input"
        onChange={(event) => void handleFileSelected(event.target.files?.[0])}
      />

      {error ? (
        <p className="text-xs text-red-600" data-testid="admin-business-logo-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-xs text-emerald-700" data-testid="admin-business-logo-success">
          {success}
        </p>
      ) : null}
    </div>
  );
}
