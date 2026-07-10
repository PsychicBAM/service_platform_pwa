import { MiniSiteSlotImage } from "@/components/public/MiniSiteSlotImage";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import type { MiniSiteImageMedia } from "@/lib/miniSiteMedia";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";

export type MiniSiteMediaTone =
  | "clean"
  | "service"
  | "expert"
  | "clinic"
  | "portfolio"
  | "teacher"
  | "coach";

type ShellVariant = "full" | "preview";

function heroShellClass(tone: MiniSiteMediaTone, isPreview: boolean): string {
  const base = "overflow-hidden";
  switch (tone) {
    case "clean":
      return `${base} rounded-2xl ring-1 ring-slate-200/80 shadow-md ${isPreview ? "shadow-sm" : "shadow-lg"}`;
    case "service":
      return `${base} rounded-xl shadow-lg ring-1 ring-slate-900/10`;
    case "expert":
      return `${base} rounded-[1.25rem] shadow-xl ring-1 ring-slate-200/80`;
    case "clinic":
      return `${base} rounded-2xl shadow-sm ring-1 ring-slate-200/70`;
    case "portfolio":
      return `${base} rounded-sm border-2 border-slate-900/10 shadow-xl`;
    case "teacher":
      return `${base} rounded-2xl shadow-md ring-1 ring-amber-200/60`;
    case "coach":
      return `${base} rounded-2xl shadow-lg ring-1 ring-slate-200/70`;
    default:
      return `${base} rounded-xl ring-1 ring-slate-200/70 shadow-sm`;
  }
}

function heroImageClass(tone: MiniSiteMediaTone, isPreview: boolean): string {
  const height = isPreview ? "h-20" : "h-32 md:h-40 lg:h-44";
  const width =
    tone === "expert"
      ? "w-full max-w-xs"
      : tone === "portfolio"
        ? "w-full"
        : "w-full max-w-md";
  const shape = tone === "expert" ? "aspect-[4/5] max-h-none" : "aspect-[16/10]";
  return `${width} ${tone === "expert" ? shape : height} object-cover`;
}

function videoShellClass(tone: MiniSiteMediaTone): string {
  const base = "overflow-hidden bg-black/[0.03]";
  switch (tone) {
    case "clean":
      return `${base} rounded-2xl border border-slate-200/70 shadow-sm`;
    case "service":
      return `${base} rounded-xl border border-slate-200/80 shadow-md`;
    case "expert":
      return `${base} rounded-[1.25rem] border border-slate-200/80 shadow-lg`;
    case "clinic":
      return `${base} rounded-2xl border border-slate-200/70 shadow-sm`;
    case "portfolio":
      return `${base} rounded-sm border-2 border-slate-900/15 shadow-xl`;
    case "teacher":
      return `${base} rounded-2xl border border-amber-200/50 shadow-md`;
    case "coach":
      return `${base} rounded-2xl border border-slate-200/70 shadow-md`;
    default:
      return `${base} rounded-xl border border-slate-200/70`;
  }
}

function videoLabelClass(tone: MiniSiteMediaTone): string {
  switch (tone) {
    case "portfolio":
      return "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600";
    case "expert":
      return "text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500";
    case "clinic":
      return "text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500";
    default:
      return "text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500";
  }
}

export type MiniSiteHeroMediaCardProps = {
  media: MiniSiteImageMedia;
  testId: string;
  tone: MiniSiteMediaTone;
  variant?: ShellVariant;
  className?: string;
  align?: "start" | "center";
};

export function MiniSiteHeroMediaCard({
  media,
  testId,
  tone,
  variant = "full",
  className = "",
  align = "center",
}: MiniSiteHeroMediaCardProps) {
  const isPreview = variant === "preview";

  return (
    <div
      className={`${align === "center" ? "mx-auto" : ""} ${heroShellClass(tone, isPreview)} ${className}`.trim()}
    >
      <MiniSiteSlotImage media={media} className={heroImageClass(tone, isPreview)} testId={testId} />
    </div>
  );
}

export type MiniSiteProfileMediaCardProps = {
  media: MiniSiteImageMedia;
  testId: string;
  variant?: ShellVariant;
  className?: string;
};

export function MiniSiteProfileMediaCard({
  media,
  testId,
  variant = "full",
  className = "",
}: MiniSiteProfileMediaCardProps) {
  const isPreview = variant === "preview";

  return (
    <div
      className={`overflow-hidden rounded-full ring-2 ring-white/80 shadow-lg ${className}`.trim()}
    >
      <MiniSiteSlotImage
        media={media}
        className={`object-cover ${isPreview ? "h-16 w-16" : "h-24 w-24 md:h-28 md:w-28"}`}
        testId={testId}
      />
    </div>
  );
}

export type MiniSiteTemplateVideoCardProps = {
  media: MiniSiteVideoMedia;
  testId: string;
  tone: MiniSiteMediaTone;
  variant?: ShellVariant;
  label?: string;
  className?: string;
  maxWidthClass?: string;
};

export function MiniSiteTemplateVideoCard({
  media,
  testId,
  tone,
  variant = "full",
  label,
  className = "",
  maxWidthClass = "max-w-xl",
}: MiniSiteTemplateVideoCardProps) {
  const isPreview = variant === "preview";

  return (
    <div className={`${maxWidthClass} ${className}`.trim()}>
      {label ? (
        <p className={`${videoLabelClass(tone)} ${isPreview ? "mb-1" : "mb-2"}`}>{label}</p>
      ) : null}
      <MiniSiteVideoEmbed
        media={media}
        variant={variant}
        testId={testId}
        className={videoShellClass(tone)}
      />
    </div>
  );
}
