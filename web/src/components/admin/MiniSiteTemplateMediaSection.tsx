import { useRef, useState } from "react";
import { removeMiniSiteMedia, uploadMiniSiteMedia } from "@/api/miniSiteMediaApi";
import { getMiniSiteTemplateEditorDefinition } from "@/lib/miniSiteTemplateEditorRegistry";
import {
  isAllowedMiniSiteImageFile,
  MINI_SITE_IMAGE_ACCEPT,
  MINI_SITE_IMAGE_INVALID_TYPE_MESSAGE,
  MINI_SITE_IMAGE_TOO_LARGE_MESSAGE,
  MINI_SITE_IMAGE_UPLOAD_HINT,
  MINI_SITE_IMAGE_MAX_BYTES,
  normalizeMiniSiteImageMedia,
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

const BTN =
  "inline-flex h-6 shrink-0 items-center rounded border px-1.5 text-[10px] font-medium leading-none disabled:cursor-not-allowed disabled:opacity-60";
const INPUT =
  "h-6 min-w-0 w-full rounded border border-slate-300 px-1.5 text-[10px] leading-none disabled:opacity-60";
const TILE =
  "flex min-w-0 flex-col gap-1 rounded border border-slate-200 bg-white p-2 shadow-sm";
const SLOT_GRID = "grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

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

function imageStatusText(media: MiniSiteImageMedia | null): string {
  if (!media) {
    return "No file";
  }
  const filename = media.filename?.trim();
  return filename || "Image added";
}

function videoStatusText(media: MiniSiteVideoMedia | null): string {
  if (!media) {
    return "No video";
  }
  if (media.provider === "youtube") {
    return "YouTube link added";
  }
  if (media.provider === "vimeo") {
    return "Vimeo link added";
  }
  return "Video link added";
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
  const [editingVideoSlots, setEditingVideoSlots] = useState<Record<string, boolean>>({});

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

  function openVideoEditor(slotId: string) {
    const existing = getVideoSlotMedia(templateMedia, template, slotId);
    setVideoDrafts((current) => ({
      ...current,
      [slotId]: current[slotId] ?? existing?.url ?? "",
    }));
    setEditingVideoSlots((current) => ({ ...current, [slotId]: true }));
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  function closeVideoEditor(slotId: string) {
    setEditingVideoSlots((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setVideoDrafts((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
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
      closeVideoEditor(slotId);
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
    closeVideoEditor(slotId);
  }

  function handleVideoRemove(slotId: string) {
    if (disabled) {
      return;
    }
    onTemplateMediaChange(updateTemplateMediaSlot(templateMedia, template, slotId, null));
    closeVideoEditor(slotId);
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  return (
    <section className="space-y-2" data-testid="mini-site-template-media-section">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Media</h4>
        <p className="text-[10px] leading-tight text-slate-500" data-testid="mini-site-template-media-helper">
          Upload images directly. Add YouTube or Vimeo links for videos. {MINI_SITE_IMAGE_UPLOAD_HINT}.
        </p>
      </div>

      {definition.imageMediaSlots.length > 0 ? (
        <div className={SLOT_GRID}>
          {definition.imageMediaSlots.map((slot) => {
            const media = getImageSlotMedia(templateMedia, template, slot.id);
            const isUploading = uploadingSlot === slot.id;
            const error = slotErrors[slot.id];

            return (
              <div key={slot.id} className={TILE} data-testid={`mini-site-media-slot-${slot.id}`}>
                <p className="truncate text-[11px] font-medium leading-tight text-slate-800">{slot.label}</p>
                <p className="line-clamp-1 text-[10px] leading-tight text-slate-500" title={slot.description}>
                  {slot.description}
                </p>
                <p
                  className="truncate text-[10px] leading-tight text-slate-600"
                  data-testid={media ? `mini-site-media-preview-${slot.id}` : undefined}
                >
                  {imageStatusText(media)}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => fileInputRefs.current[slot.id]?.click()}
                    className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                    data-testid={`mini-site-media-upload-${slot.id}`}
                  >
                    {isUploading ? "…" : media ? "Replace" : "Upload"}
                  </button>
                  {media ? (
                    <button
                      type="button"
                      disabled={disabled || isUploading}
                      onClick={() => void handleImageRemove(slot.id)}
                      className={`${BTN} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
                      data-testid={`mini-site-media-remove-${slot.id}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  id={`mini-site-media-alt-${slot.id}`}
                  type="text"
                  value={media?.alt ?? ""}
                  disabled={disabled || !media}
                  placeholder="Alt text"
                  aria-label={`Alt text for ${slot.label}`}
                  onChange={(event) =>
                    onTemplateMediaChange(
                      updateTemplateMediaAlt(templateMedia, template, slot.id, event.target.value),
                    )
                  }
                  className={INPUT}
                  data-testid={`mini-site-media-alt-${slot.id}`}
                />
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
                {error ? (
                  <p className="truncate text-[10px] leading-tight text-rose-600" data-testid={`mini-site-media-error-${slot.id}`}>
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {definition.videoMediaSlots.length > 0 ? (
        <div className={`${SLOT_GRID} ${definition.imageMediaSlots.length > 0 ? "mt-2" : ""}`}>
          {definition.videoMediaSlots.map((slot) => {
            const media = getVideoSlotMedia(templateMedia, template, slot.id);
            const isEditing = editingVideoSlots[slot.id] ?? false;
            const draft = videoDrafts[slot.id] ?? media?.url ?? "";
            const error = slotErrors[slot.id];

            return (
              <div key={slot.id} className={TILE} data-testid={`mini-site-media-slot-${slot.id}`}>
                <p className="truncate text-[11px] font-medium leading-tight text-slate-800">{slot.label}</p>
                <p className="line-clamp-1 text-[10px] leading-tight text-slate-500" title={slot.description}>
                  {slot.description}
                </p>
                <p
                  className="truncate text-[10px] leading-tight text-slate-600"
                  data-testid={media ? `mini-site-media-preview-${slot.id}` : undefined}
                >
                  {videoStatusText(media)}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => openVideoEditor(slot.id)}
                    className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                    data-testid={`mini-site-media-edit-${slot.id}`}
                  >
                    {media ? "Edit link" : "Add link"}
                  </button>
                  {media ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleVideoRemove(slot.id)}
                      className={`${BTN} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
                      data-testid={`mini-site-media-remove-${slot.id}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {isEditing ? (
                  <input
                    id={`mini-site-media-video-${slot.id}`}
                    type="url"
                    value={draft}
                    disabled={disabled}
                    placeholder="https://www.youtube.com/watch?v=..."
                    aria-label={`Video link for ${slot.label}`}
                    onChange={(event) => handleVideoDraftChange(slot.id, event.target.value)}
                    onBlur={() => commitVideoUrl(slot.id)}
                    className={INPUT}
                    data-testid={`mini-site-media-video-input-${slot.id}`}
                  />
                ) : null}
                {error ? (
                  <p className="truncate text-[10px] leading-tight text-rose-600" data-testid={`mini-site-media-error-${slot.id}`}>
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
