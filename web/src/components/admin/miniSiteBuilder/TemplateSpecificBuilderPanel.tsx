import { useEffect, useState } from "react";
import { MiniSiteEditorCard } from "@/components/admin/MiniSiteEditorCard";
import { MiniSiteDefaultProfilePreview } from "@/components/admin/miniSiteBuilder/MiniSiteDefaultProfilePreview";
import { ServiceTemplateEditor } from "@/components/admin/miniSiteBuilder/ServiceTemplateEditor";
import { ExpertTemplateEditor } from "@/components/admin/miniSiteBuilder/ExpertTemplateEditor";
import { PortfolioTemplateEditor } from "@/components/admin/miniSiteBuilder/PortfolioTemplateEditor";
import { TemplateComingSoonPanel } from "@/components/admin/miniSiteBuilder/TemplateComingSoonPanel";
import { TemplateManagedElsewherePanel } from "@/components/admin/miniSiteBuilder/TemplateManagedElsewherePanel";
import { TemplateSectionNav } from "@/components/admin/miniSiteBuilder/TemplateSectionNav";
import {
  getDefaultSectionIdForTemplate,
  getTemplateBuilderConfig,
  getTemplateBuilderSection,
  isMiniSiteBuilderTemplate,
  type MiniSiteBuilderId,
  type MiniSiteEditorFocus,
} from "@/lib/miniSiteTemplateBuilders";
import { MINI_SITE_DEFAULT_SELECTION } from "@/lib/miniSitePlanAccess";
import type { MiniSiteTemplate } from "@/types/miniSite";

type TemplateSpecificBuilderPanelProps = {
  builderId: MiniSiteBuilderId;
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  allowedTemplates?: MiniSiteTemplate[];
  requestedTemplate?: MiniSiteTemplate | null;
  saveStatus?: "idle" | "saved" | "error";
  savingDefault?: boolean;
  onSaveDefault?: () => void;
  onTemplateChange?: (template: MiniSiteTemplate) => void;
  onSaveStatusChange?: (status: "idle" | "saved" | "error") => void;
};

export function TemplateSpecificBuilderPanel({
  builderId,
  businessId,
  businessName,
  businessSlug,
  allowedTemplates,
  requestedTemplate,
  saveStatus = "idle",
  savingDefault = false,
  onSaveDefault,
  onTemplateChange,
  onSaveStatusChange,
}: TemplateSpecificBuilderPanelProps) {
  const config = getTemplateBuilderConfig(builderId);
  const isDefault = builderId === MINI_SITE_DEFAULT_SELECTION;
  const hasSectionNav =
    !isDefault && builderId !== "service" && builderId !== "expert" && builderId !== "portfolio" && config.sections.length > 0;
  const [selectedSectionId, setSelectedSectionId] = useState(() =>
    getDefaultSectionIdForTemplate(builderId),
  );

  useEffect(() => {
    setSelectedSectionId(getDefaultSectionIdForTemplate(builderId));
  }, [builderId]);

  const selectedSection =
    getTemplateBuilderSection(builderId, selectedSectionId) ?? config.sections[0];
  const showComingSoon = selectedSection?.mode === "coming_soon";
  const showManagedElsewhere = selectedSection?.mode === "managed_elsewhere";
  const editorFocus: MiniSiteEditorFocus | undefined =
    !isDefault && selectedSection?.mode === "editable"
      ? selectedSection.editorFocus
      : undefined;
  const miniSiteEditorFocus = editorFocus as
    | "settings"
    | "media"
    | "hero"
    | "about"
    | "services"
    | "trust"
    | "faq"
    | "contact"
    | "social"
    | undefined;

  const sectionHeading = isDefault
    ? "Original public page layout"
    : selectedSection
      ? `${config.label} · ${selectedSection.label}`
      : config.label;

  return (
    <div
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      data-testid="admin-mini-site-template-builder"
      data-builder={builderId}
      data-section={isDefault ? "overview" : selectedSection?.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
              data-testid="admin-mini-site-builder-template-badge"
            >
              {config.badge}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {config.category}
            </span>
          </div>
          <h3
            className="text-base font-semibold text-slate-900"
            data-testid="admin-mini-site-builder-title"
          >
            {sectionHeading}
          </h3>
          <p
            className="max-w-2xl text-sm text-slate-500"
            data-testid="admin-mini-site-builder-helper"
          >
            {isDefault
              ? config.description
              : (selectedSection?.helperText ?? config.description)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            data-testid="admin-mini-site-live-preview"
          >
            Live preview
          </p>
          <p
            className="text-sm font-medium text-slate-800"
            data-testid="admin-mini-site-builder-preview-label"
          >
            {config.previewLabel}
          </p>
        </div>
      </div>

      <div
        className={
          hasSectionNav
            ? "grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"
            : "grid gap-4"
        }
      >
        {hasSectionNav ? (
          <TemplateSectionNav
            sections={config.sections}
            selectedSectionId={selectedSection?.id ?? config.sections[0].id}
            onSelectSection={setSelectedSectionId}
            templateLabel={config.label}
          />
        ) : null}

        <div className="min-w-0 space-y-3" data-testid="admin-mini-site-builder-center">
          {isDefault ? (
            <MiniSiteDefaultProfilePreview
              businessSlug={businessSlug}
              businessName={businessName}
              saveStatus={saveStatus}
              saving={savingDefault}
              onSave={onSaveDefault}
            />
          ) : showComingSoon && selectedSection ? (
            <TemplateComingSoonPanel
              title={selectedSection.comingSoonTitle ?? `${selectedSection.label} coming soon`}
              body={
                selectedSection.comingSoonBody ??
                "This section is planned for a later update. Existing mini-site fields stay available in supported sections."
              }
              templateLabel={config.label}
              sectionLabel={selectedSection.label}
            />
          ) : showManagedElsewhere && selectedSection ? (
            <TemplateManagedElsewherePanel
              title={`${selectedSection.label} is managed elsewhere`}
              body={selectedSection.helperText}
              href={selectedSection.managedHref ?? "/admin"}
              linkLabel={selectedSection.managedLabel ?? "Open admin"}
              templateLabel={config.label}
              sectionLabel={selectedSection.label}
            />
          ) : builderId === "service" && selectedSection?.mode === "editable" ? (
            <div data-testid="admin-mini-site-section-row">
              <ServiceTemplateEditor
                activeSectionId={selectedSection.id}
                onSelectSection={setSelectedSectionId}
                sections={config.sections}
                templateLabel={config.label}
                businessId={businessId}
                businessName={businessName}
                businessSlug={businessSlug}
                allowedTemplates={allowedTemplates}
                requestedTemplate={requestedTemplate}
                onTemplateChange={onTemplateChange}
                onSaveStatusChange={onSaveStatusChange}
                previewBadge={config.previewLabel}
              />
            </div>
          ) : builderId === "expert" && selectedSection?.mode === "editable" ? (
            <div data-testid="admin-mini-site-section-row">
              <ExpertTemplateEditor
                activeSectionId={selectedSection.id}
                onSelectSection={setSelectedSectionId}
                sections={config.sections}
                templateLabel={config.label}
                businessId={businessId}
                businessName={businessName}
                businessSlug={businessSlug}
                allowedTemplates={allowedTemplates}
                requestedTemplate={requestedTemplate}
                onTemplateChange={onTemplateChange}
                onSaveStatusChange={onSaveStatusChange}
                previewBadge={config.previewLabel}
              />
            </div>
          ) : builderId === "portfolio" && selectedSection?.mode === "editable" ? (
            <div data-testid="admin-mini-site-section-row">
              <PortfolioTemplateEditor
                activeSectionId={selectedSection.id}
                onSelectSection={setSelectedSectionId}
                sections={config.sections}
                templateLabel={config.label}
                businessId={businessId}
                businessName={businessName}
                businessSlug={businessSlug}
                allowedTemplates={allowedTemplates}
                requestedTemplate={requestedTemplate}
                onTemplateChange={onTemplateChange}
                onSaveStatusChange={onSaveStatusChange}
                previewBadge={config.previewLabel}
              />
            </div>
          ) : isMiniSiteBuilderTemplate(builderId) && editorFocus ? (
            <div data-testid="admin-mini-site-section-row">
              <MiniSiteEditorCard
                mode="section"
                activeSectionId={miniSiteEditorFocus}
                focusSection={miniSiteEditorFocus}
                businessId={businessId}
                businessName={businessName}
                businessSlug={businessSlug}
                allowedTemplates={allowedTemplates}
                requestedTemplate={requestedTemplate}
                onTemplateChange={onTemplateChange}
                onSaveStatusChange={onSaveStatusChange}
                previewBadge={config.previewLabel}
                builderTone={config.tone}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
