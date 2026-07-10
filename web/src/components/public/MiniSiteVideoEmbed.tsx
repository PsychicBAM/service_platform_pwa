import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";
import { isAllowedMiniSiteVideoEmbedUrl } from "@/lib/miniSiteVideo";

type MiniSiteVideoEmbedProps = {
  media: MiniSiteVideoMedia;
  variant?: "full" | "preview";
  testId?: string;
  className?: string;
  title?: string;
};

export function MiniSiteVideoEmbed({
  media,
  variant = "full",
  testId,
  className = "",
  title,
}: MiniSiteVideoEmbedProps) {
  if (!media.embedUrl || !isAllowedMiniSiteVideoEmbedUrl(media.embedUrl)) {
    return null;
  }

  const isPreview = variant === "preview";
  const iframeTitle = title || media.title || "Embedded video";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200/70 bg-black/5 ${className}`.trim()}
      data-testid={testId}
    >
      <div className={`relative w-full ${isPreview ? "aspect-video" : "aspect-video"}`}>
        <iframe
          src={media.embedUrl}
          title={iframeTitle}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
