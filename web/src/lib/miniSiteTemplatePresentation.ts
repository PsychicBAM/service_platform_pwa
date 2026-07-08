import type { CSSProperties } from "react";
import type { MiniSiteBackgroundStyle, MiniSiteButtonStyle, MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteTemplatePresentation = {
  layoutClass: string;
  heroClass: string;
  heroLayoutClass: string;
  sectionClass: string;
  servicesClass: string;
  galleryClass: string;
  heroTitleClass: string;
  sectionHeadingClass: string;
  showBenefitsStrip: boolean;
  showTrustStats: boolean;
  heroAccentClass: string;
  bookingCtaClass: string;
  contactChipClass: string;
  primaryButtonClass: string;
  secondaryButtonClass: string;
};

export type ThemedServiceCardPresentation = {
  cardClass: string;
  titleClass: string;
  descriptionClass: string;
  metaClass: string;
  buttonClass: string;
  iconWrapClass: string;
};

export const MINI_SITE_PREVIEW_VIEWPORT_PX = 380;
export const MINI_SITE_PREVIEW_SCALE = 0.86;

export function getMiniSitePreviewOuterShellClass(): string {
  return "overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-slate-200/80 bg-slate-100/90 shadow-inner [scrollbar-width:thin]";
}

export function getMiniSitePreviewScaledViewportStyle(): {
  outerWidth: number;
  innerWidth: number;
  scale: number;
  maxHeight: string;
} {
  return {
    outerWidth: MINI_SITE_PREVIEW_VIEWPORT_PX * MINI_SITE_PREVIEW_SCALE,
    innerWidth: MINI_SITE_PREVIEW_VIEWPORT_PX,
    scale: MINI_SITE_PREVIEW_SCALE,
    maxHeight: "min(70vh, 640px)",
  };
}

export function getMiniSitePreviewPageShellClass(): string {
  return "relative w-full px-3 py-4";
}

export function getMiniSitePreviewHeroContentClass(template: MiniSiteTemplate): string {
  if (template === "expert") {
    return "flex w-full min-w-0 flex-col items-center gap-4 text-center";
  }
  return "flex w-full min-w-0 flex-col gap-4";
}

export function getMiniSitePreviewHeroTitleClass(template: MiniSiteTemplate): string {
  switch (template) {
    case "portfolio":
      return "text-xl font-black uppercase leading-tight tracking-wide";
    case "clinic":
      return "text-xl font-semibold leading-tight text-emerald-950";
    case "expert":
      return "text-xl font-bold leading-tight tracking-tight";
    case "service":
      return "text-xl font-extrabold leading-tight tracking-tight";
    default:
      return "text-xl font-bold leading-tight tracking-tight";
  }
}

export function getMiniSitePreviewSectionHeadingClass(template: MiniSiteTemplate): string {
  switch (template) {
    case "portfolio":
      return "text-base font-black uppercase tracking-wide";
    case "clinic":
      return "text-base font-semibold text-emerald-950";
    default:
      return "text-base font-semibold tracking-tight";
  }
}

export function getMiniSitePreviewPrimaryButtonClass(buttonStyle: MiniSiteButtonStyle): string {
  return `inline-flex w-full items-center justify-center px-4 py-2 text-xs font-semibold text-white shadow-sm ${buttonRadiusClass(buttonStyle)}`;
}

export function getMiniSitePreviewSecondaryButtonClass(
  backgroundStyle: MiniSiteBackgroundStyle,
  buttonStyle: MiniSiteButtonStyle,
): string {
  const isDark = backgroundStyle === "dark";
  return `inline-flex w-full items-center justify-center border-2 px-4 py-2 text-xs font-semibold shadow-sm ${buttonRadiusClass(buttonStyle)} ${
    isDark ? "bg-slate-800/60" : "bg-white"
  }`;
}

export function getMiniSitePreviewServiceCardPresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
  buttonStyle: MiniSiteButtonStyle,
): ThemedServiceCardPresentation {
  const isDark = backgroundStyle === "dark";
  const radius = buttonRadiusClass(buttonStyle);
  const baseCard = isDark
    ? "border-slate-700/80 bg-slate-900/55 text-slate-100"
    : "border-slate-200/90 bg-white text-slate-900";

  switch (template) {
    case "service":
      return {
        cardClass: `rounded-xl border-2 p-3 shadow-sm ${baseCard}`,
        titleClass: "text-sm font-bold tracking-tight",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-lg bg-white/80 p-1.5 shadow-sm",
      };
    case "expert":
      return {
        cardClass: `rounded-2xl border p-3 shadow-md ${baseCard}`,
        titleClass: "text-sm font-semibold tracking-tight",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-md ${radius}`,
        iconWrapClass: "rounded-full bg-white/90 p-2 shadow-sm",
      };
    case "clinic":
      return {
        cardClass: `rounded-xl border p-3 shadow-sm ${isDark ? baseCard : "border-teal-100/90 bg-white text-emerald-950"}`,
        titleClass: "text-sm font-semibold text-emerald-950",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs ${isDark ? "text-slate-400" : "text-teal-700/80"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-xl bg-teal-50 p-1.5",
      };
    case "portfolio":
      return {
        cardClass: `rounded-none border-2 p-3 shadow-sm ${baseCard}`,
        titleClass: "text-sm font-black uppercase tracking-wide",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-[10px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full border-2 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-none border-2 border-slate-900/10 bg-white p-1.5",
      };
    case "clean":
    default:
      return {
        cardClass: `rounded-xl border p-3 shadow-sm ${baseCard}`,
        titleClass: "text-sm font-semibold",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-lg bg-slate-50 p-1.5",
      };
  }
}

export function getMiniSitePreviewDeviceShellClass(): string {
  return "mx-auto w-full max-w-[375px]";
}

export function getMiniSitePreviewDeviceFrameClass(): string {
  return "overflow-hidden rounded-[2rem] border-[10px] border-slate-800 bg-slate-800 shadow-2xl";
}

export function getMiniSitePreviewDeviceScreenClass(): string {
  return "max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain bg-slate-100 [scrollbar-width:thin]";
}

export function getMiniSitePageShellClass(compact = false): string {
  if (compact) {
    return "relative w-[375px] max-w-full overflow-hidden px-4 py-6";
  }
  return "relative overflow-hidden rounded-3xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12";
}

export function getMiniSitePageShellStyle(
  backgroundColor: string,
  backgroundStyle: MiniSiteBackgroundStyle,
): CSSProperties {
  if (backgroundStyle === "soft") {
    return {
      backgroundColor,
      backgroundImage: `radial-gradient(ellipse 120% 80% at 50% -20%, ${backgroundColor}, transparent 70%), linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor}f2 100%)`,
    };
  }
  if (backgroundStyle === "dark") {
    return {
      backgroundColor,
      backgroundImage:
        "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, transparent 35%, rgba(15,23,42,0.08) 100%)",
    };
  }
  return {
    backgroundColor,
    backgroundImage: `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor} 55%, ${backgroundColor}f5 100%)`,
  };
}

function buttonRadiusClass(buttonStyle: MiniSiteButtonStyle): string {
  switch (buttonStyle) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-xl";
  }
}

export function getThemedServiceCardPresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
  buttonStyle: MiniSiteButtonStyle,
): ThemedServiceCardPresentation {
  const isDark = backgroundStyle === "dark";
  const radius = buttonRadiusClass(buttonStyle);
  const baseCard = isDark
    ? "border-slate-700/80 bg-slate-900/55 text-slate-100"
    : "border-slate-200/90 bg-white text-slate-900";

  switch (template) {
    case "service":
      return {
        cardClass: `rounded-2xl border-2 p-4 shadow-md ${baseCard}`,
        titleClass: "text-base font-bold tracking-tight break-words",
        descriptionClass: `mt-1 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-4 block w-full px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-xl bg-white/80 p-2 shadow-sm",
      };
    case "expert":
      return {
        cardClass: `rounded-3xl border p-5 shadow-lg ${baseCard}`,
        titleClass: "text-lg font-semibold tracking-tight break-words",
        descriptionClass: `mt-2 text-sm leading-relaxed break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-5 block w-full px-4 py-3.5 text-center text-sm font-semibold text-white shadow-lg transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-full bg-white/90 p-2.5 shadow-sm",
      };
    case "clinic":
      return {
        cardClass: `rounded-[1.25rem] border p-4 shadow-sm ${isDark ? baseCard : "border-teal-100/90 bg-white text-emerald-950"}`,
        titleClass: "text-base font-semibold break-words text-emerald-950",
        descriptionClass: `mt-1 text-sm leading-relaxed break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-teal-700/80"}`,
        buttonClass: `mt-4 block w-full px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-2xl bg-teal-50 p-2",
      };
    case "portfolio":
      return {
        cardClass: `rounded-none border-2 p-4 shadow-md ${baseCard}`,
        titleClass: "text-base font-black uppercase tracking-wide break-words",
        descriptionClass: `mt-2 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-4 block w-full border-2 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-none border-2 border-slate-900/10 bg-white p-2",
      };
    case "clean":
    default:
      return {
        cardClass: `rounded-2xl border p-4 shadow-sm ${baseCard}`,
        titleClass: "text-base font-semibold break-words",
        descriptionClass: `mt-1 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-4 block w-full px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-xl bg-slate-50 p-2",
      };
  }
}

export function getMiniSiteTemplatePresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
  buttonStyle: MiniSiteButtonStyle = "rounded",
): MiniSiteTemplatePresentation {
  const isDark = backgroundStyle === "dark";
  const cardRing = isDark ? "ring-1 ring-white/10" : "ring-1 ring-slate-200/60";
  const sectionBase = cardRing;
  const buttonRadius = buttonRadiusClass(buttonStyle);

  switch (template) {
    case "service":
      return {
        layoutClass: "template-service mx-auto w-full max-w-5xl",
        heroClass: `border-l-[8px] shadow-xl ${isDark ? "bg-slate-900/70" : "bg-white"}`,
        heroLayoutClass: "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between",
        sectionClass: sectionBase,
        servicesClass: isDark ? "border-2 shadow-xl" : "border-2 border-slate-200/90 shadow-lg",
        galleryClass: "border-dashed",
        heroTitleClass:
          "break-words text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]",
        sectionHeadingClass: "break-words text-xl font-bold tracking-tight sm:text-2xl",
        showBenefitsStrip: true,
        showTrustStats: true,
        heroAccentClass: isDark ? "bg-slate-900/50" : "bg-white/90",
        bookingCtaClass: "border-2 shadow-lg",
        contactChipClass: isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/90",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-4 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border-2 px-7 py-4 text-sm font-bold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "bg-slate-800/60 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
        }`,
      };
    case "expert":
      return {
        layoutClass: "template-expert mx-auto w-full max-w-3xl",
        heroClass: isDark
          ? `rounded-3xl shadow-2xl ${sectionBase} bg-slate-900/75`
          : `rounded-3xl bg-white shadow-lg ${sectionBase}`,
        heroLayoutClass: "flex flex-col items-center gap-6 text-center",
        sectionClass: isDark
          ? `${sectionBase} rounded-3xl bg-slate-900/55`
          : `${sectionBase} rounded-3xl bg-white/95`,
        servicesClass: isDark ? "rounded-3xl" : "rounded-3xl border border-slate-200/80",
        galleryClass: "rounded-3xl border-dashed",
        heroTitleClass: "break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.85rem] md:leading-tight",
        sectionHeadingClass: "break-words text-lg font-semibold sm:text-xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        heroAccentClass: isDark ? "bg-slate-900/40" : "bg-white/80",
        bookingCtaClass: "rounded-3xl",
        contactChipClass: isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-white/90",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-8 py-4 text-sm font-semibold text-white shadow-xl transition hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border px-8 py-4 text-sm font-semibold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "bg-slate-900/40 hover:bg-slate-900/60" : "bg-white/90 hover:bg-white"
        }`,
      };
    case "clinic":
      return {
        layoutClass: "template-clinic mx-auto w-full max-w-5xl",
        heroClass: isDark
          ? `rounded-[2rem] shadow-lg ${sectionBase} bg-slate-900/65`
          : `rounded-[2rem] border border-teal-100/90 bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/70 shadow-md ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-center",
        sectionClass: isDark
          ? `rounded-[1.75rem] ${sectionBase} bg-slate-900/55`
          : `rounded-[1.75rem] border border-teal-100/80 bg-white shadow-sm ${sectionBase}`,
        servicesClass: isDark ? "rounded-[1.75rem]" : "rounded-[1.75rem] border border-teal-100/80",
        galleryClass: "rounded-[1.75rem] border-dashed",
        heroTitleClass:
          "break-words text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl md:text-[2.65rem] md:leading-tight",
        sectionHeadingClass: "break-words text-lg font-semibold text-emerald-950 sm:text-xl",
        showBenefitsStrip: true,
        showTrustStats: true,
        heroAccentClass: isDark ? "bg-slate-900/45" : "bg-white/85",
        bookingCtaClass: "rounded-[1.75rem] border border-teal-100/70",
        contactChipClass: isDark
          ? "border-slate-700 bg-slate-900/40"
          : "border-teal-100/80 bg-teal-50/50",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-4 text-sm font-semibold text-white shadow-md transition hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border-2 px-7 py-4 text-sm font-semibold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "border-slate-600 bg-slate-900/40" : "border-teal-200 bg-white hover:bg-teal-50/50"
        }`,
      };
    case "portfolio":
      return {
        layoutClass: "template-portfolio mx-auto w-full max-w-5xl",
        heroClass: isDark
          ? `border-2 shadow-2xl ${sectionBase} bg-slate-950/80`
          : `border-2 border-slate-900/10 bg-white shadow-2xl ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        sectionClass: isDark ? `border shadow-xl ${sectionBase} bg-slate-950/70` : `shadow-xl ${sectionBase} bg-white`,
        servicesClass: isDark ? "border-2" : "border border-slate-200 shadow-md",
        galleryClass: isDark
          ? "border-2 border-dashed py-14 shadow-inner"
          : "border-2 border-dashed py-14 shadow-sm",
        heroTitleClass:
          "break-words text-3xl font-black uppercase tracking-wide sm:text-4xl md:text-5xl md:leading-none",
        sectionHeadingClass: "break-words text-xl font-black uppercase tracking-wide sm:text-2xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        heroAccentClass: isDark ? "bg-slate-950/50" : "bg-white",
        bookingCtaClass: "border-2 border-slate-900/10 shadow-xl",
        contactChipClass: isDark ? "border-slate-700 bg-slate-950/50" : "border-slate-200 bg-slate-50",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border-2 px-7 py-4 text-sm font-bold uppercase tracking-wide shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "bg-slate-950/50" : "bg-white"
        }`,
      };
    case "clean":
    default:
      return {
        layoutClass: "template-clean mx-auto w-full max-w-5xl",
        heroClass: isDark ? `shadow-xl ${sectionBase} bg-slate-900/65` : `bg-white shadow-lg ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-center",
        sectionClass: isDark ? sectionBase : `${sectionBase} bg-white`,
        servicesClass: isDark ? "" : "shadow-sm",
        galleryClass: "border-dashed",
        heroTitleClass: "break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.85rem] md:leading-tight",
        sectionHeadingClass: "break-words text-xl font-semibold tracking-tight sm:text-2xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        heroAccentClass: isDark ? "bg-slate-900/45" : "bg-white/90",
        bookingCtaClass: "shadow-md",
        contactChipClass: isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200/80 bg-slate-50/80",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-4 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border px-7 py-4 text-sm font-semibold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "bg-slate-800/60 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
        }`,
      };
  }
}

export function normalizeHexColorInput(value: string, fallback: string): string {
  const trimmed = value.trim();
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (shortMatch) {
    const [, r, g, b] = shortMatch;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

export function hexColorForPicker(value: string, fallback: string): string {
  const normalized = normalizeHexColorInput(value, fallback);
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}
