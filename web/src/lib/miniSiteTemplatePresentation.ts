import type { MiniSiteBackgroundStyle, MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteTemplatePresentation = {
  layoutClass: string;
  heroClass: string;
  heroLayoutClass: string;
  heroBadge: string;
  sectionClass: string;
  servicesClass: string;
  galleryClass: string;
};

export function getMiniSiteTemplatePresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
): MiniSiteTemplatePresentation {
  const isDark = backgroundStyle === "dark";

  switch (template) {
    case "service":
      return {
        layoutClass: "template-service gap-5",
        heroClass: "border-l-4 shadow-md",
        heroLayoutClass: "flex flex-col gap-4 md:flex-row md:items-start",
        heroBadge: "Service business",
        sectionClass: "shadow-sm",
        servicesClass: isDark ? "border-2 shadow-md" : "border shadow-md",
        galleryClass: "border-dashed",
      };
    case "expert":
      return {
        layoutClass: "template-expert gap-6",
        heroClass: isDark ? "shadow-lg" : "bg-slate-50/80 shadow-sm",
        heroLayoutClass: "flex flex-col items-center gap-4 text-center",
        heroBadge: "Expert profile",
        sectionClass: isDark ? "shadow-sm" : "bg-white/90 shadow-sm",
        servicesClass: "",
        galleryClass: "border-dashed",
      };
    case "clinic":
      return {
        layoutClass: "template-clinic gap-6",
        heroClass: isDark
          ? "rounded-3xl shadow-sm"
          : "rounded-3xl border-emerald-100 bg-emerald-50/60 shadow-sm",
        heroLayoutClass: "flex flex-col gap-4 md:flex-row md:items-start",
        heroBadge: "Clinic & care",
        sectionClass: isDark ? "rounded-3xl shadow-sm" : "rounded-3xl border-emerald-100 bg-white shadow-sm",
        servicesClass: isDark ? "rounded-3xl" : "rounded-3xl border-emerald-100",
        galleryClass: "rounded-3xl border-dashed",
      };
    case "portfolio":
      return {
        layoutClass: "template-portfolio gap-6",
        heroClass: isDark ? "border-2 shadow-xl" : "shadow-lg",
        heroLayoutClass: "flex flex-col gap-4 md:flex-row md:items-start",
        heroBadge: "Creative portfolio",
        sectionClass: isDark ? "border shadow-md" : "shadow-md",
        servicesClass: "",
        galleryClass: isDark
          ? "border-2 border-dashed py-8 shadow-inner"
          : "border-2 border-dashed py-8 shadow-sm",
      };
    case "clean":
    default:
      return {
        layoutClass: "template-clean gap-6",
        heroClass: "shadow-sm",
        heroLayoutClass: "flex flex-col gap-4 md:flex-row md:items-start",
        heroBadge: "Pro profile",
        sectionClass: "shadow-sm",
        servicesClass: "",
        galleryClass: "border-dashed",
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
