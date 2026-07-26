/**
 * Portfolio typography — dedicated --portfolio-* CSS vars and portfolio-typo-* classes.
 * Reuses Service font presets / resolve/normalize helpers; does NOT use service-typo-* selectors.
 */
import {
  SERVICE_FONT_PRESET_IDS,
  SERVICE_FONT_PRESET_OPTIONS,
  coerceTypographyColorInput,
  createDefaultServiceTypography,
  normalizeServiceTypography,
  resolveServiceTypography,
  sanitizeCustomFontFamily,
  tokenTextClass,
  type ResolvedServiceTypography,
} from "@/lib/serviceTemplateTypography";
import type { ServiceTypographySettings } from "@/types/serviceTemplate";

export const PORTFOLIO_FONT_PRESET_IDS = SERVICE_FONT_PRESET_IDS;
export const PORTFOLIO_FONT_PRESET_OPTIONS = SERVICE_FONT_PRESET_OPTIONS;
export {
  coerceTypographyColorInput,
  sanitizeCustomFontFamily,
  tokenTextClass,
};

export type ResolvedPortfolioTypography = ResolvedServiceTypography;
export type PortfolioTypographySettings = ServiceTypographySettings;

export const createDefaultPortfolioTypography = createDefaultServiceTypography;
export const normalizePortfolioTypography = normalizeServiceTypography;
export const resolvePortfolioTypography = resolveServiceTypography;

/** CSS custom properties on Portfolio root (only set color vars when override is valid). */
export function buildPortfolioTypographyCssVars(
  typo: ResolvedPortfolioTypography,
): Record<string, string> {
  const vars: Record<string, string> = {
    "--portfolio-heading-font": typo.headingFontFamily,
    "--portfolio-body-font": typo.bodyFontFamily,
    "--portfolio-button-font": typo.buttonFontFamily,
    "--portfolio-heading-weight": String(typo.headingWeight),
    "--portfolio-body-weight": String(typo.bodyWeight),
    "--portfolio-button-weight": String(typo.buttonWeight),
  };
  if (typo.headingColor) vars["--portfolio-heading-color"] = typo.headingColor;
  if (typo.bodyColor) vars["--portfolio-body-color"] = typo.bodyColor;
  if (typo.mutedColor) vars["--portfolio-muted-color"] = typo.mutedColor;
  if (typo.heroHeadingColor) vars["--portfolio-hero-heading-color"] = typo.heroHeadingColor;
  if (typo.heroBodyColor) vars["--portfolio-hero-body-color"] = typo.heroBodyColor;
  if (typo.accentTextColor) vars["--portfolio-accent-text-color"] = typo.accentTextColor;
  if (typo.buttonTextColor) vars["--portfolio-button-text-color"] = typo.buttonTextColor;
  if (typo.cardTextColor) vars["--portfolio-card-text-color"] = typo.cardTextColor;
  if (typo.statValueColor) vars["--portfolio-stat-value-color"] = typo.statValueColor;
  if (typo.statLabelColor) vars["--portfolio-stat-label-color"] = typo.statLabelColor;
  return vars;
}

/**
 * Scoped Portfolio CSS. Color rules only emit when overrides exist so theme
 * Tailwind token classes remain the fallback when fields are empty.
 */
export function buildPortfolioTypographyCss(
  rootAttrValue: string,
  typo: ResolvedPortfolioTypography,
): string {
  const root = `[data-portfolio-root="${rootAttrValue}"]`;
  const lines: string[] = [
    `${root} {`,
    `  font-family: var(--portfolio-body-font, inherit);`,
    `  font-weight: var(--portfolio-body-weight, 400);`,
  ];
  if (typo.bodyColor) {
    lines.push(`  color: var(--portfolio-body-color);`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-heading {`,
    `  font-family: var(--portfolio-heading-font, inherit);`,
    `  font-weight: var(--portfolio-heading-weight, 800);`,
  );
  if (typo.headingColor) {
    lines.push(`  color: var(--portfolio-heading-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-body {`,
    `  font-family: var(--portfolio-body-font, inherit);`,
    `  font-weight: var(--portfolio-body-weight, 400);`,
  );
  if (typo.bodyColor) {
    lines.push(`  color: var(--portfolio-body-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-muted {`,
    `  font-family: var(--portfolio-body-font, inherit);`,
  );
  if (typo.mutedColor) {
    lines.push(`  color: var(--portfolio-muted-color) !important;`);
  } else if (typo.bodyColor) {
    lines.push(`  color: var(--portfolio-body-color);`);
    lines.push(`  opacity: 0.78;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-hero-heading {`,
    `  font-family: var(--portfolio-heading-font, inherit);`,
    `  font-weight: var(--portfolio-heading-weight, 800);`,
  );
  if (typo.heroHeadingColor) {
    lines.push(`  color: var(--portfolio-hero-heading-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-hero-body {`,
    `  font-family: var(--portfolio-body-font, inherit);`,
    `  font-weight: var(--portfolio-body-weight, 400);`,
  );
  if (typo.heroBodyColor) {
    lines.push(`  color: var(--portfolio-hero-body-color) !important;`);
  } else if (typo.bodyColor) {
    lines.push(`  color: var(--portfolio-body-color) !important;`);
  }
  lines.push(`}`);

  lines.push(`${root} .portfolio-typo-accent {`);
  if (typo.accentTextColor) {
    lines.push(`  color: var(--portfolio-accent-text-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-button {`,
    `  font-family: var(--portfolio-button-font, inherit);`,
    `  font-weight: var(--portfolio-button-weight, 700);`,
  );
  if (typo.buttonTextColor) {
    lines.push(`  color: var(--portfolio-button-text-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-card {`,
    `  font-family: var(--portfolio-body-font, inherit);`,
  );
  if (typo.cardTextColor) {
    lines.push(`  color: var(--portfolio-card-text-color) !important;`);
  } else if (typo.bodyColor) {
    lines.push(`  color: var(--portfolio-body-color) !important;`);
  }
  lines.push(`}`);

  lines.push(
    `${root} .portfolio-typo-card-title {`,
    `  font-family: var(--portfolio-heading-font, inherit);`,
    `  font-weight: var(--portfolio-heading-weight, 700);`,
  );
  if (typo.cardTextColor) {
    lines.push(`  color: var(--portfolio-card-text-color) !important;`);
  } else if (typo.headingColor) {
    lines.push(`  color: var(--portfolio-heading-color) !important;`);
  }
  lines.push(`}`);

  if (typo.statValueColor || typo.accentTextColor) {
    lines.push(`${root} .portfolio-typo-stat-value {`);
    if (typo.statValueColor) {
      lines.push(`  color: var(--portfolio-stat-value-color) !important;`);
    } else if (typo.accentTextColor) {
      lines.push(`  color: var(--portfolio-accent-text-color) !important;`);
    }
    lines.push(`}`);
  }

  lines.push(`${root} .portfolio-typo-stat-label {`);
  if (typo.statLabelColor) {
    lines.push(`  color: var(--portfolio-stat-label-color) !important;`);
  } else if (typo.mutedColor) {
    lines.push(`  color: var(--portfolio-muted-color) !important;`);
  } else if (typo.heroBodyColor) {
    lines.push(`  color: var(--portfolio-hero-body-color) !important;`);
  }
  lines.push(`}`);

  return lines.join("\n");
}
