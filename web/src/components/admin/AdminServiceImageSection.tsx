import { useEffect, useRef, useState } from "react";
import { removeServiceImage, uploadServiceImage } from "@/api/serviceImageApi";
import { ServiceImageDisplay } from "@/components/ServiceImageDisplay";
import {
  isAllowedServiceImageFile,
  normalizeServiceImageMedia,
  SERVICE_IMAGE_ACCEPT,
  SERVICE_IMAGE_INVALID_TYPE_MESSAGE,
  SERVICE_IMAGE_TOO_LARGE_MESSAGE,
  SERVICE_IMAGE_MAX_BYTES,
  SERVICE_IMAGE_UPLOAD_HINT,
  serviceImageStatusText,
  type ServiceImageMedia,
} from "@/lib/serviceImage";
import { getAdminServiceErrorMessage } from "@/utils/errors";

type AdminServiceImageSectionProps = {
  businessId: string;
  serviceId?: string;
  image: ServiceImageMedia | null;
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
  disabled?: boolean;
  onImageChange: (image: ServiceImageMedia | null) => void;
};

export function AdminServiceImageSection({
  businessId,
  serviceId,
  image,
  pendingFile = null,
  onPendingFileChange,
  disabled = false,
  onImageChange,
}: AdminServiceImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const normalizedImage = normalizeServiceImageMedia(image);
  const isCreateMode = !serviceId;
  const canPickFile = !disabled && !uploading && !removing;
  const canUploadSaved = Boolean(serviceId) && canPickFile;

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  async function handleSavedServiceFile(file: File | undefined) {
    if (!file || !serviceId || !canUploadSaved) {
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
      const response = await uploadServiceImage(businessId, serviceId, file);
      onImageChange(response.image);
    } catch (err) {
      setError(getAdminServiceErrorMessage(err, "Could not upload service image."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleCreateModeFile(file: File | undefined) {
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

    setError(null);
    onPendingFileChange?.(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | undefined) {
    if (isCreateMode) {
      handleCreateModeFile(file);
      return;
    }
    void handleSavedServiceFile(file);
  }

  async function handleRemove() {
    if (isCreateMode) {
      onPendingFileChange?.(null);
      setError(null);
      return;
    }

    if (!serviceId || !normalizedImage || disabled || uploading || removing) {
      return;
    }

    setRemoving(true);
    setError(null);

    try {
      await removeServiceImage(businessId, serviceId);
      onImageChange(null);
    } catch (err) {
      setError(getAdminServiceErrorMessage(err, "Could not remove service image."));
    } finally {
      setRemoving(false);
    }
  }

  const statusText = isCreateMode
    ? pendingFile?.name || "No image selected"
    : serviceImageStatusText(normalizedImage);

  const showRemove = isCreateMode ? Boolean(pendingFile) : Boolean(normalizedImage);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
      data-testid="admin-service-image-section"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">Service image</p>
        <p className="text-xs text-slate-500">{SERVICE_IMAGE_UPLOAD_HINT}</p>
      </div>

      <div
        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        data-testid="admin-service-image-status"
      >
        {isCreateMode && pendingPreviewUrl ? (
          <img
            src={pendingPreviewUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
            data-testid="admin-service-image-pending-preview"
          />
        ) : (
          <ServiceImageDisplay
            image={normalizedImage}
            variant="thumb"
            testId="admin-service-image-thumb"
          />
        )}
        <span className="min-w-0 truncate text-xs text-slate-700">{statusText}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isCreateMode ? !canPickFile : !canUploadSaved}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="admin-service-image-upload"
        >
          {uploading
            ? "Uploading…"
            : isCreateMode
              ? pendingFile
                ? "Replace"
                : "Choose image"
              : normalizedImage
                ? "Replace"
                : "Upload"}
        </button>
        {showRemove ? (
          <button
            type="button"
            disabled={disabled || uploading || removing}
            onClick={() => void handleRemove()}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="admin-service-image-remove"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        ) : null}
      </div>

      {isCreateMode ? (
        <p className="text-xs text-slate-600" data-testid="admin-service-image-create-note">
          The image uploads automatically after you create the service.
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={SERVICE_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />

      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
