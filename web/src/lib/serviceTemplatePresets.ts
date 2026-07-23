import type { MiniSiteTheme } from "@/types/miniSite";
import type { ServiceThemePresetId } from "@/types/serviceTemplate";

/** Visual tokens that make each Service preset feel like a distinct design. */
export type ServicePresetVisualTokens = {
  id: ServiceThemePresetId;
  label: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: MiniSiteTheme["backgroundStyle"];
  buttonStyle: MiniSiteTheme["buttonStyle"];
  mood: "light" | "dark" | "warm" | "creative";
  heroTone: "dark" | "light" | "gradient" | "cream";
  bodyTone: "white" | "soft" | "cream" | "slate";
  cardTone: "elevated" | "bordered" | "soft" | "glass";
  statsTone: "dark-bar" | "light-bar" | "inline";
  pricingTone: "elevated" | "outlined" | "filled";
  ctaTone: "dark" | "primary" | "warm";
  footerTone: "dark" | "light" | "primary";
  heroClass: string;
  sectionAltClass: string;
  sectionMainClass: string;
  cardClass: string;
  statsClass: string;
  pricingCardClass: string;
  ctaClass: string;
  footerClass: string;
  buttonPrimaryText: string;
};

/** Readable contrast tokens derived from themePreset + backgroundStyle. */
export type ServiceContrastTokens = {
  pageBg: string;
  sectionBg: string;
  alternateSectionBg: string;
  heroBg: string;
  heroText: string;
  heroMutedText: string;
  bodyText: string;
  mutedText: string;
  cardBg: string;
  cardText: string;
  cardMutedText: string;
  border: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  accentText: string;
  footerBg: string;
  footerText: string;
  footerMutedText: string;
  pricingCardBg: string;
  pricingCardText: string;
  pricingCardMutedText: string;
  faqBg: string;
  faqText: string;
  faqMutedText: string;
  ctaBg: string;
  ctaText: string;
  ctaMutedText: string;
  statsBg: string;
  statsText: string;
  surfaceMode: "light" | "dark";
};

export const SERVICE_PRESET_VISUALS: Record<ServiceThemePresetId, ServicePresetVisualTokens> = {
  modern_green: {
    id: "modern_green",
    label: "Modern Green",
    primaryColor: "#15803d",
    accentColor: "#22c55e",
    backgroundColor: "#f0fdf4",
    backgroundStyle: "light",
    buttonStyle: "rounded",
    mood: "light",
    heroTone: "light",
    bodyTone: "white",
    cardTone: "elevated",
    statsTone: "light-bar",
    pricingTone: "elevated",
    ctaTone: "primary",
    footerTone: "dark",
    heroClass: "bg-gradient-to-br from-emerald-50 via-white to-green-100 text-slate-900",
    sectionAltClass: "bg-emerald-50/70",
    sectionMainClass: "bg-white",
    cardClass: "border border-emerald-100 bg-white shadow-md shadow-emerald-100/60",
    statsClass: "border-t border-emerald-100 bg-white",
    pricingCardClass: "border border-emerald-100 bg-white shadow-lg shadow-emerald-50",
    ctaClass: "bg-emerald-700 text-white",
    footerClass: "bg-emerald-950 text-emerald-100",
    buttonPrimaryText: "text-white",
  },
  premium_dark: {
    id: "premium_dark",
    label: "Premium Dark",
    primaryColor: "#eab308",
    accentColor: "#facc15",
    backgroundColor: "#0a0a0a",
    backgroundStyle: "dark",
    buttonStyle: "rounded",
    mood: "dark",
    heroTone: "dark",
    bodyTone: "slate",
    cardTone: "glass",
    statsTone: "dark-bar",
    pricingTone: "filled",
    ctaTone: "dark",
    footerTone: "dark",
    heroClass: "bg-slate-950 text-white",
    sectionAltClass: "bg-slate-100",
    sectionMainClass: "bg-white",
    cardClass: "border border-slate-200 bg-white shadow-xl shadow-slate-200/70",
    statsClass: "bg-slate-950 text-white",
    pricingCardClass: "border border-slate-800 bg-slate-950 text-white shadow-2xl",
    ctaClass: "bg-slate-950 text-white",
    footerClass: "bg-black text-slate-300",
    buttonPrimaryText: "text-slate-950",
  },
  ocean_blue: {
    id: "ocean_blue",
    label: "Ocean Blue",
    primaryColor: "#0369a1",
    accentColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    backgroundStyle: "light",
    buttonStyle: "rounded",
    mood: "light",
    heroTone: "gradient",
    bodyTone: "white",
    cardTone: "bordered",
    statsTone: "light-bar",
    pricingTone: "outlined",
    ctaTone: "primary",
    footerTone: "dark",
    heroClass: "bg-gradient-to-br from-sky-900 via-blue-800 to-cyan-700 text-white",
    sectionAltClass: "bg-sky-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-sky-200 bg-white shadow-sm",
    statsClass: "border border-sky-100 bg-sky-50",
    pricingCardClass: "border-2 border-sky-100 bg-white",
    ctaClass: "bg-sky-800 text-white",
    footerClass: "bg-slate-900 text-sky-100",
    buttonPrimaryText: "text-white",
  },
  royal_purple: {
    id: "royal_purple",
    label: "Royal Purple",
    primaryColor: "#7c3aed",
    accentColor: "#c4b5fd",
    backgroundColor: "#faf5ff",
    backgroundStyle: "soft",
    buttonStyle: "pill",
    mood: "creative",
    heroTone: "gradient",
    bodyTone: "soft",
    cardTone: "soft",
    statsTone: "inline",
    pricingTone: "elevated",
    ctaTone: "primary",
    footerTone: "primary",
    heroClass: "bg-gradient-to-br from-violet-950 via-purple-800 to-fuchsia-700 text-white",
    sectionAltClass: "bg-violet-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-violet-100 bg-white/90 shadow-lg shadow-violet-100/80 backdrop-blur",
    statsClass: "bg-violet-950/5",
    pricingCardClass: "border border-violet-200 bg-gradient-to-b from-white to-violet-50 shadow-xl",
    ctaClass: "bg-violet-700 text-white",
    footerClass: "bg-violet-950 text-violet-100",
    buttonPrimaryText: "text-white",
  },
  warm_orange: {
    id: "warm_orange",
    label: "Warm Orange",
    primaryColor: "#ea580c",
    accentColor: "#fb923c",
    backgroundColor: "#fff7ed",
    backgroundStyle: "soft",
    buttonStyle: "rounded",
    mood: "warm",
    heroTone: "cream",
    bodyTone: "cream",
    cardTone: "elevated",
    statsTone: "light-bar",
    pricingTone: "elevated",
    ctaTone: "warm",
    footerTone: "dark",
    heroClass: "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-slate-900",
    sectionAltClass: "bg-orange-50/80",
    sectionMainClass: "bg-[#fffdf9]",
    cardClass: "border border-orange-100 bg-white shadow-md shadow-orange-100/70",
    statsClass: "bg-white border border-orange-100",
    pricingCardClass: "border border-orange-200 bg-white shadow-lg",
    ctaClass: "bg-orange-600 text-white",
    footerClass: "bg-stone-900 text-orange-50",
    buttonPrimaryText: "text-white",
  },
  clean_white: {
    id: "clean_white",
    label: "Clean White",
    primaryColor: "#0f766e",
    accentColor: "#64748b",
    backgroundColor: "#ffffff",
    backgroundStyle: "light",
    buttonStyle: "square",
    mood: "light",
    heroTone: "light",
    bodyTone: "white",
    cardTone: "bordered",
    statsTone: "inline",
    pricingTone: "outlined",
    ctaTone: "primary",
    footerTone: "light",
    heroClass: "bg-white text-slate-900 border-b border-slate-200",
    sectionAltClass: "bg-slate-50",
    sectionMainClass: "bg-white",
    cardClass: "border border-slate-200 bg-white",
    statsClass: "bg-transparent",
    pricingCardClass: "border border-slate-200 bg-white",
    ctaClass: "bg-slate-900 text-white",
    footerClass: "bg-white text-slate-600 border-t border-slate-200",
    buttonPrimaryText: "text-white",
  },
};

export function getServicePresetVisuals(presetId: ServiceThemePresetId): ServicePresetVisualTokens {
  return SERVICE_PRESET_VISUALS[presetId] ?? SERVICE_PRESET_VISUALS.premium_dark;
}

export type ServiceResolvedVisuals = ServicePresetVisualTokens &
  ServiceContrastTokens & {
    resolvedBackgroundStyle: MiniSiteTheme["backgroundStyle"];
    pageShellClass: string;
  };

const LIGHT_SURFACE: ServiceContrastTokens = {
  pageBg: "#ffffff",
  sectionBg: "bg-white",
  alternateSectionBg: "bg-slate-50",
  heroBg: "bg-white text-slate-900",
  heroText: "text-slate-900",
  heroMutedText: "text-slate-600",
  bodyText: "text-slate-950",
  mutedText: "text-slate-600",
  cardBg: "border border-slate-200 bg-white shadow-sm",
  cardText: "text-slate-950",
  cardMutedText: "text-slate-600",
  border: "border-slate-200",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-slate-900/20 bg-white/80 text-slate-900 hover:bg-white",
  secondaryButtonText: "text-slate-900",
  accentText: "text-slate-700",
  footerBg: "bg-slate-950 text-slate-200",
  footerText: "text-slate-100",
  footerMutedText: "text-slate-400",
  pricingCardBg: "border border-slate-200 bg-white shadow-sm",
  pricingCardText: "text-slate-950",
  pricingCardMutedText: "text-slate-600",
  faqBg: "border border-slate-200 bg-white shadow-sm",
  faqText: "text-slate-950",
  faqMutedText: "text-slate-600",
  ctaBg: "bg-slate-900 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  statsBg: "border border-slate-200 bg-white",
  statsText: "text-slate-700",
  surfaceMode: "light",
};

const DARK_SURFACE: ServiceContrastTokens = {
  pageBg: "#0f172a",
  sectionBg: "bg-slate-900",
  alternateSectionBg: "bg-slate-800",
  heroBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white",
  heroText: "text-white",
  heroMutedText: "text-white/75",
  bodyText: "text-slate-50",
  mutedText: "text-slate-300",
  cardBg: "border border-slate-600/70 bg-slate-800 shadow-lg shadow-black/25",
  cardText: "text-slate-50",
  cardMutedText: "text-slate-300",
  border: "border-slate-600",
  primaryButtonText: "text-white",
  secondaryButtonBg: "border border-white/30 bg-white/10 text-white hover:bg-white/20",
  secondaryButtonText: "text-white",
  accentText: "text-slate-200",
  footerBg: "bg-slate-950 text-slate-300",
  footerText: "text-slate-100",
  footerMutedText: "text-slate-400",
  pricingCardBg: "border border-slate-600 bg-slate-800 shadow-xl shadow-black/30",
  pricingCardText: "text-slate-50",
  pricingCardMutedText: "text-slate-300",
  faqBg: "border border-slate-600 bg-slate-800 shadow-lg",
  faqText: "text-slate-50",
  faqMutedText: "text-slate-300",
  ctaBg: "bg-slate-950 text-white",
  ctaText: "text-white",
  ctaMutedText: "text-white/80",
  statsBg: "bg-slate-950 text-white border border-slate-700",
  statsText: "text-slate-200",
  surfaceMode: "dark",
};

/**
 * Combines themePreset mood with backgroundStyle surface mode.
 * Theme controls brand accents/hero identity; backgroundStyle controls readable surfaces + text.
 */
export function resolveServicePresetVisuals(
  presetId: ServiceThemePresetId,
  backgroundStyle: MiniSiteTheme["backgroundStyle"] = "light",
): ServiceResolvedVisuals {
  const base = getServicePresetVisuals(presetId);
  const style = backgroundStyle === "soft" || backgroundStyle === "dark" ? backgroundStyle : "light";

  if (style === "dark") {
    const heroKeepsBrand =
      base.heroTone === "dark" || base.heroTone === "gradient" ? base.heroClass : DARK_SURFACE.heroBg;
    const ctaKeepsBrand =
      base.ctaTone === "primary" || base.ctaTone === "warm" ? base.ctaClass : DARK_SURFACE.ctaBg;
    const footerKeepsBrand =
      base.footerTone === "primary" ? base.footerClass : DARK_SURFACE.footerBg;

    return {
      ...base,
      ...DARK_SURFACE,
      resolvedBackgroundStyle: "dark",
      pageShellClass: "service-bg-dark",
      mood: "dark",
      heroTone: "dark",
      heroClass: heroKeepsBrand,
      heroBg: heroKeepsBrand,
      sectionMainClass: DARK_SURFACE.sectionBg,
      sectionAltClass: DARK_SURFACE.alternateSectionBg,
      cardClass: DARK_SURFACE.cardBg,
      statsClass: DARK_SURFACE.statsBg,
      pricingCardClass: DARK_SURFACE.pricingCardBg,
      ctaClass: ctaKeepsBrand,
      ctaBg: ctaKeepsBrand,
      footerClass: footerKeepsBrand,
      footerBg: footerKeepsBrand,
      backgroundColor: DARK_SURFACE.pageBg,
      buttonPrimaryText:
        base.id === "premium_dark" ? "text-slate-950" : DARK_SURFACE.primaryButtonText,
      primaryButtonText:
        base.id === "premium_dark" ? "text-slate-950" : DARK_SURFACE.primaryButtonText,
    };
  }

  if (style === "soft") {
    // Soft = tinted bands + elevated light cards with dark text (always readable)
    return {
      ...base,
      ...LIGHT_SURFACE,
      resolvedBackgroundStyle: "soft",
      pageShellClass: "service-bg-soft",
      pageBg: base.backgroundColor,
      backgroundColor: base.backgroundColor,
      sectionBg: base.sectionMainClass || "bg-white",
      alternateSectionBg: base.sectionAltClass,
      sectionMainClass: base.sectionMainClass || "bg-white",
      sectionAltClass: base.sectionAltClass,
      heroBg: base.heroClass,
      heroClass: base.heroClass,
      heroText:
        base.heroTone === "light" || base.heroTone === "cream"
          ? "text-slate-900"
          : "text-white",
      heroMutedText:
        base.heroTone === "light" || base.heroTone === "cream"
          ? "text-slate-600"
          : "text-white/75",
      cardBg: base.cardClass,
      cardClass: base.cardClass,
      // Force readable dark text on soft-mode cards regardless of preset pricing tone
      cardText: "text-slate-950",
      cardMutedText: "text-slate-600",
      pricingCardBg: base.pricingCardClass.includes("bg-slate-950")
        ? "border border-slate-200 bg-white shadow-lg"
        : base.pricingCardClass,
      pricingCardClass: base.pricingCardClass.includes("bg-slate-950")
        ? "border border-slate-200 bg-white shadow-lg"
        : base.pricingCardClass,
      pricingCardText: "text-slate-950",
      pricingCardMutedText: "text-slate-600",
      statsBg: base.statsClass.includes("bg-slate-950")
        ? "border border-slate-200 bg-white"
        : base.statsClass,
      statsClass: base.statsClass.includes("bg-slate-950")
        ? "border border-slate-200 bg-white"
        : base.statsClass,
      statsText: "text-slate-700",
      faqBg: base.cardClass,
      faqText: "text-slate-950",
      faqMutedText: "text-slate-600",
      ctaBg: base.ctaClass,
      ctaClass: base.ctaClass,
      ctaText: "text-white",
      ctaMutedText: "text-white/80",
      footerBg: base.footerClass,
      footerClass: base.footerClass,
      footerText: base.footerTone === "light" ? "text-slate-700" : "text-slate-100",
      footerMutedText: base.footerTone === "light" ? "text-slate-500" : "text-slate-400",
      secondaryButtonBg:
        base.heroTone === "light" || base.heroTone === "cream"
          ? LIGHT_SURFACE.secondaryButtonBg
          : DARK_SURFACE.secondaryButtonBg,
      surfaceMode: "light",
      buttonPrimaryText: base.buttonPrimaryText,
      primaryButtonText: base.buttonPrimaryText,
    };
  }

  // light — clean white surfaces; keep brand hero/CTA/footer identity
  const lightHeroText =
    base.heroTone === "light" || base.heroTone === "cream" ? "text-slate-900" : "text-white";
  const lightHeroMuted =
    base.heroTone === "light" || base.heroTone === "cream" ? "text-slate-600" : "text-white/75";

  return {
    ...base,
    ...LIGHT_SURFACE,
    resolvedBackgroundStyle: "light",
    pageShellClass: "service-bg-light",
    pageBg: "#ffffff",
    backgroundColor: "#ffffff",
    heroBg: base.heroClass,
    heroClass: base.heroClass,
    heroText: lightHeroText,
    heroMutedText: lightHeroMuted,
    sectionMainClass: "bg-white",
    sectionAltClass: "bg-slate-50",
    sectionBg: "bg-white",
    alternateSectionBg: "bg-slate-50",
    cardClass: "border border-slate-200 bg-white shadow-sm",
    cardBg: "border border-slate-200 bg-white shadow-sm",
    cardText: "text-slate-950",
    cardMutedText: "text-slate-600",
    statsClass: "border border-slate-200 bg-white",
    statsBg: "border border-slate-200 bg-white",
    statsText: "text-slate-700",
    pricingCardClass: "border border-slate-200 bg-white shadow-sm",
    pricingCardBg: "border border-slate-200 bg-white shadow-sm",
    pricingCardText: "text-slate-950",
    pricingCardMutedText: "text-slate-600",
    faqBg: "border border-slate-200 bg-white shadow-sm",
    faqText: "text-slate-950",
    faqMutedText: "text-slate-600",
    ctaClass: base.ctaClass,
    ctaBg: base.ctaClass,
    ctaText: "text-white",
    ctaMutedText: "text-white/80",
    footerClass: base.footerClass,
    footerBg: base.footerClass,
    footerText: base.footerTone === "light" ? "text-slate-700" : "text-slate-100",
    footerMutedText: base.footerTone === "light" ? "text-slate-500" : "text-slate-400",
    secondaryButtonBg:
      base.heroTone === "light" || base.heroTone === "cream"
        ? LIGHT_SURFACE.secondaryButtonBg
        : DARK_SURFACE.secondaryButtonBg,
    surfaceMode: "light",
    buttonPrimaryText: base.buttonPrimaryText,
    primaryButtonText: base.buttonPrimaryText,
  };
}
