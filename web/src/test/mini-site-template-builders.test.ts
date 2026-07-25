import { describe, expect, it } from "vitest";
import {
  getAvailableSectionsForTemplate,
  getDefaultSectionIdForTemplate,
  getTemplateBuilderConfig,
  getTemplateBuilderLabel,
  TEMPLATE_BUILDER_CONFIGS,
} from "@/lib/miniSiteTemplateBuilders";
import { MINI_SITE_TEMPLATES } from "@/types/miniSite";

describe("miniSiteTemplateBuilders", () => {
  it("defines a builder config for Default and every mini-site template", () => {
    expect(getTemplateBuilderConfig("standard").id).toBe("standard");
    expect(getAvailableSectionsForTemplate("standard")).toEqual([]);
    for (const template of MINI_SITE_TEMPLATES) {
      expect(getTemplateBuilderConfig(template).id).toBe(template);
      expect(getAvailableSectionsForTemplate(template).length).toBeGreaterThan(0);
    }
    expect(Object.keys(TEMPLATE_BUILDER_CONFIGS)).toEqual(
      expect.arrayContaining(["standard", ...MINI_SITE_TEMPLATES]),
    );
  });

  it("uses different section labels across templates", () => {
    const clean = getAvailableSectionsForTemplate("clean").map((section) => section.label);
    const service = getAvailableSectionsForTemplate("service").map((section) => section.label);
    const portfolio = getAvailableSectionsForTemplate("portfolio").map((section) => section.label);
    const clinic = getAvailableSectionsForTemplate("clinic").map((section) => section.label);

    expect(clean).toContain("Hero");
    expect(clean).toContain("Benefits");
    expect(service).toContain("How it works");
    expect(service).not.toEqual(clean);
    expect(portfolio).toContain("Projects / selected work");
    expect(clinic).toContain("Appointment banner");
    expect(clinic).toContain("Doctors / team");
  });

  it("marks unsupported sections as coming_soon without inventing editor focus", () => {
    const projects = getAvailableSectionsForTemplate("portfolio").find(
      (section) => section.id === "projects",
    );
    expect(projects?.mode).toBe("coming_soon");
    expect(projects?.editorFocus).toBeUndefined();
    expect(projects?.comingSoonBody).toMatch(/media slots/i);

    const team = getAvailableSectionsForTemplate("clinic").find((section) => section.id === "team");
    expect(team?.mode).toBe("coming_soon");
    expect(team?.comingSoonBody).toMatch(/No fake/i);
  });

  it("maps editable sections to existing editor focus targets", () => {
    expect(getAvailableSectionsForTemplate("clean").find((s) => s.id === "hero")?.mode).toBe(
      "editable",
    );
    expect(getAvailableSectionsForTemplate("clean").find((s) => s.id === "hero")?.editorFocus).toBe(
      "hero",
    );
    expect(
      getAvailableSectionsForTemplate("service").find((s) => s.id === "why-choose-us")?.editorFocus,
    ).toBe("why-choose-us");
    expect(
      getAvailableSectionsForTemplate("service").find((s) => s.id === "how-it-works")?.mode,
    ).toBe("editable");
    expect(getAvailableSectionsForTemplate("service").every((s) => s.mode !== "coming_soon")).toBe(
      true,
    );
    expect(getAvailableSectionsForTemplate("expert").every((s) => s.mode !== "coming_soon")).toBe(
      true,
    );
    expect(getDefaultSectionIdForTemplate("coach")).toBe("hero");
    expect(getTemplateBuilderLabel("teacher")).toBe("Teacher");
  });
});
