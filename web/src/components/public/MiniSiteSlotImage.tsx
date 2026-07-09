import { resolveMiniSiteMediaUrl, type MiniSiteImageMedia } from "@/lib/miniSiteMedia";

type MiniSiteSlotImageProps = {
  media: MiniSiteImageMedia;
  className?: string;
  testId?: string;
};

export function MiniSiteSlotImage({ media, className = "", testId }: MiniSiteSlotImageProps) {
  return (
    <img
      src={resolveMiniSiteMediaUrl(media.url)}
      alt={media.alt || ""}
      className={`object-cover ${className}`.trim()}
      data-testid={testId}
      loading="lazy"
    />
  );
}
