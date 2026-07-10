import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import type { MiniSiteImageMedia } from "@/lib/miniSiteMedia";

type MiniSiteSectionAccentImageProps = {
  media: MiniSiteImageMedia;
  variant?: "full" | "preview";
  testId: string;
  className?: string;
};

export function MiniSiteSectionAccentImage({
  media,
  variant = "full",
  testId,
  className = "",
}: MiniSiteSectionAccentImageProps) {
  const isPreview = variant === "preview";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200/70 bg-white/80 ${isPreview ? "mb-2" : "mb-4 md:mb-6"} ${className}`.trim()}
    >
      <MiniSiteSlotImage
        media={media}
        className={`w-full ${isPreview ? "h-24" : "h-36 md:h-44"}`}
        testId={testId}
      />
    </div>
  );
}
