import { useRef, useState } from "react";
import { removeMiniSiteMedia, uploadMiniSiteMedia } from "@/api/miniSiteMediaApi";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import { getMiniSiteTemplateEditorDefinition } from "@/lib/miniSiteTemplateEditorRegistry";
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

const BTN =
  "inline-flex h-7 shrink-0 items-center rounded border px-1.5 text-[10px] font-medium leading-none disabled:cursor-not-allowed disabled:opacity-60";
const INPUT =
  "h-7 min-w-0 flex-1 rounded border border-slate-300 px-1.5 text-[10px] leading-none disabled:opacity-60";
const SLOT_ROW =
  "grid gap-1.5 md:grid-cols-[minmax(6.5rem,0.8fr)_minmax(8rem,1.45fr)_auto] md:items-center md:gap-2";
const SLOT_CARD = "rounded border border-slate-200 bg-white p-2 shadow-sm";
const THUMB_BOX = "h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50";
const EMPTY_BOX =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-[8px] text-slate-400";
const VIDEO_BOX = "h-12 w-[5.5rem] shrink-0 overflow-hidden rounded border border-slate-200/70 bg-slate-50";

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
    <section className="space-y-1" data-testid="mini-site-template-media-section">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Media</h4>
        <p className="text-[10px] leading-tight text-slate-500" data-testid="mini-site-template-media-helper">
          Upload images directly. Add YouTube or Vimeo links for videos. {MINI_SITE_IMAGE_UPLOAD_HINT}. Selected
          template only.
        </p>
      </div>

      <div className="space-y-1">
        {definition.imageMediaSlots.map((slot) => {
          const media = getImageSlotMedia(templateMedia, template, slot.id);
          const isUploading = uploadingSlot === slot.id;
          const error = slotErrors[slot.id];

          return (
            <div key={slot.id} className={SLOT_CARD} data-testid={`mini-site-media-slot-${slot.id}`}>
              <div className={SLOT_ROW}>
                <div className="min-w-0 md:py-0">
                  <p className="truncate text-[11px] font-medium leading-tight text-slate-800">{slot.label}</p>
                  <p className="truncate text-[10px] leading-tight text-slate-500" title={slot.description}>
                    {slot.description}
                    <span className="text-slate-400"> · {slot.ratioHint}</span>
                  </p>
                </div>

                <div className="flex min-w-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => fileInputRefs.current[slot.id]?.click()}
                    className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                    data-testid={`mini-site-media-upload-${slot.id}`}
                  >
                    {isUploading ? "…" : media ? "Replace" : "Upload"}
                  </button>
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
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {media ? (
                    <div className={THUMB_BOX} data-testid={`mini-site-media-preview-${slot.id}`}>
                      <img
                        src={resolveMiniSiteMediaEditorPreviewUrl(media)}
                        alt={media.alt || slot.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={EMPTY_BOX} aria-hidden>
                      —
                    </div>
                  )}
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
              </div>
              {error ? (
                <p className="mt-1 truncate text-[10px] leading-tight text-rose-600" data-testid={`mini-site-media-error-${slot.id}`}>
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
            <div key={slot.id} className={SLOT_CARD} data-testid={`mini-site-media-slot-${slot.id}`}>
              <div className={SLOT_ROW}>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium leading-tight text-slate-800">{slot.label}</p>
                  <p className="truncate text-[10px] leading-tight text-slate-500" title={slot.description}>
                    {slot.description}
                  </p>
                </div>

                <div className="min-w-0">
                  <input
                    id={`mini-site-media-video-${slot.id}`}
                    type="url"
                    value={draft}
                    disabled={disabled}
                    placeholder="https://www.youtube.com/watch?v=..."
                    aria-label={`Video link for ${slot.label}`}
                    onChange={(event) => handleVideoDraftChange(slot.id, event.target.value)}
                    onBlur={() => commitVideoUrl(slot.id)}
                    className={`${INPUT} w-full`}
                    data-testid={`mini-site-media-video-input-${slot.id}`}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {media ? (
                    <MiniSiteVideoEmbed
                      media={media}
                      variant="preview"
                      testId={`mini-site-media-preview-${slot.id}`}
                      className={`${VIDEO_BOX} [&>div]:!aspect-auto [&>div]:h-full`}
                    />
                  ) : (
                    <div className={EMPTY_BOX} aria-hidden>
                      —
                    </div>
                  )}
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
              </div>
              {error ? (
                <p className="mt-1 truncate text-[10px] leading-tight text-rose-600" data-testid={`mini-site-media-error-${slot.id}`}>
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
