import { toPublicPlanId, type PublicPlanId } from "@/components/admin/payments/paymentsPlanCatalog";
import { MINI_SITE_TEMPLATES, type MiniSiteTemplate } from "@/types/miniSite";
import type { PublicPageVariant } from "@/types/api";

/** Payments & Billing upgrade destination for Mini-site CTAs. */
export const MINI_SITE_UPGRADE_HREF = "/admin/settings?tab=payments";

/** Library selection for the original standard public business page (not a mini-site template). */
export const MINI_SITE_DEFAULT_SELECTION = "standard" as const;

export type MiniSiteLibrarySelection = typeof MINI_SITE_DEFAULT_SELECTION | MiniSiteTemplate;

export function getMiniSitePlanId(plan?: string | null): PublicPlanId {
  return toPublicPlanId(plan);
}

export function isProPlan(plan?: string | null): boolean {
  return getMiniSitePlanId(plan) === "pro";
}

export function isBusinessPlan(plan?: string | null): boolean {
  return getMiniSitePlanId(plan) === "business";
}

/** Free / Starter: page visible; Default profile available. Business / Pro: mini-site editor available. */
export function canUseMiniSite(plan?: string | null): boolean {
  const id = getMiniSitePlanId(plan);
  return id === "business" || id === "pro";
}

/** Alias for plan-aware mini-site template editor access. */
export function canEditMiniSite(plan?: string | null): boolean {
  return canUseMiniSite(plan);
}

/** Default business profile is available on every plan. */
export function canUseDefaultProfile(_plan?: string | null): boolean {
  return true;
}

export function getAllowedMiniSiteTemplates(plan?: string | null): MiniSiteTemplate[] {
  const id = getMiniSitePlanId(plan);
  if (id === "pro") {
    return [...MINI_SITE_TEMPLATES];
  }
  if (id === "business") {
    return ["clean"];
  }
  return [];
}

export function canUseTemplate(plan: string | null | undefined, template: MiniSiteTemplate): boolean {
  return getAllowedMiniSiteTemplates(plan).includes(template);
}

export function canSelectLibraryOption(
  plan: string | null | undefined,
  selection: MiniSiteLibrarySelection,
): boolean {
  if (selection === MINI_SITE_DEFAULT_SELECTION) {
    return canUseDefaultProfile(plan);
  }
  return canUseTemplate(plan, selection);
}

/** Live preview is allowed for any template the plan can edit. */
export function canPreviewTemplate(
  plan: string | null | undefined,
  template: MiniSiteTemplate,
): boolean {
  return canUseTemplate(plan, template);
}

/**
 * Resolve an editable template for the plan.
 * Falls back to the first allowed template (Clean for Business) when current is locked.
 */
export function resolveEditableTemplate(
  plan: string | null | undefined,
  template: MiniSiteTemplate | string | null | undefined,
): MiniSiteTemplate | null {
  const allowed = getAllowedMiniSiteTemplates(plan);
  if (allowed.length === 0) {
    return null;
  }
  const key = typeof template === "string" ? template.trim().toLowerCase() : "";
  if (key && allowed.includes(key as MiniSiteTemplate)) {
    return key as MiniSiteTemplate;
  }
  return allowed[0] ?? null;
}

export function isTemplateLocked(plan: string | null | undefined, template: MiniSiteTemplate): boolean {
  return !canUseTemplate(plan, template);
}

export function librarySelectionFromVariant(
  variant: PublicPageVariant | string | null | undefined,
  template?: MiniSiteTemplate | null,
  plan?: string | null,
): MiniSiteLibrarySelection {
  if (variant === "mini_site") {
    const editable = resolveEditableTemplate(plan, template);
    if (editable) {
      return editable;
    }
    // Eligible plans without an allowed template still land on Clean when possible.
    return canUseTemplate(plan, "clean") ? "clean" : MINI_SITE_DEFAULT_SELECTION;
  }
  return MINI_SITE_DEFAULT_SELECTION;
}

export function getMiniSitePlanLabel(plan?: string | null): string {
  const id = getMiniSitePlanId(plan);
  return id.charAt(0).toUpperCase() + id.slice(1);
}
