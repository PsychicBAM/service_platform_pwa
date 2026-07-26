import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminServices } from "@/api/adminApi";
import { getMiniSiteConfig, updateMiniSiteConfig } from "@/api/miniSiteApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MiniSiteColorInput } from "@/components/admin/MiniSiteColorInput";
import { MiniSiteCompactImageUpload } from "@/components/admin/MiniSiteCompactImageUpload";
import { MiniSiteTemplateMediaSection } from "@/components/admin/MiniSiteTemplateMediaSection";
import { ServicePreviewViewport } from "@/components/admin/miniSiteBuilder/ServicePreviewViewport";
import { TemplateSectionNav } from "@/components/admin/miniSiteBuilder/TemplateSectionNav";
import { buildPortfolioItemImageSlot } from "@/lib/portfolioItemMediaSlots";
import {
  applyPortfolioThemePreset,
  coerceTypographyColorInput,
  createDefaultPortfolioTypography,
  getPortfolioTemplateContent,
  newPortfolioEntityId,
  PORTFOLIO_FONT_PRESET_OPTIONS,
  PORTFOLIO_LIMITS,
  PORTFOLIO_THEME_PRESETS,
  sanitizeCustomFontFamily,
  setPortfolioTemplateContent,
} from "@/lib/portfolioTemplateConfig";
import { normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import type { TemplateBuilderSection } from "@/lib/miniSiteTemplateBuilders";
import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  type MiniSiteConfig,
  type MiniSiteTemplate,
} from "@/types/miniSite";
import {
  PORTFOLIO_SECTION_IDS,
  type PortfolioCtaAction,
  type PortfolioProjectItem,
  type PortfolioSectionId,
  type PortfolioTemplateContent,
  type PortfolioTestimonialItem,
  type PortfolioTypographySettings,
} from "@/types/portfolioTemplate";
import type { ServiceFontPresetId } from "@/types/serviceTemplate";

export type PortfolioTemplateEditorProps = {
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  sections: TemplateBuilderSection[];
  templateLabel?: string;
  allowedTemplates?: MiniSiteTemplate[];
  requestedTemplate?: MiniSiteTemplate | null;
  onTemplateChange?: (template: MiniSiteTemplate) => void;
  onSaveStatusChange?: (status: "idle" | "saved" | "error") => void;
  previewBadge?: string;
};

const INPUT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const BUTTON =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const ITEM_CARD =
  "space-y-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm";
const CTA_ACTIONS: { value: PortfolioCtaAction; label: string }[] = [
  { value: "projects", label: "Scroll to Projects" },
  { value: "contact", label: "Scroll to Contact" },
  { value: "about", label: "Scroll to About" },
  { value: "booking", label: "Booking" },
  { value: "request", label: "Request" },
  { value: "services", label: "Services" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "external", label: "External" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={INPUT}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
      />
    </Field>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        className={INPUT}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function SwitchToggle({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-600"}`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`relative h-4 w-7 rounded-full ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${checked ? "left-3.5" : "left-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

function CtaSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PortfolioCtaAction;
  onChange: (value: PortfolioCtaAction) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={INPUT}
        value={value}
        onChange={(event) => onChange(event.target.value as PortfolioCtaAction)}
      >
        {CTA_ACTIONS.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type EditorProps = {
  content: PortfolioTemplateContent;
  updatePortfolio: (
    updater: (content: PortfolioTemplateContent) => PortfolioTemplateContent,
  ) => void;
  businessId: string;
};

export function PortfolioTemplateEditor({
  businessId,
  businessName,
  allowedTemplates,
  requestedTemplate,
  onTemplateChange,
  onSaveStatusChange,
  activeSectionId,
  onSelectSection,
  sections,
  templateLabel = "Portfolio",
  previewBadge,
}: PortfolioTemplateEditorProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MiniSiteConfig | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const configQuery = useQuery({
    queryKey: ["mini-site-config", businessId],
    queryFn: () => getMiniSiteConfig(businessId),
    enabled: Boolean(businessId),
  });
  const servicesQuery = useQuery({
    queryKey: ["admin-services", businessId, "portfolio-editor"],
    queryFn: () =>
      listAdminServices(businessId, { limit: 100, include_inactive: true }),
    enabled: Boolean(businessId),
  });

  function prepare(config: MiniSiteConfig): MiniSiteConfig {
    const normalized = normalizeMiniSiteConfig(config);
    if (
      allowedTemplates === undefined ||
      allowedTemplates.includes("portfolio")
    ) {
      return {
        ...normalized,
        theme: { ...normalized.theme, template: "portfolio" },
      };
    }
    return normalized;
  }

  useEffect(() => {
    if (configQuery.data) setDraft(prepare(configQuery.data));
    // Membership, rather than array identity, prevents parent inline arrays from resetting edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configQuery.data, allowedTemplates?.join(",")]);

  useEffect(() => {
    if (draft) onTemplateChange?.(draft.theme.template);
  }, [draft?.theme.template, onTemplateChange]);

  useEffect(() => {
    if (requestedTemplate !== "portfolio") return;
    setDraft((current) => {
      if (!current || current.theme.template === "portfolio") return current;
      if (allowedTemplates && !allowedTemplates.includes("portfolio"))
        return current;
      return { ...current, theme: { ...current.theme, template: "portfolio" } };
    });
  }, [requestedTemplate, allowedTemplates]);

  const saveMutation = useMutation({
    mutationFn: (config: MiniSiteConfig) =>
      updateMiniSiteConfig(businessId, config),
    onSuccess: async (data) => {
      setDraft(prepare(data));
      setSaveSuccess(true);
      onSaveStatusChange?.("saved");
      await queryClient.invalidateQueries({
        queryKey: ["mini-site-config", businessId],
      });
    },
    onError: () => onSaveStatusChange?.("error"),
  });

  const updatePortfolio = (
    updater: (content: PortfolioTemplateContent) => PortfolioTemplateContent,
  ) =>
    setDraft((current) =>
      current
        ? setPortfolioTemplateContent(
            current,
            updater(getPortfolioTemplateContent(current)),
          )
        : current,
    );

  async function save() {
    if (!draft) return;
    setSaveSuccess(false);
    setSaveError(null);
    onSaveStatusChange?.("idle");
    try {
      await saveMutation.mutateAsync(draft);
    } catch {
      setSaveError("Could not save portfolio mini-site. Please try again.");
      onSaveStatusChange?.("error");
    }
  }

  if (configQuery.isLoading || !draft)
    return <LoadingState message="Loading portfolio mini-site…" />;
  if (configQuery.isError)
    return (
      <ErrorState
        title="Could not load portfolio mini-site"
        message="Try refreshing the page."
      />
    );

  const content = getPortfolioTemplateContent(draft);
  const sectionHidden =
    (PORTFOLIO_SECTION_IDS as readonly string[]).includes(activeSectionId) &&
    content.sectionVisibility[activeSectionId as PortfolioSectionId] === false;
  const editorProps = { content, updatePortfolio, businessId };
  const previewServices = (servicesQuery.data?.data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category ?? null,
    type: service.type,
    duration_minutes: service.duration_minutes,
    price_cents: service.price_cents,
    currency: service.currency,
    price_type: service.price_type,
    require_payment: service.require_payment,
    sort_order: service.sort_order,
    image: service.image ?? null,
  }));

  return (
    <div
      className="space-y-4"
      data-testid="portfolio-template-editor"
      data-section={activeSectionId}
    >
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(420px,1fr)_minmax(340px,360px)]">
        <TemplateSectionNav
          sections={sections}
          selectedSectionId={activeSectionId}
          onSelectSection={onSelectSection}
          templateLabel={templateLabel}
          sectionVisibility={content.sectionVisibility}
          onToggleSectionVisibility={(sectionId, visible) => {
            if (
              !(PORTFOLIO_SECTION_IDS as readonly string[]).includes(sectionId)
            )
              return;
            updatePortfolio((current) => ({
              ...current,
              sectionVisibility: {
                ...current.sectionVisibility,
                [sectionId]: visible,
              },
            }));
          }}
        />
        <section className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          {sectionHidden && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Hidden on public page — you can still edit this section.
            </div>
          )}
          {activeSectionId === "hero" && <HeroEditor {...editorProps} />}
          {activeSectionId === "projects" && (
            <ProjectsEditor {...editorProps} />
          )}
          {activeSectionId === "about" && <AboutEditor {...editorProps} />}
          {activeSectionId === "skills" && <SkillsEditor {...editorProps} />}
          {activeSectionId === "services" && (
            <ServicesEditor
              {...editorProps}
              services={servicesQuery.data?.data ?? []}
              loading={servicesQuery.isLoading}
            />
          )}
          {activeSectionId === "process" && <ProcessEditor {...editorProps} />}
          {activeSectionId === "testimonials" && (
            <TestimonialsEditor {...editorProps} />
          )}
          {activeSectionId === "contact" && <ContactEditor {...editorProps} />}
          {activeSectionId === "footer" && <FooterEditor {...editorProps} />}
          {activeSectionId === "settings" && (
            <SettingsEditor
              {...editorProps}
              draft={draft}
              setDraft={setDraft}
            />
          )}
        </section>
        <ServicePreviewViewport
          config={draft}
          businessName={businessName}
          previewBadge={previewBadge}
          services={previewServices}
        />
      </div>
      {saveSuccess && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Changes saved.
        </p>
      )}
      {saveError && (
        <ErrorState
          title="Could not save portfolio mini-site"
          message={saveError}
        />
      )}
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() =>
            configQuery.data && setDraft(prepare(configQuery.data))
          }
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={saveMutation.isPending}
          onClick={() => void save()}
          data-testid="portfolio-editor-save"
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function HeroEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.hero;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      hero: { ...current.hero, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-hero">
      <TextField
        label="Eyebrow"
        value={section.eyebrow}
        onChange={(value) => set("eyebrow", value)}
      />
      <TextField
        label="Creative title"
        value={section.creativeTitle}
        onChange={(value) => set("creativeTitle", value)}
      />
      <TextField
        label="Headline"
        value={section.headline}
        onChange={(value) => set("headline", value)}
        testId="portfolio-editor-hero-headline"
      />
      <TextField
        label="Headline highlight"
        value={section.headlineHighlight}
        onChange={(value) => set("headlineHighlight", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
        rows={3}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Primary CTA label"
          value={section.primaryCtaLabel}
          onChange={(value) => set("primaryCtaLabel", value)}
        />
        <CtaSelect
          label="Primary CTA action"
          value={section.primaryCtaAction}
          onChange={(value) => set("primaryCtaAction", value)}
        />
        <TextField
          label="Secondary CTA label"
          value={section.secondaryCtaLabel}
          onChange={(value) => set("secondaryCtaLabel", value)}
        />
        <CtaSelect
          label="Secondary CTA action"
          value={section.secondaryCtaAction}
          onChange={(value) => set("secondaryCtaAction", value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <SwitchToggle
          label="Show call button"
          checked={section.showCallButton}
          onChange={(value) => set("showCallButton", value)}
        />
        <SwitchToggle
          label="Show WhatsApp button"
          checked={section.showWhatsappButton}
          onChange={(value) => set("showWhatsappButton", value)}
        />
      </div>
      <EditableRows
        items={section.stats}
        label="Stats"
        addLabel="Add stat"
        onChange={(stats) => set("stats", stats)}
        create={() => ({
          id: newPortfolioEntityId("stat"),
          value: "",
          label: "",
        })}
        render={(item, change) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={INPUT}
              placeholder="Value"
              value={item.value}
              onChange={(event) =>
                change({ ...item, value: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Label"
              value={item.label}
              onChange={(event) =>
                change({ ...item, label: event.target.value })
              }
            />
          </div>
        )}
      />
    </div>
  );
}

function createProject(): PortfolioProjectItem {
  return {
    id: newPortfolioEntityId("project"),
    title: "New project",
    category: "",
    shortDescription: "",
    fullDescription: "",
    clientName: "",
    year: "",
    role: "",
    tags: [],
    metrics: [],
    externalUrl: "",
    coverImageUrl: "",
    featured: false,
    visible: true,
  };
}

function ProjectsEditor({ content, updatePortfolio, businessId }: EditorProps) {
  const section = content.projects;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      projects: { ...current.projects, [key]: value },
    }));
  const updateItem = (id: string, item: PortfolioProjectItem) =>
    set(
      "items",
      section.items.map((entry) => (entry.id === id ? item : entry)),
    );
  return (
    <div className="space-y-3" data-testid="portfolio-editor-projects">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <SwitchToggle
        label="Show category filter"
        checked={section.showCategoryFilter}
        onChange={(value) => set("showCategoryFilter", value)}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Projects{" "}
          <span className="font-normal text-slate-500">
            ({section.items.length}/{PORTFOLIO_LIMITS.projects})
          </span>
        </p>
        <button
          type="button"
          className={BUTTON}
          data-testid="portfolio-project-add"
          disabled={section.items.length >= PORTFOLIO_LIMITS.projects}
          onClick={() => set("items", [...section.items, createProject()])}
        >
          Add project
        </button>
      </div>
      {section.items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          Add your first project to showcase selected work.
        </p>
      )}
      {section.items.map((item, index) => (
        <div
          key={item.id}
          className={ITEM_CARD}
          data-testid="portfolio-project-item"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={INPUT}
              placeholder="Title"
              value={item.title}
              onChange={(event) =>
                updateItem(item.id, { ...item, title: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Category"
              value={item.category}
              onChange={(event) =>
                updateItem(item.id, { ...item, category: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Client name"
              value={item.clientName}
              onChange={(event) =>
                updateItem(item.id, { ...item, clientName: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Year"
              value={item.year}
              onChange={(event) =>
                updateItem(item.id, { ...item, year: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Role"
              value={item.role}
              onChange={(event) =>
                updateItem(item.id, { ...item, role: event.target.value })
              }
            />
            <input
              className={INPUT}
              placeholder="Link URL"
              value={item.externalUrl}
              onChange={(event) =>
                updateItem(item.id, {
                  ...item,
                  externalUrl: event.target.value,
                })
              }
            />
          </div>
          <MiniSiteCompactImageUpload
            businessId={businessId}
            template="portfolio"
            slot={buildPortfolioItemImageSlot("portfolioProjectCover", item.id)}
            label="Project cover"
            imageUrl={item.coverImageUrl}
            testId={`portfolio-project-cover-${item.id}`}
            onImageUrlChange={(url) =>
              updateItem(item.id, { ...item, coverImageUrl: url })
            }
          />
          <TextArea
            label="Short description"
            value={item.shortDescription}
            onChange={(value) =>
              updateItem(item.id, { ...item, shortDescription: value })
            }
          />
          <TextArea
            label="Full description"
            value={item.fullDescription}
            onChange={(value) =>
              updateItem(item.id, { ...item, fullDescription: value })
            }
            rows={3}
          />
          <TextField
            label="Tags (comma-separated)"
            value={item.tags.join(", ")}
            onChange={(value) =>
              updateItem(item.id, {
                ...item,
                tags: value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .slice(0, PORTFOLIO_LIMITS.tags),
              })
            }
          />
          <TextField
            label="Metrics (comma-separated)"
            value={item.metrics.join(", ")}
            onChange={(value) =>
              updateItem(item.id, {
                ...item,
                metrics: value
                  .split(",")
                  .map((metric) => metric.trim())
                  .filter(Boolean)
                  .slice(0, PORTFOLIO_LIMITS.metrics),
              })
            }
          />
          <div className="flex flex-wrap gap-2">
            <SwitchToggle
              label="Featured"
              checked={item.featured}
              onChange={(value) =>
                updateItem(item.id, { ...item, featured: value })
              }
            />
            <SwitchToggle
              label="Visible"
              checked={item.visible}
              onChange={(value) =>
                updateItem(item.id, { ...item, visible: value })
              }
            />
          </div>
          <ItemActions
            index={index}
            count={section.items.length}
            onUp={() => set("items", moveItem(section.items, index, -1))}
            onDown={() => set("items", moveItem(section.items, index, 1))}
            onRemove={() => {
              if (window.confirm("Delete this project?"))
                set(
                  "items",
                  section.items.filter((entry) => entry.id !== item.id),
                );
            }}
          />
        </div>
      ))}
    </div>
  );
}

function AboutEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.about;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      about: { ...current.about, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-about">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextField
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <TextArea
        label="Bio"
        value={section.bio}
        onChange={(value) => set("bio", value)}
        rows={4}
      />
      <EditableRows
        items={section.highlights}
        label="Highlights"
        addLabel="Add highlight"
        onChange={(highlights) => set("highlights", highlights)}
        create={() => ({ id: newPortfolioEntityId("highlight"), text: "" })}
        render={(item, change) => (
          <input
            className={INPUT}
            placeholder="Highlight"
            value={item.text}
            onChange={(event) => change({ ...item, text: event.target.value })}
          />
        )}
      />
      <SwitchToggle
        label="Show CTA"
        checked={section.showCta}
        onChange={(value) => set("showCta", value)}
      />
      {section.showCta && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="CTA label"
            value={section.ctaLabel}
            onChange={(value) => set("ctaLabel", value)}
          />
          <CtaSelect
            label="CTA action"
            value={section.ctaAction}
            onChange={(value) => set("ctaAction", value)}
          />
        </div>
      )}
    </div>
  );
}

function SkillsEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.skills;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      skills: { ...current.skills, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-skills">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <EditableRows
        items={section.items}
        label={`Skills (${section.items.length}/${PORTFOLIO_LIMITS.skills})`}
        addLabel="Add skill"
        max={PORTFOLIO_LIMITS.skills}
        onChange={(items) => set("items", items)}
        create={() => ({
          id: newPortfolioEntityId("skill"),
          label: "",
          description: "",
          visible: true,
        })}
        render={(item, change) => (
          <div className="space-y-2">
            <input
              className={INPUT}
              placeholder="Label"
              value={item.label}
              onChange={(event) =>
                change({ ...item, label: event.target.value })
              }
            />
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Description"
              value={item.description}
              onChange={(event) =>
                change({ ...item, description: event.target.value })
              }
            />
            <SwitchToggle
              label="Visible"
              checked={item.visible}
              onChange={(value) => change({ ...item, visible: value })}
            />
          </div>
        )}
      />
    </div>
  );
}

function ServicesEditor({
  content,
  updatePortfolio,
  services,
  loading,
}: EditorProps & {
  services: { id: string; name: string; is_active: boolean }[];
  loading: boolean;
}) {
  const section = content.services;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      services: { ...current.services, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-services">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Services</h4>
        <Link
          to="/admin/services"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          Manage services
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Services are managed in Admin Services. Select which ones to show here.
      </p>
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <TextField
        label="Button label"
        value={section.buttonLabel}
        onChange={(value) => set("buttonLabel", value)}
      />
      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="text-sm text-slate-500">
            No services yet. Add them in Admin Services.
          </p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.selectedServiceIds.includes(service.id)}
                onChange={(event) =>
                  set(
                    "selectedServiceIds",
                    event.target.checked
                      ? [...section.selectedServiceIds, service.id]
                      : section.selectedServiceIds.filter(
                          (id) => id !== service.id,
                        ),
                  )
                }
              />
              <span className="flex-1 text-sm">
                {service.name}
                {!service.is_active ? " (inactive)" : ""}
              </span>
              {section.selectedServiceIds.includes(service.id) && (
                <>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={
                      section.selectedServiceIds.indexOf(service.id) === 0
                    }
                    onClick={() =>
                      set(
                        "selectedServiceIds",
                        moveItem(
                          section.selectedServiceIds,
                          section.selectedServiceIds.indexOf(service.id),
                          -1,
                        ),
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={
                      section.selectedServiceIds.indexOf(service.id) ===
                      section.selectedServiceIds.length - 1
                    }
                    onClick={() =>
                      set(
                        "selectedServiceIds",
                        moveItem(
                          section.selectedServiceIds,
                          section.selectedServiceIds.indexOf(service.id),
                          1,
                        ),
                      )
                    }
                  >
                    ↓
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          ["showImage", "showPrice", "showDuration", "showDescription"] as const
        ).map((key) => (
          <SwitchToggle
            key={key}
            label={key.replace("show", "Show ")}
            checked={section[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.process;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      process: { ...current.process, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-process">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <SwitchToggle
        label="Show numbering"
        checked={section.showNumbering}
        onChange={(value) => set("showNumbering", value)}
      />
      <EditableRows
        items={section.steps}
        label={`Steps (${section.steps.length}/${PORTFOLIO_LIMITS.process})`}
        addLabel="Add step"
        max={PORTFOLIO_LIMITS.process}
        onChange={(steps) => set("steps", steps)}
        create={() => ({
          id: newPortfolioEntityId("step"),
          title: "",
          description: "",
        })}
        render={(item, change) => (
          <div className="space-y-2">
            <input
              className={INPUT}
              placeholder="Title"
              value={item.title}
              onChange={(event) =>
                change({ ...item, title: event.target.value })
              }
            />
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Description"
              value={item.description}
              onChange={(event) =>
                change({ ...item, description: event.target.value })
              }
            />
          </div>
        )}
      />
    </div>
  );
}

function createTestimonial(): PortfolioTestimonialItem {
  return {
    id: newPortfolioEntityId("testimonial"),
    name: "Client",
    role: "",
    quote: "",
    rating: 5,
    date: "",
    avatarInitials: "C",
    avatarUrl: "",
    visible: true,
  };
}

function TestimonialsEditor({
  content,
  updatePortfolio,
  businessId,
}: EditorProps) {
  const section = content.testimonials;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      testimonials: { ...current.testimonials, [key]: value },
    }));
  const updateItem = (id: string, item: PortfolioTestimonialItem) =>
    set(
      "items",
      section.items.map((entry) => (entry.id === id ? item : entry)),
    );
  return (
    <div className="space-y-3" data-testid="portfolio-editor-testimonials">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <Field label="Source">
        <select
          className={INPUT}
          value={section.source}
          onChange={(event) =>
            set("source", event.target.value as typeof section.source)
          }
        >
          <option value="approved">Approved reviews</option>
          <option value="manual">Manual testimonials</option>
          <option value="both">Both</option>
        </select>
      </Field>
      <Field label="Maximum count">
        <input
          className={INPUT}
          type="number"
          min={1}
          max={PORTFOLIO_LIMITS.testimonials}
          value={section.maxCount}
          onChange={(event) =>
            set(
              "maxCount",
              Math.min(
                PORTFOLIO_LIMITS.testimonials,
                Math.max(1, Number(event.target.value) || 1),
              ),
            )
          }
        />
      </Field>
      <SwitchToggle
        label="Show rating"
        checked={section.showRating}
        onChange={(value) => set("showRating", value)}
      />
      {section.source !== "approved" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Manual testimonials ({section.items.length}/
              {PORTFOLIO_LIMITS.testimonials})
            </p>
            <button
              type="button"
              className={BUTTON}
              disabled={section.items.length >= PORTFOLIO_LIMITS.testimonials}
              onClick={() =>
                set("items", [...section.items, createTestimonial()])
              }
            >
              Add testimonial
            </button>
          </div>
          {section.items.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              Add quotes and optional avatar uploads.
            </p>
          )}
          {section.items.map((item, index) => (
            <div key={item.id} className={ITEM_CARD}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className={INPUT}
                  placeholder="Name"
                  value={item.name}
                  onChange={(event) =>
                    updateItem(item.id, { ...item, name: event.target.value })
                  }
                />
                <input
                  className={INPUT}
                  placeholder="Role"
                  value={item.role}
                  onChange={(event) =>
                    updateItem(item.id, { ...item, role: event.target.value })
                  }
                />
                <input
                  className={INPUT}
                  type="number"
                  min={1}
                  max={5}
                  placeholder="Rating"
                  value={item.rating}
                  onChange={(event) =>
                    updateItem(item.id, {
                      ...item,
                      rating: Math.min(
                        5,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    })
                  }
                />
                <input
                  className={INPUT}
                  placeholder="Avatar initials"
                  value={item.avatarInitials}
                  onChange={(event) =>
                    updateItem(item.id, {
                      ...item,
                      avatarInitials: event.target.value,
                    })
                  }
                />
              </div>
              <MiniSiteCompactImageUpload
                businessId={businessId}
                template="portfolio"
                slot={buildPortfolioItemImageSlot(
                  "portfolioTestimonialAvatar",
                  item.id,
                )}
                label="Avatar"
                imageUrl={item.avatarUrl}
                testId={`portfolio-testimonial-avatar-${item.id}`}
                onImageUrlChange={(url) =>
                  updateItem(item.id, { ...item, avatarUrl: url })
                }
              />
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Quote"
                value={item.quote}
                onChange={(event) =>
                  updateItem(item.id, { ...item, quote: event.target.value })
                }
              />
              <SwitchToggle
                label="Visible"
                checked={item.visible}
                onChange={(value) =>
                  updateItem(item.id, { ...item, visible: value })
                }
              />
              <ItemActions
                index={index}
                count={section.items.length}
                onUp={() => set("items", moveItem(section.items, index, -1))}
                onDown={() => set("items", moveItem(section.items, index, 1))}
                onRemove={() => {
                  if (window.confirm("Delete this testimonial?"))
                    set(
                      "items",
                      section.items.filter((entry) => entry.id !== item.id),
                    );
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ContactEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.contactCta;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      contactCta: { ...current.contactCta, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-contact">
      <TextField
        label="Headline"
        value={section.headline}
        onChange={(value) => set("headline", value)}
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Primary CTA label"
          value={section.primaryCtaLabel}
          onChange={(value) => set("primaryCtaLabel", value)}
        />
        <CtaSelect
          label="Primary CTA action"
          value={section.primaryCtaAction}
          onChange={(value) => set("primaryCtaAction", value)}
        />
        <TextField
          label="Secondary CTA label"
          value={section.secondaryCtaLabel}
          onChange={(value) => set("secondaryCtaLabel", value)}
        />
        <CtaSelect
          label="Secondary CTA action"
          value={section.secondaryCtaAction}
          onChange={(value) => set("secondaryCtaAction", value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["showPhone", "showEmail", "showLocation"] as const).map((key) => (
          <SwitchToggle
            key={key}
            label={key.replace("show", "Show ")}
            checked={section[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
      <Field label="Background style">
        <select
          className={INPUT}
          value={section.backgroundStyle}
          onChange={(event) =>
            set(
              "backgroundStyle",
              event.target.value as typeof section.backgroundStyle,
            )
          }
        >
          <option value="primary">Primary</option>
          <option value="soft">Soft</option>
          <option value="dark">Dark</option>
        </select>
      </Field>
    </div>
  );
}

function FooterEditor({ content, updatePortfolio }: EditorProps) {
  const section = content.footer;
  const set = <K extends keyof typeof section>(
    key: K,
    value: (typeof section)[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      footer: { ...current.footer, [key]: value },
    }));
  return (
    <div className="space-y-3" data-testid="portfolio-editor-footer">
      <TextArea
        label="Description"
        value={section.description}
        onChange={(value) => set("description", value)}
      />
      <TextField
        label="Copyright text"
        value={section.copyrightText}
        onChange={(value) => set("copyrightText", value)}
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            "showQuickLinks",
            "showProjectsLinks",
            "showSocialLinks",
            "showContactInfo",
          ] as const
        ).map((key) => (
          <SwitchToggle
            key={key}
            label={key.replace(/show([A-Z])/, "Show $1")}
            checked={section[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsEditor({
  content,
  updatePortfolio,
  draft,
  setDraft,
  businessId,
}: EditorProps & {
  draft: MiniSiteConfig;
  setDraft: React.Dispatch<React.SetStateAction<MiniSiteConfig | null>>;
}) {
  const typography = content.typography;
  const setTheme = <K extends keyof MiniSiteConfig["theme"]>(
    key: K,
    value: MiniSiteConfig["theme"][K],
  ) =>
    setDraft((current) =>
      current
        ? { ...current, theme: { ...current.theme, [key]: value } }
        : current,
    );
  const setTypography = <K extends keyof PortfolioTypographySettings>(
    key: K,
    value: PortfolioTypographySettings[K],
  ) =>
    updatePortfolio((current) => ({
      ...current,
      typography: { ...current.typography, [key]: value },
    }));
  const customFont =
    typography.headingFontPreset === "custom" ||
    typography.bodyFontPreset === "custom" ||
    typography.buttonFontPreset === "custom";
  const setFontPreset = (
    key: "headingFontPreset" | "bodyFontPreset" | "buttonFontPreset",
    value: string,
  ) =>
    setTypography(
      key,
      PORTFOLIO_FONT_PRESET_OPTIONS.some((option) => option.id === value)
        ? (value as ServiceFontPresetId)
        : "system_sans",
    );
  return (
    <div className="space-y-4" data-testid="portfolio-editor-settings">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Theme presets</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(PORTFOLIO_THEME_PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${content.themePreset === preset.id ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-300 hover:bg-slate-50"}`}
              onClick={() =>
                setDraft((current) =>
                  current
                    ? applyPortfolioThemePreset(current, preset.id)
                    : current,
                )
              }
            >
              <span className="flex gap-0.5" aria-hidden="true">
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.primaryColor }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.accentColor }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.backgroundColor }}
                />
              </span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniSiteColorInput
          label="Primary color"
          value={draft.theme.primaryColor}
          fallback="#5E34FF"
          testId="portfolio-editor-primary-color"
          placeholder="#5E34FF"
          onChange={(value) => setTheme("primaryColor", value || draft.theme.primaryColor)}
        />
        <MiniSiteColorInput
          label="Accent color"
          value={draft.theme.accentColor}
          fallback="#C4B5FD"
          testId="portfolio-editor-accent-color"
          placeholder="#C4B5FD"
          onChange={(value) => setTheme("accentColor", value || draft.theme.accentColor)}
        />
        <MiniSiteColorInput
          label="Background color"
          value={draft.theme.backgroundColor}
          fallback="#f8f5ff"
          testId="portfolio-editor-background-color"
          placeholder="#f8f5ff"
          onChange={(value) =>
            setTheme("backgroundColor", value || draft.theme.backgroundColor)
          }
        />
        <Field label="Background style">
          <select
            className={INPUT}
            value={draft.theme.backgroundStyle}
            onChange={(event) =>
              setTheme(
                "backgroundStyle",
                event.target
                  .value as MiniSiteConfig["theme"]["backgroundStyle"],
              )
            }
          >
            {MINI_SITE_BACKGROUND_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </Field>
        <Field label="Button style">
          <select
            className={INPUT}
            value={draft.theme.buttonStyle}
            onChange={(event) =>
              setTheme(
                "buttonStyle",
                event.target.value as MiniSiteConfig["theme"]["buttonStyle"],
              )
            }
          >
            {MINI_SITE_BUTTON_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Typography</p>
            <p className="text-xs text-slate-500">
              Safe font stacks and text color overrides.
            </p>
          </div>
          <button
            type="button"
            className={BUTTON}
            data-testid="portfolio-editor-reset-typography"
            onClick={() =>
              updatePortfolio((current) => ({
                ...current,
                typography: createDefaultPortfolioTypography(),
              }))
            }
          >
            Reset typography
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            ["headingFontPreset", "bodyFontPreset", "buttonFontPreset"] as const
          ).map((key) => (
            <Field
              key={key}
              label={
                key === "headingFontPreset"
                  ? "Heading font"
                  : key === "bodyFontPreset"
                    ? "Body font"
                    : "Button font"
              }
            >
              <select
                className={INPUT}
                value={typography[key]}
                onChange={(event) => setFontPreset(key, event.target.value)}
              >
                {PORTFOLIO_FONT_PRESET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          {customFont && (
            <TextField
              label="Custom font family"
              value={typography.customFontFamily}
              onChange={(value) =>
                setTypography(
                  "customFontFamily",
                  sanitizeCustomFontFamily(value),
                )
              }
            />
          )}
          {(["headingWeight", "bodyWeight", "buttonWeight"] as const).map(
            (key) => (
              <Field
                key={key}
                label={
                  key === "headingWeight"
                    ? "Heading weight"
                    : key === "bodyWeight"
                      ? "Body weight"
                      : "Button weight"
                }
              >
                <select
                  className={INPUT}
                  value={typography[key]}
                  onChange={(event) =>
                    setTypography(
                      key,
                      Number(
                        event.target.value,
                      ) as PortfolioTypographySettings[typeof key],
                    )
                  }
                >
                  {[400, 500, 600, 700, 800, 900].map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </Field>
            ),
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["headingColor", "Heading color"],
              ["bodyColor", "Body text color"],
              ["mutedColor", "Muted text color"],
              ["heroHeadingColor", "Hero heading color"],
              ["heroBodyColor", "Hero body color"],
              ["accentTextColor", "Accent text color"],
              ["buttonTextColor", "Button text color"],
              ["cardTextColor", "Card text color"],
            ] as const
          ).map(([key, label]) => (
            <MiniSiteColorInput
              key={key}
              label={label}
              value={typography[key]}
              fallback={
                key.startsWith("hero") || key === "buttonTextColor"
                  ? "#ffffff"
                  : draft.theme.primaryColor || "#111827"
              }
              testId={`portfolio-editor-typo-${key}`}
              placeholder="Theme default"
              onChange={(value) =>
                setTypography(key, coerceTypographyColorInput(value))
              }
            />
          ))}
        </div>
      </div>
      <MiniSiteTemplateMediaSection
        businessId={businessId}
        template="portfolio"
        templateMedia={draft.templateMedia}
        onTemplateMediaChange={(templateMedia) =>
          setDraft((current) =>
            current ? { ...current, templateMedia } : current,
          )
        }
      />
    </div>
  );
}

function ItemActions({
  index,
  count,
  onUp,
  onDown,
  onRemove,
}: {
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={BUTTON}
        disabled={index === 0}
        onClick={onUp}
      >
        Move up
      </button>
      <button
        type="button"
        className={BUTTON}
        disabled={index === count - 1}
        onClick={onDown}
      >
        Move down
      </button>
      <button
        type="button"
        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
        onClick={onRemove}
      >
        Delete
      </button>
    </div>
  );
}

function EditableRows<T extends { id: string }>({
  items,
  label,
  addLabel,
  max,
  onChange,
  create,
  render,
}: {
  items: T[];
  label: string;
  addLabel: string;
  max?: number;
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, change: (item: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <button
          type="button"
          className={BUTTON}
          disabled={max !== undefined && items.length >= max}
          onClick={() => onChange([...items, create()])}
        >
          {addLabel}
        </button>
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="space-y-2 rounded-lg border border-slate-200 p-3"
        >
          {render(item, (next) =>
            onChange(
              items.map((entry) => (entry.id === item.id ? next : entry)),
            ),
          )}
          <ItemActions
            index={index}
            count={items.length}
            onUp={() => onChange(moveItem(items, index, -1))}
            onDown={() => onChange(moveItem(items, index, 1))}
            onRemove={() =>
              onChange(items.filter((entry) => entry.id !== item.id))
            }
          />
        </div>
      ))}
    </div>
  );
}
