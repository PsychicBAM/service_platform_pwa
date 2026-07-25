import type { MiniSiteTheme } from "@/types/miniSite";
import type { ExpertThemePresetId } from "@/types/expertTemplate";

export type ExpertPresetVisualTokens = {
  id: ExpertThemePresetId;
  label: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: MiniSiteTheme["backgroundStyle"];
  buttonStyle: MiniSiteTheme["buttonStyle"];
  mood: "light" | "dark" | "warm" | "creative";
  heroTone: "dark" | "light" | "gradient" | "cream";
  heroClass: string;
  sectionAltClass: string;
  sectionMainClass: string;
  cardClass: string;
  statsClass: string;
  ctaClass: string;
  footerClass: string;
  buttonPrimaryText: string;
};

export type ExpertContrastTokens = {
  pageBg: string;
  heroText: string;
  heroMutedText: string;
  bodyText: string;
  mutedText: string;
  cardClass: string;
  cardText: string;
  cardMutedText: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  footerClass: string;
  faqText: string;
  faqMutedText: string;
  ctaBg: string;
  ctaText: string;
  ctaMutedText: string;
  surfaceMode: "light" | "dark";
};

export const EXPERT_PRESET_VISUALS: Record<ExpertThemePresetId, ExpertPresetVisualTokens> = {
  classic_cream: {
    id: "classic_cream",
    label: "Classic Cream",
    primaryColor: "#3f2e1f",
    accentColor: "#8b6914",
    backgroundColor: "#f7f1e8",
    backgroundStyle: "soft",
    buttonStyle: "rounded",
    mood: "warm",
    heroTone: "cream",
    heroClass: "bg-gradient-to-br from-[#f7f1e8] via-[#f3ebe0] to-[#ebe1d2] text-stone-900",
    sectionAltClass: "bg-[#f0e8dc]",
    sectionMainClass: "bg-[#faf6f0]",
    cardClass: "border border-stone-200/80 bg-white shadow-sm",
    statsClass: "border border-stone-200 bg-white",
    ctaClass: "bg-stone-900 text-white",
    footerClass: "bg-stone-900 text-stone-200",
    buttonPrimaryText: "text-white",
  },
  premium_dark: {
    id: "premium_dark",
    label: "Premium Dark",
    primaryColor: "#d4af37",
    accentColor: "#f5e6a3",
    backgroundColor: "#0b1220",
    backgroundStyle: "dark",
    buttonStyle: "rounded",
    mood: "dark",
    heroTone: "dark",
    heroClass: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white",
    sectionAltClass: "bg-slate-900",
    sectionMainClass: "bg-slate-950",
    cardClass: "border border-slate-700 bg-slate-900 shadow-lg",
    statsClass: "border border-slate-700 bg-slate-900",
    ctaClass: "bg-slate-950 text-white",
    footerClass: "bg-black text-slate-300",
    buttonPrimaryText: "text-slate-950",
  },
  calm_green: {
    id: "calm_green",
    label: "Calm Green",
    primaryColor: "#1f4d3a",
    accentColor: "#3d7a5f",
    backgroundColor: "#f4f7f5",
    backgroundStyle: "light",
    buttonStyle: "rounded",
    mood: "light",
    heroTone: "light",
    heroClass: "bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900",
    sectionAltClass: "bg-emerald-50/70",
    sectionMainClass: "bg-white",
    cardClass: "border border-emerald-100 bg-white shadow-sm",
    statsClass: "border border-emerald-100 bg-white",
    ctaClass: "bg-emerald-900 text-white",
    footerClass: "bg-emerald-950 text-emerald-50",
    buttonPrimaryText: "text-white",
  },
  ocean_blue: {
    id: "ocean_blue",
    label: "Ocean Blue",
    primaryColor: "#0c4a6e",
    accentColor: "#0284c7",
    backgroundColor: "#f0f9ff",
    backgroundStyle: "light",
    buttonStyle: "rounded",
    mood: "light",
    heroTone: "gradient",
    heroClass: "bg-gradient-to-br from-sky-900 via-blue-800 to-cyan-800 text-white",
    sectionAltClass: "bg-sky-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-sky-100 bg-white shadow-sm",
    statsClass: "border border-sky-100 bg-sky-50",
    ctaClass: "bg-sky-900 text-white",
    footerClass: "bg-slate-900 text-sky-50",
    buttonPrimaryText: "text-white",
  },
  royal_purple: {
    id: "royal_purple",
    label: "Royal Purple",
    primaryColor: "#5b21b6",
    accentColor: "#a78bfa",
    backgroundColor: "#faf5ff",
    backgroundStyle: "soft",
    buttonStyle: "pill",
    mood: "creative",
    heroTone: "gradient",
    heroClass: "bg-gradient-to-br from-violet-950 via-purple-800 to-fuchsia-800 text-white",
    sectionAltClass: "bg-violet-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-violet-100 bg-white shadow-md",
    statsClass: "bg-violet-50",
    ctaClass: "bg-violet-800 text-white",
    footerClass: "bg-violet-950 text-violet-100",
    buttonPrimaryText: "text-white",
  },
  warm_clay: {
    id: "warm_clay",
    label: "Warm Clay",
    primaryColor: "#9a3412",
    accentColor: "#c2410c",
    backgroundColor: "#fff7ed",
    backgroundStyle: "soft",
    buttonStyle: "rounded",
    mood: "warm",
    heroTone: "cream",
    heroClass: "bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 text-stone-900",
    sectionAltClass: "bg-orange-50/80",
    sectionMainClass: "bg-[#fffdf9]",
    cardClass: "border border-orange-100 bg-white shadow-sm",
    statsClass: "border border-orange-100 bg-white",
    ctaClass: "bg-orange-800 text-white",
    footerClass: "bg-stone-900 text-orange-50",
    buttonPrimaryText: "text-white",
  },
  clean_white: {
    id: "clean_white",
    label: "Clean White",
    primaryColor: "#0f172a",
    accentColor: "#334155",
    backgroundColor: "#ffffff",
    backgroundStyle: "light",
    buttonStyle: "square",
    mood: "light",
    heroTone: "light",
    heroClass: "bg-white text-slate-900 border-b border-slate-200",
    sectionAltClass: "bg-slate-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-slate-200 bg-white",
    statsClass: "bg-transparent",
    ctaClass: "bg-slate-900 text-white",
    footerClass: "bg-white text-slate-600 border-t border-slate-200",
    buttonPrimaryText: "text-white",
  },
};

const LIGHT: ExpertContrastTokens = {
  pageBg: "#ffffff",
  heroText: "text-slate-900",
  heroMutedText: "text-slate-600",
  bodyText: "text-slate-950",
  mutedText: "text-slate-600",
  cardClass: "border border-slate-200 bg-white shadow-sm",
  cardText: "text-slate-950",
  cardMutedText: "text-slate-600",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-slate-900/20 bg-white/80 text-slate-900 hover:bg-white",
  footerClass: "bg-slate-950 text-slate-200",
  faqText: "text-slate-950",
  faqMutedText: "text-slate-600",
  ctaBg: "bg-slate-900 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  surfaceMode: "light",
};

const DARK: ExpertContrastTokens = {
  pageBg: "#0f172a",
  heroText: "text-white",
  heroMutedText: "text-white/75",
  bodyText: "text-slate-50",
  mutedText: "text-slate-300",
  cardClass: "border border-slate-600/70 bg-slate-800 shadow-lg",
  cardText: "text-slate-50",
  cardMutedText: "text-slate-300",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-white/30 bg-white/10 text-white hover:bg-white/20",
  footerClass: "bg-slate-950 text-slate-300",
  faqText: "text-slate-50",
  faqMutedText: "text-slate-300",
  ctaBg: "bg-slate-950 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  surfaceMode: "dark",
};

export type ExpertResolvedVisuals = ExpertPresetVisualTokens &
  ExpertContrastTokens & {
    resolvedBackgroundStyle: MiniSiteTheme["backgroundStyle"];
    pageShellClass: string;
  };

export function getExpertPresetVisuals(presetId: ExpertThemePresetId): ExpertPresetVisualTokens {
  return EXPERT_PRESET_VISUALS[presetId] ?? EXPERT_PRESET_VISUALS.calm_green;
}

export function resolveExpertPresetVisuals(
  presetId: ExpertThemePresetId,
  backgroundStyle: MiniSiteTheme["backgroundStyle"] = "light",
): ExpertResolvedVisuals {
  const base = getExpertPresetVisuals(presetId);
  const style = backgroundStyle === "soft" || backgroundStyle === "dark" ? backgroundStyle : "light";
  const lightHero =
    base.heroTone === "light" || base.heroTone === "cream"
      ? { text: "text-slate-900", muted: "text-slate-600" }
      : { text: "text-white", muted: "text-white/75" };

  if (style === "dark") {
    return {
      ...base,
      ...DARK,
      resolvedBackgroundStyle: "dark",
      pageShellClass: "expert-bg-dark",
      mood: "dark",
      heroTone: "dark",
      heroClass:
        base.heroTone === "dark" || base.heroTone === "gradient" ? base.heroClass : DARK.ctaBg,
      sectionMainClass: "bg-slate-900",
      sectionAltClass: "bg-slate-800",
      cardClass: DARK.cardClass,
      statsClass: DARK.cardClass,
      ctaClass: base.ctaClass,
      footerClass: base.footerClass.includes("bg-white") ? DARK.footerClass : base.footerClass,
      backgroundColor: DARK.pageBg,
      buttonPrimaryText:
        base.id === "premium_dark" ? "text-slate-950" : DARK.primaryButtonText,
      primaryButtonText:
        base.id === "premium_dark" ? "text-slate-950" : DARK.primaryButtonText,
      heroText: "text-white",
      heroMutedText: "text-white/75",
    };
  }

  if (style === "soft") {
    return {
      ...base,
      ...LIGHT,
      resolvedBackgroundStyle: "soft",
      pageShellClass: "expert-bg-soft",
      pageBg: base.backgroundColor,
      backgroundColor: base.backgroundColor,
      sectionMainClass: base.sectionMainClass,
      sectionAltClass: base.sectionAltClass,
      heroClass: base.heroClass,
      heroText: lightHero.text,
      heroMutedText: lightHero.muted,
      cardClass: base.cardClass,
      cardText: "text-slate-950",
      cardMutedText: "text-slate-600",
      statsClass: base.statsClass,
      ctaClass: base.ctaClass,
      ctaBg: base.ctaClass,
      footerClass: base.footerClass,
      buttonPrimaryText: base.buttonPrimaryText,
      primaryButtonText: base.buttonPrimaryText,
      secondaryButtonBg:
        base.heroTone === "light" || base.heroTone === "cream"
          ? LIGHT.secondaryButtonBg
          : DARK.secondaryButtonBg,
      surfaceMode: "light",
    };
  }

  return {
    ...base,
    ...LIGHT,
    resolvedBackgroundStyle: "light",
    pageShellClass: "expert-bg-light",
    pageBg: "#ffffff",
    backgroundColor: "#ffffff",
    heroClass: base.heroClass,
    heroText: lightHero.text,
    heroMutedText: lightHero.muted,
    sectionMainClass: "bg-white",
    sectionAltClass: "bg-slate-50",
    cardClass: "border border-slate-200 bg-white shadow-sm",
    cardText: "text-slate-950",
    cardMutedText: "text-slate-600",
    statsClass: "border border-slate-200 bg-white",
    ctaClass: base.ctaClass,
    ctaBg: base.ctaClass,
    footerClass: base.footerClass,
    buttonPrimaryText: base.buttonPrimaryText,
    primaryButtonText: base.buttonPrimaryText,
    secondaryButtonBg:
      base.heroTone === "light" || base.heroTone === "cream"
        ? LIGHT.secondaryButtonBg
        : DARK.secondaryButtonBg,
  };
}
