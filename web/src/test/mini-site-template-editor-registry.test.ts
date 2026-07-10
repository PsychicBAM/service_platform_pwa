import { describe, expect, it } from "vitest";
import {
  getAllMiniSiteTemplateEditorDefinitions,
  getMiniSiteTemplateEditorDefinition,
  isMiniSiteEditorBlockLabelForTemplate,
} from "@/lib/miniSiteTemplateEditorRegistry";
import { MINI_SITE_TEMPLATES } from "@/types/miniSite";

describe("miniSiteTemplateEditorRegistry", () => {
  it("defines editor metadata for every mini-site template", () => {
    expect(getAllMiniSiteTemplateEditorDefinitions()).toHaveLength(MINI_SITE_TEMPLATES.length);
    for (const template of MINI_SITE_TEMPLATES) {
      expect(getMiniSiteTemplateEditorDefinition(template).template).toBe(template);
      expect(getMiniSiteTemplateEditorDefinition(template).blocks.length).toBeGreaterThan(0);
    }
  });

  it("includes clinic-specific block labels only for clinic", () => {
    expect(isMiniSiteEditorBlockLabelForTemplate("Appointment panel", "clinic")).toBe(true);
    expect(isMiniSiteEditorBlockLabelForTemplate("Appointment panel", "portfolio")).toBe(false);
    expect(isMiniSiteEditorBlockLabelForTemplate("Work showcase", "portfolio")).toBe(true);
    expect(isMiniSiteEditorBlockLabelForTemplate("Work showcase", "clinic")).toBe(false);
  });

  it("defines active image media slots per template", () => {
    const clean = getMiniSiteTemplateEditorDefinition("clean");
    expect(clean.imageMediaSlots.map((slot) => slot.id)).toEqual([
      "heroImage",
      "servicesImage",
      "ctaImage",
    ]);

    const service = getMiniSiteTemplateEditorDefinition("service");
    expect(service.imageMediaSlots.map((slot) => slot.id)).toEqual([
      "heroImage",
      "serviceImage",
      "requestImage",
    ]);

    const clinic = getMiniSiteTemplateEditorDefinition("clinic");
    expect(clinic.imageMediaSlots.map((slot) => slot.id)).toEqual([
      "heroImage",
      "doctorOrClinicImage",
      "servicesImage",
      "appointmentImage",
    ]);

    const portfolio = getMiniSiteTemplateEditorDefinition("portfolio");
    expect(portfolio.imageMediaSlots.map((slot) => slot.id)).toEqual([
      "heroVisual",
      "featuredWorkImage",
      "servicesImage",
      "collaborationImage",
    ]);
  });
});
