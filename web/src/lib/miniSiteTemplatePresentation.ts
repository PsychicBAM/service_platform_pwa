import type { CSSProperties } from "react";
import type { MiniSiteBackgroundStyle, MiniSiteButtonStyle, MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteTemplatePresentation = {
  layoutClass: string;
  layoutSpacingClass: string;
  heroClass: string;
  heroLayoutClass: string;
  heroPaddingClass: string;
  sectionClass: string;
  sectionPaddingClass: string;
  sectionRadiusClass: string;
  servicesClass: string;
  galleryClass: string;
  heroTitleClass: string;
  sectionHeadingClass: string;
  sectionHeadingAccentClass: string;
  showBenefitsStrip: boolean;
  showTrustStats: boolean;
  heroAccentClass: string;
  bookingCtaClass: string;
  contactChipClass: string;
  trustStatClass: string;
  faqItemClass: string;
  heroBadgeClass: string;
  heroTopBarClass: string;
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
  buttonVariant: "filled" | "outline";
};

const DEFAULT_LAYOUT_SPACING = "space-y-10 md:space-y-12";
const DEFAULT_SECTION_PADDING = "p-6 md:p-9";
const DEFAULT_SECTION_RADIUS = "rounded-2xl";
const DEFAULT_SECTION_SURFACE_LIGHT =
  "border-slate-200/90 bg-white text-slate-900 shadow-md shadow-slate-200/40";
const DEFAULT_SECTION_SURFACE_DARK =
  "border-slate-700/80 bg-slate-900/60 text-slate-100 shadow-lg shadow-black/20";
const DEFAULT_SECTION_HEADING_ACCENT = "mb-5 h-1 w-12 rounded-full";
const DEFAULT_TRUST_STAT_LIGHT = "border-slate-200/80 bg-white/80";
const DEFAULT_TRUST_STAT_DARK = "border-slate-700/80 bg-slate-900/50";
const DEFAULT_FAQ_ITEM_LIGHT = "border-slate-200/80 bg-slate-50/80";
const DEFAULT_FAQ_ITEM_DARK = "border-slate-700/80 bg-slate-900/40";
const DEFAULT_HERO_BADGE =
  "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider";
const DEFAULT_HERO_TOP_BAR = "pointer-events-none absolute inset-x-0 top-0 h-1.5";

export function getMiniSiteSectionCardSurface(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
): string {
  if (backgroundStyle === "dark") {
    if (template === "clean") {
      return "border-slate-700/70 bg-slate-900/50 text-slate-100 shadow-sm shadow-black/15";
    }
    return DEFAULT_SECTION_SURFACE_DARK;
  }
  if (template === "clean") {
    return "border-slate-200/55 bg-white/95 text-slate-900 shadow-sm shadow-slate-900/[0.04]";
  }
  return DEFAULT_SECTION_SURFACE_LIGHT;
}

export function getMiniSiteSectionCardRadius(template: MiniSiteTemplate): string {
  return template === "clean" ? "rounded-3xl" : DEFAULT_SECTION_RADIUS;
}

export function getMiniSiteSectionCardPadding(template: MiniSiteTemplate): string {
  return template === "clean" ? "p-7 md:p-10" : DEFAULT_SECTION_PADDING;
}

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
    case "clean":
      return "text-xl font-semibold leading-tight tracking-tight md:text-2xl";
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
    case "clean":
      return "text-sm font-medium tracking-tight text-slate-800";
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
        buttonVariant: "filled",
      };
    case "expert":
      return {
        cardClass: `rounded-2xl border p-3 shadow-md ${baseCard}`,
        titleClass: "text-sm font-semibold tracking-tight",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-md ${radius}`,
        iconWrapClass: "rounded-full bg-white/90 p-2 shadow-sm",
        buttonVariant: "filled",
      };
    case "clinic":
      return {
        cardClass: `rounded-xl border p-3 shadow-sm ${isDark ? baseCard : "border-teal-100/90 bg-white text-emerald-950"}`,
        titleClass: "text-sm font-semibold text-emerald-950",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs ${isDark ? "text-slate-400" : "text-teal-700/80"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-xl bg-teal-50 p-1.5",
        buttonVariant: "filled",
      };
    case "portfolio":
      return {
        cardClass: `rounded-none border-2 p-3 shadow-sm ${baseCard}`,
        titleClass: "text-sm font-black uppercase tracking-wide",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-[10px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full border-2 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-none border-2 border-slate-900/10 bg-white p-1.5",
        buttonVariant: "filled",
      };
    case "clean":
      return {
        cardClass: `rounded-2xl border p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${
          isDark ? baseCard : "border-slate-200/60 bg-white text-slate-900"
        }`,
        titleClass: "text-sm font-medium tracking-tight",
        descriptionClass: `mt-1.5 text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full border px-3 py-2 text-center text-xs font-medium transition hover:bg-slate-50/80 ${radius}`,
        iconWrapClass: `rounded-xl p-1.5 ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`,
        buttonVariant: "outline",
      };
    default:
      return {
        cardClass: `rounded-xl border p-3 shadow-sm ${baseCard}`,
        titleClass: "text-sm font-semibold",
        descriptionClass: `mt-1 text-xs leading-snug ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-3 block w-full px-3 py-2 text-center text-xs font-semibold text-white shadow-sm ${radius}`,
        iconWrapClass: "rounded-lg bg-slate-50 p-1.5",
        buttonVariant: "filled",
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
        buttonVariant: "filled",
      };
    case "expert":
      return {
        cardClass: `rounded-3xl border p-5 shadow-lg ${baseCard}`,
        titleClass: "text-lg font-semibold tracking-tight break-words",
        descriptionClass: `mt-2 text-sm leading-relaxed break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-5 block w-full px-4 py-3.5 text-center text-sm font-semibold text-white shadow-lg transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-full bg-white/90 p-2.5 shadow-sm",
        buttonVariant: "filled",
      };
    case "clinic":
      return {
        cardClass: `rounded-[1.25rem] border p-4 shadow-sm ${isDark ? baseCard : "border-teal-100/90 bg-white text-emerald-950"}`,
        titleClass: "text-base font-semibold break-words text-emerald-950",
        descriptionClass: `mt-1 text-sm leading-relaxed break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-teal-700/80"}`,
        buttonClass: `mt-4 block w-full px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-2xl bg-teal-50 p-2",
        buttonVariant: "filled",
      };
    case "portfolio":
      return {
        cardClass: `rounded-none border-2 p-4 shadow-md ${baseCard}`,
        titleClass: "text-base font-black uppercase tracking-wide break-words",
        descriptionClass: `mt-2 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-4 block w-full border-2 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-none border-2 border-slate-900/10 bg-white p-2",
        buttonVariant: "filled",
      };
    case "clean":
      return {
        cardClass: `border-0 border-b last:border-b-0 bg-transparent p-0 shadow-none ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`,
        titleClass: "text-base font-medium tracking-tight break-words",
        descriptionClass: `mt-1 text-sm leading-relaxed break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `inline-flex items-center gap-1 text-sm font-medium hover:underline`,
        iconWrapClass: "hidden",
        buttonVariant: "outline",
      };
    default:
      return {
        cardClass: `rounded-2xl border p-4 shadow-sm ${baseCard}`,
        titleClass: "text-base font-semibold break-words",
        descriptionClass: `mt-1 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-600"}`,
        metaClass: `text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`,
        buttonClass: `mt-4 block w-full px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105 ${radius}`,
        iconWrapClass: "rounded-xl bg-slate-50 p-2",
        buttonVariant: "filled",
      };
  }
}

function withTemplateDefaults(
  isDark: boolean,
  presentation: Omit<
    MiniSiteTemplatePresentation,
    | "layoutSpacingClass"
    | "heroPaddingClass"
    | "sectionPaddingClass"
    | "sectionRadiusClass"
    | "sectionHeadingAccentClass"
    | "trustStatClass"
    | "faqItemClass"
    | "heroBadgeClass"
    | "heroTopBarClass"
  > &
    Partial<
      Pick<
        MiniSiteTemplatePresentation,
        | "layoutSpacingClass"
        | "heroPaddingClass"
        | "sectionPaddingClass"
        | "sectionRadiusClass"
        | "sectionHeadingAccentClass"
        | "trustStatClass"
        | "faqItemClass"
        | "heroBadgeClass"
        | "heroTopBarClass"
      >
    >,
): MiniSiteTemplatePresentation {
  return {
    layoutSpacingClass: DEFAULT_LAYOUT_SPACING,
    heroPaddingClass: "",
    sectionPaddingClass: DEFAULT_SECTION_PADDING,
    sectionRadiusClass: DEFAULT_SECTION_RADIUS,
    sectionHeadingAccentClass: DEFAULT_SECTION_HEADING_ACCENT,
    trustStatClass: `rounded-xl border px-4 py-3 text-center ${
      isDark ? DEFAULT_TRUST_STAT_DARK : DEFAULT_TRUST_STAT_LIGHT
    }`,
    faqItemClass: `min-w-0 rounded-xl border px-4 py-3 ${
      isDark ? DEFAULT_FAQ_ITEM_DARK : DEFAULT_FAQ_ITEM_LIGHT
    }`,
    heroBadgeClass: DEFAULT_HERO_BADGE,
    heroTopBarClass: DEFAULT_HERO_TOP_BAR,
    ...presentation,
  };
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
      return withTemplateDefaults(isDark, {
        layoutClass: "template-service mx-auto w-full max-w-5xl",
        layoutSpacingClass: "space-y-0",
        heroClass: isDark ? "bg-slate-900/70" : "bg-white",
        heroLayoutClass: "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between",
        sectionClass: "ring-0",
        sectionPaddingClass: "",
        sectionRadiusClass: "rounded-none",
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass:
          "break-words text-3xl font-extrabold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.08]",
        sectionHeadingClass: "break-words text-xl font-bold tracking-tight sm:text-2xl",
        sectionHeadingAccentClass: "hidden",
        showBenefitsStrip: true,
        showTrustStats: true,
        heroAccentClass: "",
        bookingCtaClass: "",
        contactChipClass: "",
        trustStatClass: "",
        faqItemClass: "",
        heroBadgeClass: "inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        heroTopBarClass: "hidden",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-4 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border-2 px-7 py-4 text-sm font-bold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "bg-slate-800/60 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
        }`,
      });
    case "expert":
      return withTemplateDefaults(isDark, {
        layoutClass: "template-expert mx-auto w-full max-w-4xl",
        layoutSpacingClass: "space-y-0",
        heroClass: "border-0 bg-transparent shadow-none ring-0",
        heroLayoutClass: "flex flex-col items-center text-center",
        heroPaddingClass: "",
        sectionClass: "border-0 bg-transparent shadow-none ring-0",
        sectionPaddingClass: "",
        sectionRadiusClass: "rounded-none",
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass:
          "break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.85rem] md:leading-[1.08] lg:text-[3.25rem]",
        sectionHeadingClass: "break-words text-xl font-semibold tracking-tight md:text-2xl",
        sectionHeadingAccentClass: "hidden",
        showBenefitsStrip: false,
        showTrustStats: true,
        heroAccentClass: "",
        bookingCtaClass: "",
        contactChipClass: "",
        trustStatClass: "",
        faqItemClass: "",
        heroBadgeClass:
          "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
        heroTopBarClass: "hidden",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border px-8 py-3.5 text-sm font-semibold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "border-slate-600/70 bg-transparent hover:bg-slate-800/30" : "border-slate-300/80 bg-white/50 hover:bg-white"
        }`,
      });
    case "clinic":
      return withTemplateDefaults(isDark, {
        layoutClass: "template-clinic mx-auto w-full max-w-6xl",
        layoutSpacingClass: "space-y-0",
        heroClass: "border-0 bg-transparent shadow-none ring-0",
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-center",
        heroPaddingClass: "",
        sectionClass: "border-0 bg-transparent shadow-none ring-0",
        sectionPaddingClass: "",
        sectionRadiusClass: "rounded-none",
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass:
          "break-words text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.85rem] lg:text-[3.15rem] md:leading-[1.06]",
        sectionHeadingClass: "break-words text-xl font-semibold tracking-tight md:text-2xl",
        sectionHeadingAccentClass: "hidden",
        showBenefitsStrip: true,
        showTrustStats: true,
        heroAccentClass: "",
        bookingCtaClass: "",
        contactChipClass: "",
        trustStatClass: "",
        faqItemClass: "",
        heroBadgeClass:
          "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
        heroTopBarClass: "hidden",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border-2 px-7 py-3.5 text-sm font-semibold shadow-sm transition hover:shadow-md sm:w-auto ${buttonRadius} ${
          isDark ? "border-slate-600/70 bg-transparent hover:bg-slate-800/30" : "border-slate-300/80 bg-white/70 hover:bg-white"
        }`,
      });
    case "portfolio":
      return withTemplateDefaults(isDark, {
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
      });
    case "clean":
    default:
      return withTemplateDefaults(isDark, {
        layoutClass: "template-clean mx-auto w-full max-w-4xl",
        layoutSpacingClass: "space-y-0",
        heroClass: "border-0 bg-transparent shadow-none ring-0",
        heroLayoutClass: "flex flex-col items-center text-center",
        heroPaddingClass: "",
        sectionClass: "border-0 bg-transparent shadow-none ring-0",
        sectionPaddingClass: "",
        sectionRadiusClass: "rounded-none",
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass:
          "break-words text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.08] lg:text-[3.15rem]",
        sectionHeadingClass: "break-words text-2xl font-medium tracking-tight md:text-3xl",
        sectionHeadingAccentClass: "hidden",
        showBenefitsStrip: false,
        showTrustStats: true,
        heroAccentClass: "",
        bookingCtaClass: "",
        contactChipClass: "",
        trustStatClass: "",
        faqItemClass: "",
        heroBadgeClass:
          "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
        heroTopBarClass: "hidden",
        primaryButtonClass: `inline-flex w-full items-center justify-center px-7 py-3.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md hover:brightness-[1.02] sm:w-auto ${buttonRadius}`,
        secondaryButtonClass: `inline-flex w-full items-center justify-center border px-7 py-3.5 text-sm font-medium shadow-none transition hover:bg-white/70 sm:w-auto ${buttonRadius} ${
          isDark
            ? "border-slate-600/70 bg-transparent hover:bg-slate-800/30"
            : "border-slate-300/80 bg-white/50 hover:bg-white"
        }`,
      });
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
