import type {
  ServiceFontPresetId,
  ServiceTypographySettings,
} from "@/types/serviceTemplate";

export const SERVICE_FONT_PRESET_IDS = [
  "system_sans",
  "modern_sans",
  "rounded_sans",
  "corporate_sans",
  "elegant_serif",
  "editorial_serif",
  "mono_tech",
  "display_bold",
  "custom",
] as const satisfies readonly ServiceFontPresetId[];

/** Legacy preset ids mapped to reliable stacks (saved configs stay readable). */
const LEGACY_FONT_PRESET_MAP: Record<string, ServiceFontPresetId> = {
  inter: "modern_sans",
  manrope: "modern_sans",
  poppins: "modern_sans",
  montserrat: "modern_sans",
  roboto: "corporate_sans",
  lato: "corporate_sans",
  merriweather: "elegant_serif",
  playfair_display: "editorial_serif",
};

export const SERVICE_FONT_PRESET_OPTIONS: ReadonlyArray<{
  id: ServiceFontPresetId;
  label: string;
  stack: string;
  sample: string;
}> = [
  {
    id: "system_sans",
    label: "System Sans",
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sample: "Professional services",
  },
  {
    id: "modern_sans",
    label: "Modern Sans",
    stack: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
    sample: "Professional services",
  },
  {
    id: "rounded_sans",
    label: "Rounded Sans",
    stack: '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif',
    sample: "Professional services",
  },
  {
    id: "corporate_sans",
    label: "Corporate Sans",
    stack: "Arial, Helvetica, sans-serif",
    sample: "Professional services",
  },
  {
    id: "elegant_serif",
    label: "Elegant Serif",
    stack: 'Georgia, "Times New Roman", serif',
    sample: "Professional services",
  },
  {
    id: "editorial_serif",
    label: "Editorial Serif",
    stack: '"Palatino Linotype", Palatino, Georgia, serif',
    sample: "Professional services",
  },
  {
    id: "mono_tech",
    label: "Mono Tech",
    stack: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    sample: "Professional services",
  },
  {
    id: "display_bold",
    label: "Display Bold",
    stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    sample: "Professional services",
  },
  {
    id: "custom",
    label: "Custom",
    stack: "",
    sample: "Professional services",
  },
];

const FONT_STACK_BY_ID = Object.fromEntries(
  SERVICE_FONT_PRESET_OPTIONS.map((entry) => [entry.id, entry.stack]),
) as Record<ServiceFontPresetId, string>;

const CUSTOM_FONT_MAX_LENGTH = 80;

/** Strip injection vectors; keep a safe CSS font-family fragment only. */
export function sanitizeCustomFontFamily(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let value = raw.trim().slice(0, CUSTOM_FONT_MAX_LENGTH);
  if (!value) return "";
  if (/url\s*\(|expression|javascript:|@import|@charset/i.test(value)) {
    return "";
  }
  value = value.replace(/[;{}<>\\/@`]/g, "");
  value = value.replace(/[^a-zA-Z0-9\s,\-_'"\.]/g, "");
  value = value.replace(/\s+/g, " ").trim();
  return value.slice(0, CUSTOM_FONT_MAX_LENGTH);
}

/** Empty or invalid → "" (caller falls back to theme tokens). Complete hex only. */
export function sanitizeOptionalHexColor(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return "";
}

/**
 * Editor-safe color coerce: keeps in-progress #hex drafts so controlled inputs
 * are not wiped on each normalize pass; complete values are canonicalized.
 */
export function coerceTypographyColorInput(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().slice(0, 7);
  if (!trimmed) return "";
  const complete = sanitizeOptionalHexColor(trimmed);
  if (complete) return complete;
  if (/^#[0-9a-fA-F]{1,6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return "";
}

function asFontPreset(raw: unknown, fallback: ServiceFontPresetId): ServiceFontPresetId {
  const value = typeof raw === "string" ? raw.trim() : "";
  if ((SERVICE_FONT_PRESET_IDS as readonly string[]).includes(value)) {
    return value as ServiceFontPresetId;
  }
  if (value in LEGACY_FONT_PRESET_MAP) {
    return LEGACY_FONT_PRESET_MAP[value];
  }
  return fallback;
}

function asHeadingWeight(raw: unknown, fallback: ServiceTypographySettings["headingWeight"]) {
  const n = typeof raw === "number" ? raw : Number(raw);
  return n === 600 || n === 700 || n === 800 || n === 900 ? n : fallback;
}

function asBodyWeight(raw: unknown, fallback: ServiceTypographySettings["bodyWeight"]) {
  const n = typeof raw === "number" ? raw : Number(raw);
  return n === 400 || n === 500 ? n : fallback;
}

function asButtonWeight(raw: unknown, fallback: ServiceTypographySettings["buttonWeight"]) {
  const n = typeof raw === "number" ? raw : Number(raw);
  return n === 600 || n === 700 ? n : fallback;
}

export function createDefaultServiceTypography(): ServiceTypographySettings {
  return {
    headingFontPreset: "system_sans",
    bodyFontPreset: "system_sans",
    buttonFontPreset: "system_sans",
    customFontFamily: "",
    headingWeight: 800,
    bodyWeight: 400,
    buttonWeight: 700,
    headingColor: "",
    bodyColor: "",
    mutedColor: "",
    heroHeadingColor: "",
    heroBodyColor: "",
    accentTextColor: "",
    buttonTextColor: "",
    cardTextColor: "",
  };
}

export function normalizeServiceTypography(input: unknown): ServiceTypographySettings {
  const defaults = createDefaultServiceTypography();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return defaults;
  }
  const source = input as Record<string, unknown>;
  return {
    headingFontPreset: asFontPreset(
      source.headingFontPreset ?? source.heading_font_preset,
      defaults.headingFontPreset,
    ),
    bodyFontPreset: asFontPreset(
      source.bodyFontPreset ?? source.body_font_preset,
      defaults.bodyFontPreset,
    ),
    buttonFontPreset: asFontPreset(
      source.buttonFontPreset ?? source.button_font_preset,
      defaults.buttonFontPreset,
    ),
    customFontFamily: sanitizeCustomFontFamily(
      source.customFontFamily ?? source.custom_font_family,
    ),
    headingWeight: asHeadingWeight(
      source.headingWeight ?? source.heading_weight,
      defaults.headingWeight,
    ),
    bodyWeight: asBodyWeight(source.bodyWeight ?? source.body_weight, defaults.bodyWeight),
    buttonWeight: asButtonWeight(
      source.buttonWeight ?? source.button_weight,
      defaults.buttonWeight,
    ),
    headingColor: coerceTypographyColorInput(source.headingColor ?? source.heading_color),
    bodyColor: coerceTypographyColorInput(source.bodyColor ?? source.body_color),
    mutedColor: coerceTypographyColorInput(source.mutedColor ?? source.muted_color),
    heroHeadingColor: coerceTypographyColorInput(
      source.heroHeadingColor ?? source.hero_heading_color,
    ),
    heroBodyColor: coerceTypographyColorInput(source.heroBodyColor ?? source.hero_body_color),
    accentTextColor: coerceTypographyColorInput(
      source.accentTextColor ?? source.accent_text_color,
    ),
    buttonTextColor: coerceTypographyColorInput(
      source.buttonTextColor ?? source.button_text_color,
    ),
    cardTextColor: coerceTypographyColorInput(source.cardTextColor ?? source.card_text_color),
  };
}

function resolveFontFamily(
  preset: ServiceFontPresetId,
  customFontFamily: string,
): string {
  if (preset === "custom") {
    const custom = sanitizeCustomFontFamily(customFontFamily);
    return custom || FONT_STACK_BY_ID.system_sans;
  }
  return FONT_STACK_BY_ID[preset] || FONT_STACK_BY_ID.system_sans;
}

export type ResolvedServiceTypography = {
  headingFontFamily: string;
  bodyFontFamily: string;
  buttonFontFamily: string;
  headingWeight: ServiceTypographySettings["headingWeight"];
  bodyWeight: ServiceTypographySettings["bodyWeight"];
  buttonWeight: ServiceTypographySettings["buttonWeight"];
  headingColor: string | null;
  bodyColor: string | null;
  mutedColor: string | null;
  heroHeadingColor: string | null;
  heroBodyColor: string | null;
  accentTextColor: string | null;
  buttonTextColor: string | null;
  cardTextColor: string | null;
  /** accentTextColor → headingColor → null (theme fallback) */
  statValueColor: string | null;
  /** mutedColor → null (theme fallback) */
  statLabelColor: string | null;
  presets: Pick<
    ServiceTypographySettings,
    "headingFontPreset" | "bodyFontPreset" | "buttonFontPreset"
  >;
  customFontFamily: string;
};

export function resolveServiceTypography(
  input: ServiceTypographySettings | unknown,
): ResolvedServiceTypography {
  const typography = normalizeServiceTypography(input);
  const colorOrNull = (value: string) => {
    const complete = sanitizeOptionalHexColor(value);
    return complete || null;
  };
  const accentTextColor = colorOrNull(typography.accentTextColor);
  const headingColor = colorOrNull(typography.headingColor);
  const mutedColor = colorOrNull(typography.mutedColor);
  return {
    headingFontFamily: resolveFontFamily(
      typography.headingFontPreset,
      typography.customFontFamily,
    ),
    bodyFontFamily: resolveFontFamily(typography.bodyFontPreset, typography.customFontFamily),
    buttonFontFamily: resolveFontFamily(
      typography.buttonFontPreset,
      typography.customFontFamily,
    ),
    headingWeight: typography.headingWeight,
    bodyWeight: typography.bodyWeight,
    buttonWeight: typography.buttonWeight,
    headingColor,
    bodyColor: colorOrNull(typography.bodyColor),
    mutedColor,
    heroHeadingColor: colorOrNull(typography.heroHeadingColor),
    heroBodyColor: colorOrNull(typography.heroBodyColor),
    accentTextColor,
    buttonTextColor: colorOrNull(typography.buttonTextColor),
    cardTextColor: colorOrNull(typography.cardTextColor),
    statValueColor: accentTextColor ?? headingColor,
    statLabelColor: mutedColor,
    presets: {
      headingFontPreset: typography.headingFontPreset,
      bodyFontPreset: typography.bodyFontPreset,
      buttonFontPreset: typography.buttonFontPreset,
    },
    customFontFamily: typography.customFontFamily,
  };
}

/** CSS custom properties for the Service template root (only set when override is valid). */
export function buildServiceTypographyCssVars(
  typo: ResolvedServiceTypography,
): Record<string, string> {
  const vars: Record<string, string> = {
    "--service-font-heading": typo.headingFontFamily,
    "--service-font-body": typo.bodyFontFamily,
    "--service-font-button": typo.buttonFontFamily,
    "--service-heading-weight": String(typo.headingWeight),
    "--service-body-weight": String(typo.bodyWeight),
    "--service-button-weight": String(typo.buttonWeight),
  };
  if (typo.headingColor) vars["--service-heading-color"] = typo.headingColor;
  if (typo.bodyColor) vars["--service-body-color"] = typo.bodyColor;
  if (typo.mutedColor) vars["--service-muted-color"] = typo.mutedColor;
  if (typo.heroHeadingColor) vars["--service-hero-heading-color"] = typo.heroHeadingColor;
  if (typo.heroBodyColor) vars["--service-hero-body-color"] = typo.heroBodyColor;
  if (typo.accentTextColor) vars["--service-accent-text-color"] = typo.accentTextColor;
  if (typo.buttonTextColor) vars["--service-button-text-color"] = typo.buttonTextColor;
  if (typo.cardTextColor) vars["--service-card-text-color"] = typo.cardTextColor;
  if (typo.statValueColor) vars["--service-stat-value-color"] = typo.statValueColor;
  if (typo.statLabelColor) vars["--service-stat-label-color"] = typo.statLabelColor;
  return vars;
}

/**
 * Scoped CSS using CSS variables. Color rules only emit when overrides exist so
 * theme token Tailwind classes remain the fallback.
 */
export function buildServiceTypographyCss(
  rootAttrValue: string,
  typo: ResolvedServiceTypography,
): string {
  const root = `[data-service-root="${rootAttrValue}"]`;
  const lines: string[] = [
    `${root} {`,
    `  font-family: var(--service-font-body, inherit);`,
    `  font-weight: var(--service-body-weight, 400);`,
  ];
  if (typo.bodyColor) {
    lines.push(`  color: var(--service-body-color);`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .service-typo-heading, ${root} h1.service-typo-heading, ${root} h2.service-typo-heading, ${root} h3.service-typo-heading {`,
    `  font-family: var(--service-font-heading, inherit);`,
    `  font-weight: var(--service-heading-weight, 800);`,
  );
  if (typo.headingColor) {
    lines.push(`  color: var(--service-heading-color) !important;`);
  }
  lines.push(`}`);

  if (typo.heroHeadingColor) {
    lines.push(
      `${root} [data-service-hero-heading="true"], ${root} [data-testid$="-hero-title"] {`,
      `  color: var(--service-hero-heading-color) !important;`,
      `}`,
    );
  }
  if (typo.heroBodyColor) {
    lines.push(
      `${root} [data-service-hero-body="true"], ${root} [data-testid$="-hero-subtitle"] {`,
      `  color: var(--service-hero-body-color) !important;`,
      `}`,
    );
  }
  if (typo.mutedColor) {
    lines.push(
      `${root} .service-typo-muted { color: var(--service-muted-color) !important; }`,
    );
  }
  if (typo.accentTextColor) {
    lines.push(
      `${root} .service-typo-accent, ${root} [data-service-accent-text="true"] {`,
      `  color: var(--service-accent-text-color) !important;`,
      `}`,
    );
  }
  if (typo.cardTextColor) {
    lines.push(
      `${root} .service-typo-card, ${root} [data-service-card-text="true"] {`,
      `  color: var(--service-card-text-color) !important;`,
      `}`,
    );
  }
  if (typo.statValueColor) {
    lines.push(
      `${root} [data-service-stat-value="true"] { color: var(--service-stat-value-color) !important; }`,
    );
  }
  if (typo.statLabelColor) {
    lines.push(
      `${root} [data-service-stat-label="true"] { color: var(--service-stat-label-color) !important; }`,
    );
  }

  lines.push(
    `${root} [data-service-button="true"], ${root} .service-typo-button {`,
    `  font-family: var(--service-font-button, inherit);`,
    `  font-weight: var(--service-button-weight, 700);`,
  );
  if (typo.buttonTextColor) {
    lines.push(`  color: var(--service-button-text-color) !important;`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

/** Drop theme token text-color class when a manual override is active. */
export function tokenTextClass(override: string | null, tokenClass: string): string {
  return override ? "" : tokenClass;
}
