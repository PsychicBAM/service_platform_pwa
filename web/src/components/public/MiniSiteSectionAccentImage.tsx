import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import type { MiniSiteMediaTone } from "@/components/public/MiniSiteTemplateMediaPresentation";
import type { MiniSiteImageMedia } from "@/lib/miniSiteMedia";

type MiniSiteSectionAccentLayout = "banner" | "inline" | "compact" | "cta";

type MiniSiteSectionAccentImageProps = {
  media: MiniSiteImageMedia;
  variant?: "full" | "preview";
  testId: string;
  className?: string;
  tone?: MiniSiteMediaTone | "default";
  layout?: MiniSiteSectionAccentLayout;
};

function shellClass(
  tone: MiniSiteMediaTone | "default",
  layout: MiniSiteSectionAccentLayout,
  isPreview: boolean,
): string {
  const margin = layout === "inline" || layout === "cta" ? "" : isPreview ? "mb-2" : "mb-4 md:mb-6";
  const base = `overflow-hidden ${margin}`;

  if (tone === "portfolio") {
    return `${base} rounded-sm border-2 border-slate-900/10 bg-white shadow-lg`;
  }
  if (tone === "clinic") {
    return `${base} rounded-2xl border border-slate-200/70 bg-slate-50/90 shadow-sm`;
  }
  if (tone === "clean" || layout === "cta") {
    return `${base} rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm`;
  }
  if (tone === "service") {
    return `${base} rounded-xl border border-slate-200/70 bg-white shadow-md`;
  }
  if (tone === "coach" || tone === "teacher") {
    return `${base} rounded-2xl border border-slate-200/70 bg-white/85 shadow-sm`;
  }
  return `${base} rounded-xl border border-slate-200/70 bg-white/80`;
}

function imageClass(layout: MiniSiteSectionAccentLayout, isPreview: boolean): string {
  switch (layout) {
    case "compact":
      return `w-full ${isPreview ? "h-16" : "h-24 md:h-28"}`;
    case "inline":
      return `w-full ${isPreview ? "h-20" : "h-28 md:h-32"}`;
    case "cta":
      return `w-full ${isPreview ? "h-20" : "h-28 md:h-32"}`;
    case "banner":
    default:
      return `w-full ${isPreview ? "h-24" : "h-36 md:h-44"}`;
  }
}

export function MiniSiteSectionAccentImage({
  media,
  variant = "full",
  testId,
  className = "",
  tone = "default",
  layout = "banner",
}: MiniSiteSectionAccentImageProps) {
  const isPreview = variant === "preview";

  return (
    <div className={`${shellClass(tone, layout, isPreview)} ${className}`.trim()}>
      <MiniSiteSlotImage media={media} className={`object-cover ${imageClass(layout, isPreview)}`} testId={testId} />
    </div>
  );
}
