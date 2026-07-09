import { useRef, useState } from "react";
import { removeMiniSiteMedia, uploadMiniSiteMedia } from "@/api/miniSiteMediaApi";
import {
  getMiniSiteTemplateEditorDefinition,
} from "@/lib/miniSiteTemplateEditorRegistry";
import {
  isAllowedMiniSiteImageFile,
  normalizeMiniSiteImageMedia,
  resolveMiniSiteMediaUrl,
  updateTemplateMediaAlt,
  updateTemplateMediaSlot,
  type MiniSiteImageMedia,
} from "@/lib/miniSiteMedia";
import type { MiniSiteTemplate, MiniSiteTemplateFoundationMap } from "@/types/miniSite";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type MiniSiteTemplateMediaSectionProps = {
  businessId: string;
  template: MiniSiteTemplate;
  templateMedia: MiniSiteTemplateFoundationMap;
  disabled?: boolean;
  onTemplateMediaChange: (templateMedia: MiniSiteTemplateFoundationMap) => void;
};

function getSlotMedia(
  templateMedia: MiniSiteTemplateFoundationMap,
  template: MiniSiteTemplate,
  slotId: string,
): MiniSiteImageMedia | null {
  return normalizeMiniSiteImageMedia(templateMedia[template]?.[slotId]);
}

export function MiniSiteTemplateMediaSection({
  businessId,
  template,
  templateMedia,
  disabled = false,
  onTemplateMediaChange,
}: MiniSiteTemplateMediaSectionProps) {
  const definition = getMiniSiteTemplateEditorDefinition(template);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});

  async function handleFileSelected(slotId: string, file: File | undefined) {
    if (!file || disabled) {
      return;
    }

    if (!isAllowedMiniSiteImageFile(file)) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: "Only JPEG, PNG, and WebP images up to 5 MB are supported.",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: "Image must be 5 MB or smaller.",
      }));
      return;
    }

    setUploadingSlot(slotId);
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });

    try {
      const existing = getSlotMedia(templateMedia, template, slotId);
      const response = await uploadMiniSiteMedia(businessId, file, {
        template,
        slot: slotId,
        alt: existing?.alt,
      });
      onTemplateMediaChange(
        updateTemplateMediaSlot(templateMedia, template, slotId, response.media),
      );
    } catch (error) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: getAdminSettingsErrorMessage(error),
      }));
    } finally {
      setUploadingSlot(null);
      const input = fileInputRefs.current[slotId];
      if (input) {
        input.value = "";
      }
    }
  }

  async function handleRemove(slotId: string) {
    if (disabled) {
      return;
    }

    setUploadingSlot(slotId);
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });

    try {
      await removeMiniSiteMedia(businessId, { template, slot: slotId });
      onTemplateMediaChange(updateTemplateMediaSlot(templateMedia, template, slotId, null));
    } catch (error) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: getAdminSettingsErrorMessage(error),
      }));
    } finally {
      setUploadingSlot(null);
    }
  }

  return (
    <section className="space-y-3" data-testid="mini-site-template-media-section">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Media</h4>
        <p className="text-xs text-slate-500" data-testid="mini-site-template-media-scope">
          Images for {definition.label}.
        </p>
      </div>

      <div className="space-y-3">
        {definition.imageMediaSlots.map((slot) => {
          const media = getSlotMedia(templateMedia, template, slot.id);
          const isUploading = uploadingSlot === slot.id;
          const error = slotErrors[slot.id];

          return (
            <div
              key={slot.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              data-testid={`mini-site-media-slot-${slot.id}`}
            >
              <p className="text-sm font-medium text-slate-800">{slot.label}</p>

              {media ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={resolveMiniSiteMediaUrl(media.url)}
                    alt={media.alt || slot.label}
                    className="h-28 w-full object-cover"
                    data-testid={`mini-site-media-preview-${slot.id}`}
                  />
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => fileInputRefs.current[slot.id]?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid={`mini-site-media-upload-${slot.id}`}
                >
                  {isUploading ? "Uploading…" : media ? "Replace image" : "Upload image"}
                </button>
                {media ? (
                  <button
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => void handleRemove(slot.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid={`mini-site-media-remove-${slot.id}`}
                  >
                    Remove image
                  </button>
                ) : null}
              </div>

              <input
                ref={(element) => {
                  fileInputRefs.current[slot.id] = element;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={disabled || isUploading}
                data-testid={`mini-site-media-file-${slot.id}`}
                onChange={(event) => void handleFileSelected(slot.id, event.target.files?.[0])}
              />

              <label htmlFor={`mini-site-media-alt-${slot.id}`} className="mt-2 block text-xs font-medium text-slate-600">
                Alt text
              </label>
              <input
                id={`mini-site-media-alt-${slot.id}`}
                type="text"
                value={media?.alt ?? ""}
                disabled={disabled || !media}
                placeholder="Describe this image"
                onChange={(event) =>
                  onTemplateMediaChange(
                    updateTemplateMediaAlt(templateMedia, template, slot.id, event.target.value),
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid={`mini-site-media-alt-${slot.id}`}
              />

              {error ? (
                <p className="mt-2 text-xs text-rose-600" data-testid={`mini-site-media-error-${slot.id}`}>
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
