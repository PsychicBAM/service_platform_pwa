import type {
  ServiceFontPresetId,
  ServiceTypographySettings,
} from "@/types/serviceTemplate";

export const SERVICE_FONT_PRESET_IDS = [
  "system_sans",
  "inter",
  "manrope",
  "poppins",
  "montserrat",
  "roboto",
  "lato",
  "merriweather",
  "playfair_display",
  "custom",
] as const satisfies readonly ServiceFontPresetId[];

export const SERVICE_FONT_PRESET_OPTIONS: ReadonlyArray<{
  id: ServiceFontPresetId;
  label: string;
  stack: string;
}> = [
  {
    id: "system_sans",
    label: "System Sans",
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "inter",
    label: "Inter / UI Sans",
    stack: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    id: "manrope",
    label: "Manrope",
    stack: 'Manrope, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "poppins",
    label: "Poppins",
    stack: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "montserrat",
    label: "Montserrat",
    stack: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "roboto",
    label: "Roboto",
    stack: 'Roboto, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lato",
    label: "Lato",
    stack: 'Lato, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "merriweather",
    label: "Merriweather",
    stack: 'Merriweather, Georgia, "Times New Roman", serif',
  },
  {
    id: "playfair_display",
    label: "Playfair Display",
    stack: '"Playfair Display", Georgia, "Times New Roman", serif',
  },
  {
    id: "custom",
    label: "Custom",
    stack: "",
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
  return (SERVICE_FONT_PRESET_IDS as readonly string[]).includes(value)
    ? (value as ServiceFontPresetId)
    : fallback;
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
    headingColor: colorOrNull(typography.headingColor),
    bodyColor: colorOrNull(typography.bodyColor),
    mutedColor: colorOrNull(typography.mutedColor),
    heroHeadingColor: colorOrNull(typography.heroHeadingColor),
    heroBodyColor: colorOrNull(typography.heroBodyColor),
    accentTextColor: colorOrNull(typography.accentTextColor),
    buttonTextColor: colorOrNull(typography.buttonTextColor),
    cardTextColor: colorOrNull(typography.cardTextColor),
    presets: {
      headingFontPreset: typography.headingFontPreset,
      bodyFontPreset: typography.bodyFontPreset,
      buttonFontPreset: typography.buttonFontPreset,
    },
    customFontFamily: typography.customFontFamily,
  };
}

/** Scoped CSS that applies typography overrides without rewriting every node. */
export function buildServiceTypographyCss(
  rootAttrValue: string,
  typo: ResolvedServiceTypography,
): string {
  const root = `[data-service-root="${rootAttrValue}"]`;
  const lines: string[] = [
    `${root} {`,
    `  font-family: ${typo.bodyFontFamily};`,
    `  font-weight: ${typo.bodyWeight};`,
  ];
  if (typo.bodyColor) {
    lines.push(`  color: ${typo.bodyColor};`);
  }
  lines.push(`}`);
  lines.push(
    `${root} h1, ${root} h2, ${root} h3 {`,
    `  font-family: ${typo.headingFontFamily};`,
    `  font-weight: ${typo.headingWeight};`,
  );
  if (typo.headingColor) {
    lines.push(`  color: ${typo.headingColor} !important;`);
  }
  lines.push(`}`);
  if (typo.heroHeadingColor) {
    lines.push(
      `${root} [data-testid$="-hero-title"] { color: ${typo.heroHeadingColor} !important; }`,
    );
  }
  if (typo.heroBodyColor) {
    lines.push(
      `${root} [data-testid$="-hero-subtitle"] { color: ${typo.heroBodyColor} !important; }`,
    );
  }
  if (typo.mutedColor) {
    lines.push(`${root} .service-typo-muted { color: ${typo.mutedColor} !important; }`);
  }
  if (typo.accentTextColor) {
    lines.push(`${root} .service-typo-accent { color: ${typo.accentTextColor} !important; }`);
  }
  if (typo.cardTextColor) {
    lines.push(`${root} .service-typo-card { color: ${typo.cardTextColor} !important; }`);
  }
  lines.push(
    `${root} [data-service-button="true"], ${root} .service-typo-button {`,
    `  font-family: ${typo.buttonFontFamily};`,
    `  font-weight: ${typo.buttonWeight};`,
  );
  if (typo.buttonTextColor) {
    lines.push(`  color: ${typo.buttonTextColor} !important;`);
  }
  lines.push(`}`);
  return lines.join("\n");
}
