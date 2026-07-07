import type { CSSProperties } from "react";
import type { MiniSiteBackgroundStyle, MiniSiteTemplate } from "@/types/miniSite";

export type TrustStat = {
  value: string;
  label: string;
};

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
  showBenefitsStrip: boolean;
  showTrustStats: boolean;
  trustStats: TrustStat[];
  heroAccentClass: string;
  bookingCtaClass: string;
};

export function getMiniSitePageShellClass(): string {
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
      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.12) 0%, transparent 35%, rgba(15,23,42,0.08) 100%)`,
    };
  }
  return {
    backgroundColor,
    backgroundImage: `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor} 55%, ${backgroundColor}f5 100%)`,
  };
}

export function getMiniSiteTemplatePresentation(
  template: MiniSiteTemplate,
  backgroundStyle: MiniSiteBackgroundStyle,
): MiniSiteTemplatePresentation {
  const isDark = backgroundStyle === "dark";
  const cardRing = isDark ? "ring-1 ring-white/10" : "ring-1 ring-slate-200/60";
  const sectionBase = `${cardRing}`;

  switch (template) {
    case "service":
      return {
        layoutClass: "template-service mx-auto w-full max-w-5xl",
        heroClass: `border-l-[8px] shadow-xl ${isDark ? "bg-slate-900/70" : "bg-white"}`,
        heroLayoutClass: "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between",
        heroBadge: "Service business",
        sectionClass: sectionBase,
        servicesClass: isDark ? "border-2 shadow-xl" : "border-2 border-slate-200/90 shadow-lg",
        galleryClass: "border-dashed",
        heroTitleClass: "text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]",
        sectionHeadingClass: "text-xl font-bold tracking-tight sm:text-2xl",
        showBenefitsStrip: true,
        showTrustStats: true,
        trustStats: [
          { value: "Same-week", label: "Service availability" },
          { value: "Free quote", label: "No obligation" },
          { value: "Local", label: "Trusted nearby" },
        ],
        heroAccentClass: isDark ? "bg-slate-900/50" : "bg-white/90",
        bookingCtaClass: "border-2 shadow-lg",
      };
    case "expert":
      return {
        layoutClass: "template-expert mx-auto w-full max-w-3xl",
        heroClass: isDark
          ? `rounded-3xl shadow-2xl ${sectionBase} bg-slate-900/75`
          : `rounded-3xl bg-white shadow-lg ${sectionBase}`,
        heroLayoutClass: "flex flex-col items-center gap-6 text-center",
        heroBadge: "Expert profile",
        sectionClass: isDark ? `${sectionBase} rounded-3xl bg-slate-900/55` : `${sectionBase} rounded-3xl bg-white/95`,
        servicesClass: isDark ? "rounded-3xl" : "rounded-3xl border border-slate-200/80",
        galleryClass: "rounded-3xl border-dashed",
        heroTitleClass: "text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.75rem]",
        sectionHeadingClass: "text-lg font-semibold sm:text-xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        trustStats: [
          { value: "1:1", label: "Personal guidance" },
          { value: "Proven", label: "Approach" },
          { value: "Clear", label: "Next steps" },
        ],
        heroAccentClass: isDark ? "bg-slate-900/40" : "bg-white/80",
        bookingCtaClass: "rounded-3xl",
      };
    case "clinic":
      return {
        layoutClass: "template-clinic mx-auto w-full max-w-5xl",
        heroClass: isDark
          ? `rounded-[2rem] shadow-lg ${sectionBase} bg-slate-900/65`
          : `rounded-[2rem] border border-teal-100/90 bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/70 shadow-md ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-center",
        heroBadge: "Care & wellness",
        sectionClass: isDark
          ? `rounded-[1.75rem] ${sectionBase} bg-slate-900/55`
          : `rounded-[1.75rem] border border-teal-100/80 bg-white shadow-sm ${sectionBase}`,
        servicesClass: isDark ? "rounded-[1.75rem]" : "rounded-[1.75rem] border border-teal-100/80",
        galleryClass: "rounded-[1.75rem] border-dashed",
        heroTitleClass: "text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl md:text-[2.65rem] md:leading-tight",
        sectionHeadingClass: "text-lg font-semibold text-emerald-950 sm:text-xl",
        showBenefitsStrip: true,
        showTrustStats: true,
        trustStats: [
          { value: "Flexible", label: "Appointments" },
          { value: "Patient-first", label: "Experience" },
          { value: "Clear", label: "Contact info" },
        ],
        heroAccentClass: isDark ? "bg-slate-900/45" : "bg-white/85",
        bookingCtaClass: "rounded-[1.75rem] border border-teal-100/70",
      };
    case "portfolio":
      return {
        layoutClass: "template-portfolio mx-auto w-full max-w-5xl",
        heroClass: isDark
          ? `border-2 shadow-2xl ${sectionBase} bg-slate-950/80`
          : `border-2 border-slate-900/10 bg-white shadow-2xl ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        heroBadge: "Creative portfolio",
        sectionClass: isDark ? `border shadow-xl ${sectionBase} bg-slate-950/70` : `shadow-xl ${sectionBase} bg-white`,
        servicesClass: isDark ? "border-2" : "border border-slate-200 shadow-md",
        galleryClass: isDark
          ? "border-2 border-dashed py-14 shadow-inner"
          : "border-2 border-dashed py-14 shadow-sm",
        heroTitleClass: "text-3xl font-black uppercase tracking-wide sm:text-4xl md:text-5xl md:leading-none",
        sectionHeadingClass: "text-xl font-black uppercase tracking-wide sm:text-2xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        trustStats: [
          { value: "Premium", label: "Quality work" },
          { value: "Curated", label: "Showcase" },
          { value: "Bold", label: "Visual style" },
        ],
        heroAccentClass: isDark ? "bg-slate-950/50" : "bg-white",
        bookingCtaClass: "border-2 border-slate-900/10 shadow-xl",
      };
    case "clean":
    default:
      return {
        layoutClass: "template-clean mx-auto w-full max-w-5xl",
        heroClass: isDark ? `shadow-xl ${sectionBase} bg-slate-900/65` : `bg-white shadow-lg ${sectionBase}`,
        heroLayoutClass: "flex flex-col gap-6 md:flex-row md:items-center",
        heroBadge: "Welcome",
        sectionClass: isDark ? sectionBase : `${sectionBase} bg-white`,
        servicesClass: isDark ? "" : "shadow-sm",
        galleryClass: "border-dashed",
        heroTitleClass: "text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.85rem] md:leading-tight",
        sectionHeadingClass: "text-xl font-semibold tracking-tight sm:text-2xl",
        showBenefitsStrip: false,
        showTrustStats: true,
        trustStats: [
          { value: "Professional", label: "Service quality" },
          { value: "Easy", label: "Online booking" },
          { value: "Local", label: "Trusted business" },
        ],
        heroAccentClass: isDark ? "bg-slate-900/45" : "bg-white/90",
        bookingCtaClass: "shadow-md",
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
