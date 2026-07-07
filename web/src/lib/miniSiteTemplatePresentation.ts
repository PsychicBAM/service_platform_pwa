import type { MiniSiteBackgroundStyle, MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteTemplatePresentation = {
  layoutClass: string;
  heroClass: string;
  heroLayoutClass: string;
  heroBadge: string;
  sectionClass: string;
  servicesClass: string;
  galleryClass: string;
  heroTitleClass: string;
  sectionHeadingClass: string;
};

export function getMiniSitePageShellClass(backgroundStyle: MiniSiteBackgroundStyle): string {
  switch (backgroundStyle) {
    case "dark":
      return "rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 sm:px-6 sm:py-8 md:px-8";
    case "soft":
      return "rounded-3xl bg-gradient-to-b from-slate-100/90 via-slate-50 to-white px-4 py-6 sm:px-6 sm:py-8 md:px-8";
    default:
      return "rounded-3xl bg-gradient-to-b from-slate-50 via-white to-white px-4 py-6 sm:px-6 sm:py-8 md:px-8";
  }
}

export function getMiniSiteTemplatePresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
): MiniSiteTemplatePresentation {
  const isDark = backgroundStyle === "dark";
  const cardRing = isDark ? "ring-1 ring-white/10" : "ring-1 ring-slate-200/70";
  const sectionBase = `${cardRing} backdrop-blur-sm`;

  switch (template) {
    case "service":
      return {
        layoutClass: "template-service max-w-4xl mx-auto",
        heroClass: `border-l-[6px] shadow-lg ${isDark ? "bg-slate-800/60" : "bg-white"}`,
        heroLayoutClass: "flex flex-col gap-5 md:flex-row md:items-center",
        heroBadge: "Service business",
        sectionClass: sectionBase,
        servicesClass: isDark ? "border-2 shadow-lg" : "border-2 shadow-md",
        galleryClass: "border-dashed",
        heroTitleClass: "text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl",
        sectionHeadingClass: "text-xl font-semibold tracking-tight sm:text-2xl",
      };
    case "expert":
      return {
        layoutClass: "template-expert max-w-3xl mx-auto",
        heroClass: isDark
          ? `shadow-xl ${sectionBase} bg-slate-800/70`
          : `bg-white shadow-md ${sectionBase}`,
        heroLayoutClass: "flex flex-col items-center gap-5 text-center",
        heroBadge: "Expert profile",
        sectionClass: isDark ? `${sectionBase} bg-slate-800/50` : `${sectionBase} bg-white/95`,
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass: "text-3xl font-bold tracking-tight sm:text-4xl",
        sectionHeadingClass: "text-lg font-semibold sm:text-xl",
      };
    case "clinic":
      return {
        layoutClass: "template-clinic max-w-4xl mx-auto",
        heroClass: isDark
          ? `rounded-3xl shadow-md ${sectionBase}`
          : `rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 shadow-sm ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-5 md:flex-row md:items-center",
        heroBadge: "Clinic & care",
        sectionClass: isDark
          ? `rounded-3xl ${sectionBase}`
          : `rounded-3xl border border-emerald-100/70 bg-white shadow-sm ${sectionBase}`,
        servicesClass: isDark ? "rounded-3xl" : "rounded-3xl border border-emerald-100/70",
        galleryClass: "rounded-3xl border-dashed",
        heroTitleClass: "text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.5rem]",
        sectionHeadingClass: "text-lg font-semibold sm:text-xl",
      };
    case "portfolio":
      return {
        layoutClass: "template-portfolio max-w-4xl mx-auto",
        heroClass: isDark
          ? `border-2 shadow-2xl ${sectionBase} bg-slate-800/80`
          : `shadow-xl ${sectionBase} bg-white`,
        heroLayoutClass: "flex flex-col gap-5 md:flex-row md:items-end",
        heroBadge: "Creative portfolio",
        sectionClass: isDark ? `border shadow-lg ${sectionBase}` : `shadow-lg ${sectionBase} bg-white`,
        servicesClass: "",
        galleryClass: isDark
          ? "border-2 border-dashed py-12 shadow-inner"
          : "border-2 border-dashed py-12 shadow-sm",
        heroTitleClass: "text-3xl font-bold uppercase tracking-wide sm:text-4xl md:text-5xl",
        sectionHeadingClass: "text-xl font-bold tracking-wide sm:text-2xl",
      };
    case "clean":
    default:
      return {
        layoutClass: "template-clean max-w-4xl mx-auto",
        heroClass: isDark ? `shadow-lg ${sectionBase} bg-slate-800/60` : `bg-white shadow-md ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-5 md:flex-row md:items-center",
        heroBadge: "Welcome",
        sectionClass: isDark ? sectionBase : `${sectionBase} bg-white`,
        servicesClass: "",
        galleryClass: "border-dashed",
        heroTitleClass: "text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-tight",
        sectionHeadingClass: "text-xl font-semibold tracking-tight sm:text-2xl",
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
