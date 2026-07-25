/** Re-export Service typography helpers for Expert (shared stacks, no font files). */

export {
  SERVICE_FONT_PRESET_IDS as EXPERT_FONT_PRESET_IDS,
  SERVICE_FONT_PRESET_OPTIONS as EXPERT_FONT_PRESET_OPTIONS,
  buildServiceTypographyCss as buildExpertTypographyCss,
  buildServiceTypographyCssVars as buildExpertTypographyCssVars,
  coerceTypographyColorInput,
  createDefaultServiceTypography as createDefaultExpertTypography,
  normalizeServiceTypography as normalizeExpertTypography,
  resolveServiceTypography as resolveExpertTypography,
  sanitizeCustomFontFamily,
  sanitizeOptionalHexColor,
  tokenTextClass,
} from "@/lib/serviceTemplateTypography";

export type { ResolvedServiceTypography as ResolvedExpertTypography } from "@/lib/serviceTemplateTypography";
