import type { MiniSiteTheme } from "@/types/miniSite";
import type { PortfolioThemePresetId } from "@/types/portfolioTemplate";

export type PortfolioPresetVisualTokens = {
  id: PortfolioThemePresetId;
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

type Contrast = {
  pageBg: string;
  heroText: string;
  heroMutedText: string;
  bodyText: string;
  mutedText: string;
  cardText: string;
  cardMutedText: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  ctaBg: string;
  ctaText: string;
  ctaMutedText: string;
  surfaceMode: "light" | "dark";
};

const make = (
  id: PortfolioThemePresetId,
  label: string,
  primaryColor: string,
  accentColor: string,
  backgroundColor: string,
  backgroundStyle: MiniSiteTheme["backgroundStyle"],
  mood: PortfolioPresetVisualTokens["mood"],
  heroClass: string,
  heroTone: PortfolioPresetVisualTokens["heroTone"],
): PortfolioPresetVisualTokens => ({
  id,
  label,
  primaryColor,
  accentColor,
  backgroundColor,
  backgroundStyle,
  buttonStyle:
    id === "minimal_white" ? "square" : id === "creative_purple" ? "pill" : "rounded",
  mood,
  heroTone,
  heroClass,
  sectionAltClass: mood === "dark" ? "bg-slate-900" : "bg-slate-50",
  sectionMainClass: mood === "dark" ? "bg-slate-950" : "bg-white",
  cardClass:
    mood === "dark"
      ? "border border-slate-700/80 bg-slate-900/95 shadow-lg shadow-black/20"
      : "border border-slate-200/90 bg-white shadow-sm",
  statsClass:
    mood === "dark" ? "border border-slate-700 bg-slate-900" : "border border-slate-200 bg-white",
  ctaClass: mood === "dark" ? "bg-slate-950 text-white" : "bg-slate-900 text-white",
  footerClass: mood === "dark" ? "bg-black text-slate-300" : "bg-slate-950 text-slate-200",
  buttonPrimaryText: "text-white",
});

export const PORTFOLIO_PRESET_VISUALS: Record<
  PortfolioThemePresetId,
  PortfolioPresetVisualTokens
> = {
  neon_noir: make(
    "neon_noir",
    "Neon Noir",
    "#5E34FF",
    "#A78BFA",
    "#110c1f",
    "dark",
    "dark",
    "bg-gradient-to-br from-black via-violet-950 to-[#27114f] text-white",
    "dark",
  ),
  creative_purple: make(
    "creative_purple",
    "Creative Purple",
    "#5E34FF",
    "#C4B5FD",
    "#f8f5ff",
    "soft",
    "creative",
    "bg-gradient-to-br from-violet-950 via-purple-700 to-fuchsia-700 text-white",
    "gradient",
  ),
  minimal_white: make(
    "minimal_white",
    "Minimal White",
    "#111827",
    "#475569",
    "#ffffff",
    "light",
    "light",
    "bg-white text-slate-950 border-b border-slate-200",
    "light",
  ),
  gallery_cream: make(
    "gallery_cream",
    "Gallery Cream",
    "#3f3528",
    "#9a7b4f",
    "#f7f2e8",
    "soft",
    "warm",
    "bg-gradient-to-br from-[#f8f1e4] to-[#e9ddc9] text-stone-900",
    "cream",
  ),
  ocean_studio: make(
    "ocean_studio",
    "Ocean Studio",
    "#075985",
    "#38bdf8",
    "#edf8ff",
    "light",
    "creative",
    "bg-gradient-to-br from-sky-950 via-blue-800 to-cyan-700 text-white",
    "gradient",
  ),
  warm_editorial: make(
    "warm_editorial",
    "Warm Editorial",
    "#24201c",
    "#a3402c",
    "#f4f1eb",
    "soft",
    "warm",
    "bg-gradient-to-br from-[#24201c] via-[#44342e] to-[#5c3c35] text-white",
    "dark",
  ),
  graphite: make(
    "graphite",
    "Graphite",
    "#d1d5db",
    "#94a3b8",
    "#111827",
    "dark",
    "dark",
    "bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#334155] text-white",
    "dark",
  ),
};

const LIGHT: Contrast = {
  pageBg: "#fff",
  heroText: "text-slate-950",
  heroMutedText: "text-slate-600",
  bodyText: "text-slate-950",
  mutedText: "text-slate-600",
  cardText: "text-slate-950",
  cardMutedText: "text-slate-600",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-slate-900/20 bg-white/80 text-slate-900",
  ctaBg: "bg-slate-900 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  surfaceMode: "light",
};

const DARK: Contrast = {
  pageBg: "#0f172a",
  heroText: "text-white",
  heroMutedText: "text-white/75",
  bodyText: "text-slate-50",
  mutedText: "text-slate-300",
  cardText: "text-slate-50",
  cardMutedText: "text-slate-300",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-white/30 bg-white/10 text-white",
  ctaBg: "bg-slate-950 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  surfaceMode: "dark",
};

export type PortfolioResolvedVisuals = PortfolioPresetVisualTokens &
  Contrast & {
    resolvedBackgroundStyle: MiniSiteTheme["backgroundStyle"];
    pageShellClass: string;
  };

export function getPortfolioPresetVisuals(presetId: PortfolioThemePresetId) {
  return PORTFOLIO_PRESET_VISUALS[presetId] ?? PORTFOLIO_PRESET_VISUALS.creative_purple;
}

export function resolvePortfolioPresetVisuals(
  presetId: PortfolioThemePresetId,
  backgroundStyle: MiniSiteTheme["backgroundStyle"] = "light",
): PortfolioResolvedVisuals {
  const base = getPortfolioPresetVisuals(presetId);
  const style =
    backgroundStyle === "soft" || backgroundStyle === "dark" ? backgroundStyle : "light";
  const lightHero =
    base.heroTone === "light" || base.heroTone === "cream"
      ? { text: "text-slate-950", muted: "text-slate-600" }
      : { text: "text-white", muted: "text-white/75" };
  const darkHeroSecondary =
    base.heroTone === "light" || base.heroTone === "cream"
      ? LIGHT.secondaryButtonBg
      : DARK.secondaryButtonBg;

  if (style === "dark") {
    return {
      ...base,
      ...DARK,
      resolvedBackgroundStyle: "dark",
      pageShellClass: "portfolio-bg-dark",
      mood: "dark",
      heroTone: "dark",
      heroClass:
        base.heroTone === "dark" || base.heroTone === "gradient" ? base.heroClass : DARK.ctaBg,
      sectionMainClass: "bg-slate-950",
      sectionAltClass: "bg-slate-900",
      cardClass:
        "border border-slate-700/80 bg-slate-900/95 shadow-lg shadow-black/20",
      statsClass: "border border-slate-700 bg-slate-900/80",
      footerClass: base.footerClass,
      backgroundColor: DARK.pageBg,
      pageBg: DARK.pageBg,
      primaryButtonText: base.buttonPrimaryText,
      heroText: "text-white",
      heroMutedText: "text-white/75",
      secondaryButtonBg: DARK.secondaryButtonBg,
    };
  }

  if (style === "soft") {
    return {
      ...base,
      ...LIGHT,
      resolvedBackgroundStyle: "soft",
      pageShellClass: "portfolio-bg-soft",
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
      footerClass: base.footerClass,
      primaryButtonText: base.buttonPrimaryText,
      secondaryButtonBg: darkHeroSecondary,
      surfaceMode: "light",
    };
  }

  return {
    ...base,
    ...LIGHT,
    resolvedBackgroundStyle: "light",
    pageShellClass: "portfolio-bg-light",
    pageBg: "#ffffff",
    backgroundColor: "#ffffff",
    heroClass: base.heroClass,
    heroText: lightHero.text,
    heroMutedText: lightHero.muted,
    sectionMainClass: "bg-white",
    sectionAltClass: "bg-slate-50",
    cardClass: "border border-slate-200/90 bg-white shadow-sm",
    cardText: "text-slate-950",
    cardMutedText: "text-slate-600",
    statsClass: "border border-slate-200 bg-white",
    footerClass: base.footerClass,
    primaryButtonText: base.buttonPrimaryText,
    secondaryButtonBg: darkHeroSecondary,
    surfaceMode: "light",
  };
}
