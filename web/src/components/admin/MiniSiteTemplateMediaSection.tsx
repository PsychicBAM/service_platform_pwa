import { useRef, useState } from "react";
import { removeMiniSiteMedia, uploadMiniSiteMedia } from "@/api/miniSiteMediaApi";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import {
  getMiniSiteTemplateEditorDefinition,
} from "@/lib/miniSiteTemplateEditorRegistry";
import {
  isAllowedMiniSiteImageFile,
  MINI_SITE_IMAGE_ACCEPT,
  MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE,
  MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
  MINI_SITE_IMAGE_UPLOAD_HINT,
  MINI_SITE_IMAGE_MAX_BYTES,
  normalizeMiniSiteImageMedia,
  resolveMiniSiteMediaEditorPreviewUrl,
  updateTemplateMediaAlt,
  updateTemplateMediaSlot,
  type MiniSiteImageMedia,
  type MiniSiteTemplateMediaMap,
} from "@/lib/miniSiteMedia";
import {
  buildMiniSiteVideoMediaFromUrl,
  MINI_SITE_VIDEO_INVALID_URL_MESSAGE,
  normalizeMiniSiteVideoMedia,
  type MiniSiteVideoMedia,
} from "@/lib/miniSiteVideo";
import type { MiniSiteTemplate } from "@/types/miniSite";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type MiniSiteTemplateMediaSectionProps = {
  businessId: string;
  template: MiniSiteTemplate;
  templateMedia: MiniSiteTemplateMediaMap;
  disabled?: boolean;
  onTemplateMediaChange: (templateMedia: MiniSiteTemplateMediaMap) => void;
};

function getImageSlotMedia(
  templateMedia: MiniSiteTemplateMediaMap,
  template: MiniSiteTemplate,
  slotId: string,
): MiniSiteImageMedia | null {
  return normalizeMiniSiteImageMedia(templateMedia[template]?.[slotId]);
}

function getVideoSlotMedia(
  templateMedia: MiniSiteTemplateMediaMap,
  template: MiniSiteTemplate,
  slotId: string,
): MiniSiteVideoMedia | null {
  return normalizeMiniSiteVideoMedia(templateMedia[template]?.[slotId]);
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
  const [videoDrafts, setVideoDrafts] = useState<Record<string, string>>({});

  async function handleFileSelected(slotId: string, file: File | undefined) {
    if (!file || disabled) {
      return;
    }

    if (!isAllowedMiniSiteImageFile(file)) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE,
      }));
      return;
    }

    if (file.size > MINI_SITE_IMAGE_MAX_BYTES) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
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
      const existing = getImageSlotMedia(templateMedia, template, slotId);
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

  async function handleImageRemove(slotId: string) {
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

  function handleVideoDraftChange(slotId: string, value: string) {
    setVideoDrafts((current) => ({ ...current, [slotId]: value }));
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  function commitVideoUrl(slotId: string) {
    if (disabled) {
      return;
    }

    const existing = getVideoSlotMedia(templateMedia, template, slotId);
    const draft = videoDrafts[slotId] ?? existing?.url ?? "";
    const trimmed = draft.trim();

    if (!trimmed) {
      onTemplateMediaChange(updateTemplateMediaSlot(templateMedia, template, slotId, null));
      setVideoDrafts((current) => {
        const next = { ...current };
        delete next[slotId];
        return next;
      });
      return;
    }

    const media = buildMiniSiteVideoMediaFromUrl(trimmed, existing?.title ?? "");
    if (!media) {
      setSlotErrors((current) => ({
        ...current,
        [slotId]: MINI_SITE_VIDEO_INVALID_URL_MESSAGE,
      }));
      return;
    }

    onTemplateMediaChange(updateTemplateMediaSlot(templateMedia, template, slotId, media));
    setVideoDrafts((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  function handleVideoRemove(slotId: string) {
    if (disabled) {
      return;
    }
    onTemplateMediaChange(updateTemplateMediaSlot(templateMedia, template, slotId, null));
    setVideoDrafts((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  return (
    <section className="space-y-3" data-testid="mini-site-template-media-section">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Media</h4>
        <p className="text-xs text-slate-500" data-testid="mini-site-template-media-helper">
          Upload images directly. Add YouTube or Vimeo links for videos. {MINI_SITE_IMAGE_UPLOAD_HINT}.
          Media is shown only on the selected template.
        </p>
      </div>

      <div className="space-y-3">
        {definition.imageMediaSlots.map((slot) => {
          const media = getImageSlotMedia(templateMedia, template, slot.id);
          const isUploading = uploadingSlot === slot.id;
          const error = slotErrors[slot.id];

          return (
            <div
              key={slot.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              data-testid={`mini-site-media-slot-${slot.id}`}
            >
              <p className="text-sm font-medium text-slate-800">{slot.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{slot.description}</p>
              <p className="text-[11px] text-slate-400">{slot.ratioHint}</p>

              {media ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={resolveMiniSiteMediaEditorPreviewUrl(media)}
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
                    onClick={() => void handleImageRemove(slot.id)}
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
                accept={MINI_SITE_IMAGE_ACCEPT}
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
                placeholder="Describe this image for accessibility"
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

        {definition.videoMediaSlots.map((slot) => {
          const media = getVideoSlotMedia(templateMedia, template, slot.id);
          const draft = videoDrafts[slot.id] ?? media?.url ?? "";
          const error = slotErrors[slot.id];

          return (
            <div
              key={slot.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              data-testid={`mini-site-media-slot-${slot.id}`}
            >
              <p className="text-sm font-medium text-slate-800">{slot.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{slot.description}</p>

              <label htmlFor={`mini-site-media-video-${slot.id}`} className="mt-2 block text-xs font-medium text-slate-600">
                Video link
              </label>
              <input
                id={`mini-site-media-video-${slot.id}`}
                type="url"
                value={draft}
                disabled={disabled}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(event) => handleVideoDraftChange(slot.id, event.target.value)}
                onBlur={() => commitVideoUrl(slot.id)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid={`mini-site-media-video-input-${slot.id}`}
              />

              {media ? (
                <div className="mt-2">
                  <MiniSiteVideoEmbed
                    media={media}
                    variant="preview"
                    testId={`mini-site-media-preview-${slot.id}`}
                  />
                </div>
              ) : null}

              {media ? (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleVideoRemove(slot.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid={`mini-site-media-remove-${slot.id}`}
                  >
                    Remove video
                  </button>
                </div>
              ) : null}

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
