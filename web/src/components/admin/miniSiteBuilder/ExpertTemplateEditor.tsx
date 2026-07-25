import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminServices } from "@/api/adminApi";
import { getMiniSiteConfig, updateMiniSiteConfig } from "@/api/miniSiteApi";
import { ServicePreviewViewport } from "@/components/admin/miniSiteBuilder/ServicePreviewViewport";
import { TemplateSectionNav } from "@/components/admin/miniSiteBuilder/TemplateSectionNav";
import { MiniSiteTemplateMediaSection } from "@/components/admin/MiniSiteTemplateMediaSection";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import {
  applyExpertThemePreset,
  createDefaultExpertTypography,
  getExpertTemplateContent,
  newExpertEntityId,
  EXPERT_FONT_PRESET_OPTIONS,
  EXPERT_THEME_PRESETS,
  sanitizeCustomFontFamily,
  setExpertTemplateContent,
  coerceTypographyColorInput,
} from "@/lib/expertTemplateConfig";
import { hexColorForPicker } from "@/lib/miniSiteTemplatePresentation";
import type { TemplateBuilderSection } from "@/lib/miniSiteTemplateBuilders";
import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  type MiniSiteConfig,
  type MiniSiteTemplate,
} from "@/types/miniSite";
import type {
  ExpertArticleItem,
  ExpertArticleType,
  ExpertCtaAction,
  ExpertSectionId,
  ExpertTemplateContent,
  ExpertTypographySettings,
  ExpertWorkItem,
  ExpertTestimonialItem,
} from "@/types/expertTemplate";
import { EXPERT_SECTION_IDS } from "@/types/expertTemplate";
import type { ServiceFontPresetId } from "@/types/serviceTemplate";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

export type ExpertTemplateEditorProps = {
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
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

const CTA_ACTIONS: { value: ExpertCtaAction; label: string }[] = [
  { value: "booking", label: "Booking" },
  { value: "request", label: "Request" },
  { value: "services", label: "Services" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "external", label: "External" },
];

const ARTICLE_TYPES: { value: ExpertArticleType; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "publication", label: "Publication" },
  { value: "media", label: "Media" },
  { value: "research", label: "Research" },
  { value: "guide", label: "Guide" },
];

const MAX_ARTICLES = 12;
const MAX_WORKS = 12;
const MAX_TESTIMONIALS = 12;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  testId,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        className={INPUT}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
      />
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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
      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
        checked
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-300 bg-white text-slate-600"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`relative h-4 w-7 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
            checked ? "left-3.5" : "left-0.5"
          }`}
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
  value: ExpertCtaAction;
  onChange: (value: ExpertCtaAction) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={INPUT}
        value={value}
        onChange={(event) => onChange(event.target.value as ExpertCtaAction)}
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

export function ExpertTemplateEditor({
  businessId,
  businessName,
  allowedTemplates,
  requestedTemplate,
  onTemplateChange,
  onSaveStatusChange,
  activeSectionId,
  onSelectSection,
  sections,
  templateLabel = "Expert",
  previewBadge,
}: ExpertTemplateEditorProps) {
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
    queryKey: ["admin-services", businessId, "expert-editor"],
    queryFn: () => listAdminServices(businessId, { limit: 100, include_inactive: true }),
    enabled: Boolean(businessId),
  });

  function prepare(config: MiniSiteConfig): MiniSiteConfig {
    const normalized = normalizeMiniSiteConfig(config);
    if (allowedTemplates === undefined || allowedTemplates.includes("expert")) {
      return { ...normalized, theme: { ...normalized.theme, template: "expert" } };
    }
    return normalized;
  }

  useEffect(() => {
    if (configQuery.data) setDraft(prepare(configQuery.data));
  }, [configQuery.data, allowedTemplates]);

  useEffect(() => {
    if (draft) onTemplateChange?.(draft.theme.template);
  }, [draft?.theme.template, onTemplateChange]);

  useEffect(() => {
    // Dedicated Expert editor must stay on expert — ignore stale requestedTemplate from other templates.
    if (!requestedTemplate || requestedTemplate !== "expert") return;
    setDraft((current) => {
      if (!current || current.theme.template === "expert") return current;
      if (allowedTemplates && !allowedTemplates.includes("expert")) return current;
      return { ...current, theme: { ...current.theme, template: "expert" } };
    });
  }, [requestedTemplate, allowedTemplates]);

  const saveMutation = useMutation({
    mutationFn: (config: MiniSiteConfig) => updateMiniSiteConfig(businessId, config),
    onSuccess: async (data) => {
      setDraft(prepare(data));
      setSaveSuccess(true);
      onSaveStatusChange?.("saved");
      await queryClient.invalidateQueries({ queryKey: ["mini-site-config", businessId] });
    },
    onError: () => onSaveStatusChange?.("error"),
  });

  function updateExpert(updater: (content: ExpertTemplateContent) => ExpertTemplateContent) {
    setDraft((current) =>
      current ? setExpertTemplateContent(current, updater(getExpertTemplateContent(current))) : current,
    );
  }

  async function save() {
    if (!draft) return;
    setSaveSuccess(false);
    setSaveError(null);
    onSaveStatusChange?.("idle");
    try {
      await saveMutation.mutateAsync(draft);
    } catch (error) {
      setSaveError(getAdminSettingsErrorMessage(error, "Could not save expert mini-site."));
      onSaveStatusChange?.("error");
    }
  }

  if (configQuery.isLoading || !draft) return <LoadingState message="Loading expert mini-site…" />;
  if (configQuery.isError) {
    return <ErrorState title="Could not load expert mini-site" message="Try refreshing the page." />;
  }

  const content = getExpertTemplateContent(draft);
  const update = <K extends keyof ExpertTemplateContent>(key: K, value: ExpertTemplateContent[K]) =>
    updateExpert((current) => ({ ...current, [key]: value }));
  const sectionProps = { content, updateExpert, update };
  const isToggleable = (EXPERT_SECTION_IDS as readonly string[]).includes(activeSectionId);
  const sectionHidden =
    isToggleable && content.sectionVisibility[activeSectionId as ExpertSectionId] === false;

  return (
    <div className="space-y-4" data-testid="expert-editor" data-section={activeSectionId}>
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(420px,1fr)_minmax(340px,360px)]">
        <TemplateSectionNav
          sections={sections}
          selectedSectionId={activeSectionId}
          onSelectSection={onSelectSection}
          templateLabel={templateLabel}
          sectionVisibility={content.sectionVisibility}
          onToggleSectionVisibility={(sectionId, visible) => {
            if (!(EXPERT_SECTION_IDS as readonly string[]).includes(sectionId)) return;
            updateExpert((current) => ({
              ...current,
              sectionVisibility: {
                ...current.sectionVisibility,
                [sectionId]: visible,
              },
            }));
          }}
        />

        <section className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          {sectionHidden ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid="expert-section-hidden-banner"
            >
              Hidden on public page — you can still edit this section. Turn the switch back on to show
              it.
            </div>
          ) : null}
          {activeSectionId === "hero" && <HeroEditor {...sectionProps} />}
          {activeSectionId === "about" && <AboutEditor {...sectionProps} />}
          {activeSectionId === "services" && (
            <ServicesEditor
              {...sectionProps}
              services={servicesQuery.data?.data ?? []}
              loading={servicesQuery.isLoading}
            />
          )}
          {activeSectionId === "expertise" && <ExpertiseEditor {...sectionProps} />}
          {activeSectionId === "process" && <ProcessEditor {...sectionProps} />}
          {activeSectionId === "results" && <ResultsEditor {...sectionProps} />}
          {activeSectionId === "articles" && <ArticlesEditor {...sectionProps} />}
          {activeSectionId === "works" && <WorksEditor {...sectionProps} />}
          {activeSectionId === "testimonials" && <TestimonialsEditor {...sectionProps} />}
          {activeSectionId === "faq" && <FaqEditor {...sectionProps} />}
          {activeSectionId === "contact" && <ContactEditor {...sectionProps} />}
          {activeSectionId === "footer" && (
            <FooterEditor {...sectionProps} draft={draft} setDraft={setDraft} />
          )}
          {activeSectionId === "settings" && (
            <SettingsEditor
              {...sectionProps}
              draft={draft}
              setDraft={setDraft}
              businessId={businessId}
            />
          )}
        </section>

        <ServicePreviewViewport
          config={draft}
          businessName={businessName}
          previewBadge={previewBadge}
          services={(servicesQuery.data?.data ?? []).map((service) => ({
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
          }))}
        />
      </div>
      {saveSuccess && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Changes saved.
        </p>
      )}
      {saveError && <ErrorState title="Could not save expert mini-site" message={saveError} />}
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => configQuery.data && setDraft(prepare(configQuery.data))}
          data-testid="expert-editor-reset"
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={saveMutation.isPending}
          onClick={() => void save()}
          data-testid="expert-editor-save"
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

type EditorProps = {
  content: ExpertTemplateContent;
  updateExpert: (updater: (content: ExpertTemplateContent) => ExpertTemplateContent) => void;
  update: <K extends keyof ExpertTemplateContent>(key: K, value: ExpertTemplateContent[K]) => void;
};

function HeroEditor({ content, updateExpert }: EditorProps) {
  const hero = content.hero;
  const set = <K extends keyof typeof hero>(key: K, value: (typeof hero)[K]) =>
    updateExpert((current) => ({ ...current, hero: { ...current.hero, [key]: value } }));

  return (
    <div className="space-y-3">
      <TextField label="Eyebrow" value={hero.eyebrow} onChange={(value) => set("eyebrow", value)} />
      <TextField
        label="Professional title"
        value={hero.professionalTitle}
        onChange={(value) => set("professionalTitle", value)}
      />
      <TextField
        label="Headline"
        value={hero.headline}
        onChange={(value) => set("headline", value)}
        testId="expert-editor-hero-headline"
      />
      <TextField
        label="Headline highlight"
        value={hero.headlineHighlight}
        onChange={(value) => set("headlineHighlight", value)}
      />
      <TextArea label="Subtitle" value={hero.subtitle} onChange={(value) => set("subtitle", value)} />
      <StringListEditor
        label="Trust badges"
        addLabel="Add badge"
        items={hero.trustBadges}
        onChange={(items) => set("trustBadges", items)}
        placeholder="Badge label"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Primary CTA label"
          value={hero.primaryCtaLabel}
          onChange={(value) => set("primaryCtaLabel", value)}
        />
        <CtaSelect
          label="Primary CTA action"
          value={hero.primaryCtaAction}
          onChange={(value) => set("primaryCtaAction", value)}
        />
        <TextField
          label="Secondary CTA label"
          value={hero.secondaryCtaLabel}
          onChange={(value) => set("secondaryCtaLabel", value)}
        />
        <CtaSelect
          label="Secondary CTA action"
          value={hero.secondaryCtaAction}
          onChange={(value) => set("secondaryCtaAction", value)}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle
          label="Show call button"
          checked={hero.showCallButton}
          onChange={(value) => set("showCallButton", value)}
        />
        <Toggle
          label="Show WhatsApp button"
          checked={hero.showWhatsappButton}
          onChange={(value) => set("showWhatsappButton", value)}
        />
      </div>
      <EditableRows
        items={hero.stats}
        label="Stats"
        addLabel="Add stat"
        onChange={(items) => set("stats", items)}
        create={() => ({ id: newExpertEntityId("stat"), value: "", label: "" })}
        render={(item, change) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={INPUT}
              placeholder="Value"
              value={item.value}
              onChange={(event) => change({ ...item, value: event.target.value })}
            />
            <input
              className={INPUT}
              placeholder="Label"
              value={item.label}
              onChange={(event) => change({ ...item, label: event.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}

function AboutEditor({ content, updateExpert }: EditorProps) {
  const about = content.about;
  const set = <K extends keyof typeof about>(key: K, value: (typeof about)[K]) =>
    updateExpert((current) => ({ ...current, about: { ...current.about, [key]: value } }));

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={about.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-about-title"
      />
      <TextField label="Subtitle" value={about.subtitle} onChange={(value) => set("subtitle", value)} />
      <TextArea label="Bio" value={about.bio} onChange={(value) => set("bio", value)} rows={4} />
      <EditableRows
        items={about.credentials}
        label="Credentials"
        addLabel="Add credential"
        onChange={(items) => set("credentials", items)}
        create={() => ({ id: newExpertEntityId("cred"), text: "" })}
        render={(item, change) => (
          <input
            className={INPUT}
            placeholder="Credential"
            value={item.text}
            onChange={(event) => change({ ...item, text: event.target.value })}
          />
        )}
      />
      <Toggle label="Show CTA" checked={about.showCta} onChange={(value) => set("showCta", value)} />
      {about.showCta ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="CTA label"
            value={about.ctaLabel}
            onChange={(value) => set("ctaLabel", value)}
          />
          <CtaSelect
            label="CTA action"
            value={about.ctaAction}
            onChange={(value) => set("ctaAction", value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function ServicesEditor({
  content,
  updateExpert,
  services,
  loading,
}: EditorProps & {
  services: { id: string; name: string; is_active: boolean }[];
  loading: boolean;
}) {
  const section = content.services;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      services: { ...current.services, [key]: value },
    }));
  const selected = section.selectedServiceIds;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Services</h4>
        <Link
          to="/admin/services"
          className="text-sm font-medium text-emerald-700 hover:underline"
          data-testid="expert-editor-managed-services-link"
        >
          Manage services
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Services are managed in Admin Services. Select which ones to show on this mini-site.
      </p>
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-services-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-medium text-slate-700">
          Services to show{" "}
          <span className="font-normal text-slate-500">(none selected shows all)</span>
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="text-sm text-slate-500">No services yet. Add them in Admin Services.</p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(service.id)}
                onChange={(event) =>
                  set(
                    "selectedServiceIds",
                    event.target.checked
                      ? [...selected, service.id]
                      : selected.filter((id) => id !== service.id),
                  )
                }
              />
              <span className="flex-1 text-sm">
                {service.name}
                {!service.is_active ? " (inactive)" : ""}
              </span>
              {selected.includes(service.id) ? (
                <>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={selected.indexOf(service.id) === 0}
                    onClick={() =>
                      set(
                        "selectedServiceIds",
                        moveItem(selected, selected.indexOf(service.id), -1),
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={selected.indexOf(service.id) === selected.length - 1}
                    onClick={() =>
                      set(
                        "selectedServiceIds",
                        moveItem(selected, selected.indexOf(service.id), 1),
                      )
                    }
                  >
                    ↓
                  </button>
                </>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          ["showImage", "showPrice", "showDuration", "showDescription"] as const
        ).map((key) => (
          <Toggle
            key={key}
            label={key.replace("show", "Show ")}
            checked={section[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
      <TextField
        label="Button label"
        value={section.buttonLabel}
        onChange={(value) => set("buttonLabel", value)}
      />
    </div>
  );
}

function ExpertiseEditor({ content, updateExpert }: EditorProps) {
  const section = content.expertise;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      expertise: { ...current.expertise, [key]: value },
    }));

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-expertise-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <EditableRows
        items={section.items}
        label="Expertise items"
        addLabel="Add expertise"
        onChange={(items) => set("items", items)}
        create={() => ({
          id: newExpertEntityId("exp"),
          label: "",
          description: "",
          visible: true,
        })}
        render={(item, change) => (
          <div className="grid gap-2">
            <input
              className={INPUT}
              placeholder="Label"
              value={item.label}
              onChange={(event) => change({ ...item, label: event.target.value })}
            />
            <textarea
              className={INPUT}
              placeholder="Description"
              rows={2}
              value={item.description}
              onChange={(event) => change({ ...item, description: event.target.value })}
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

function ProcessEditor({ content, updateExpert }: EditorProps) {
  const section = content.process;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      process: { ...current.process, [key]: value },
    }));

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-process-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <EditableRows
        items={section.steps}
        label="Steps"
        addLabel="Add step"
        onChange={(items) => set("steps", items)}
        create={() => ({ id: newExpertEntityId("step"), title: "", description: "" })}
        render={(item, change) => (
          <div className="grid gap-2">
            <input
              className={INPUT}
              placeholder="Title"
              value={item.title}
              onChange={(event) => change({ ...item, title: event.target.value })}
            />
            <textarea
              className={INPUT}
              placeholder="Description"
              rows={2}
              value={item.description}
              onChange={(event) => change({ ...item, description: event.target.value })}
            />
          </div>
        )}
      />
      <Toggle
        label="Show numbering"
        checked={section.showNumbering}
        onChange={(value) => set("showNumbering", value)}
      />
    </div>
  );
}

function ResultsEditor({ content, updateExpert }: EditorProps) {
  const section = content.results;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      results: { ...current.results, [key]: value },
    }));

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-results-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <EditableRows
        items={section.items}
        label="Results"
        addLabel="Add result"
        onChange={(items) => set("items", items)}
        create={() => ({ id: newExpertEntityId("res"), value: "", label: "" })}
        render={(item, change) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={INPUT}
              placeholder="Value"
              value={item.value}
              onChange={(event) => change({ ...item, value: event.target.value })}
            />
            <input
              className={INPUT}
              placeholder="Label"
              value={item.label}
              onChange={(event) => change({ ...item, label: event.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}

function createEmptyArticle(): ExpertArticleItem {
  return {
    id: newExpertEntityId("article"),
    title: "New article",
    type: "article",
    category: "",
    date: "",
    excerpt: "",
    body: "",
    externalUrl: "",
    readingTime: "",
    featured: false,
    coverImageUrl: "",
    visible: true,
  };
}

function ArticlesEditor({ content, updateExpert }: EditorProps) {
  const section = content.articles;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      articles: { ...current.articles, [key]: value },
    }));
  const items = section.items;

  function updateItem(id: string, next: ExpertArticleItem) {
    set(
      "items",
      items.map((entry) => (entry.id === id ? next : entry)),
    );
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this article?")) return;
    set(
      "items",
      items.filter((entry) => entry.id !== id),
    );
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-articles-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <div className="space-y-2" data-testid="expert-articles-list">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Articles <span className="font-normal text-slate-500">({items.length}/{MAX_ARTICLES})</span>
          </p>
          <button
            type="button"
            className={BUTTON}
            data-testid="expert-article-add"
            disabled={items.length >= MAX_ARTICLES}
            onClick={() => {
              if (items.length >= MAX_ARTICLES) return;
              set("items", [...items, createEmptyArticle()]);
            }}
          >
            Add Article
          </button>
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="space-y-2 rounded-lg border border-slate-200 p-3"
            data-testid="expert-article-item"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={INPUT}
                placeholder="Title"
                value={item.title}
                onChange={(event) => updateItem(item.id, { ...item, title: event.target.value })}
              />
              <select
                className={INPUT}
                value={item.type}
                onChange={(event) =>
                  updateItem(item.id, {
                    ...item,
                    type: event.target.value as ExpertArticleType,
                  })
                }
              >
                {ARTICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
                placeholder="Date"
                value={item.date}
                onChange={(event) => updateItem(item.id, { ...item, date: event.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Reading time"
                value={item.readingTime}
                onChange={(event) =>
                  updateItem(item.id, { ...item, readingTime: event.target.value })
                }
              />
              <input
                className={INPUT}
                placeholder="External URL"
                value={item.externalUrl}
                onChange={(event) =>
                  updateItem(item.id, { ...item, externalUrl: event.target.value })
                }
              />
              <input
                className={`${INPUT} sm:col-span-2`}
                placeholder="Cover image URL"
                value={item.coverImageUrl}
                onChange={(event) =>
                  updateItem(item.id, { ...item, coverImageUrl: event.target.value })
                }
              />
            </div>
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Excerpt"
              value={item.excerpt}
              onChange={(event) => updateItem(item.id, { ...item, excerpt: event.target.value })}
            />
            <textarea
              className={INPUT}
              rows={3}
              placeholder="Body"
              value={item.body}
              onChange={(event) => updateItem(item.id, { ...item, body: event.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              <SwitchToggle
                label="Featured"
                checked={item.featured}
                onChange={(value) => updateItem(item.id, { ...item, featured: value })}
              />
              <SwitchToggle
                label="Visible"
                checked={item.visible}
                onChange={(value) => updateItem(item.id, { ...item, visible: value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={BUTTON}
                disabled={index === 0}
                onClick={() => set("items", moveItem(items, index, -1))}
              >
                Move up
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={index === items.length - 1}
                onClick={() => set("items", moveItem(items, index, 1))}
              >
                Move down
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createEmptyWork(): ExpertWorkItem {
  return {
    id: newExpertEntityId("work"),
    title: "New case study",
    clientName: "",
    category: "",
    year: "",
    shortDescription: "",
    challenge: "",
    result: "",
    linkUrl: "",
    coverImageUrl: "",
    metrics: [],
    visible: true,
  };
}

function WorksEditor({ content, updateExpert }: EditorProps) {
  const section = content.works;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      works: { ...current.works, [key]: value },
    }));
  const items = section.items;

  function updateItem(id: string, next: ExpertWorkItem) {
    set(
      "items",
      items.map((entry) => (entry.id === id ? next : entry)),
    );
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this work item?")) return;
    set(
      "items",
      items.filter((entry) => entry.id !== id),
    );
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-works-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <div className="space-y-2" data-testid="expert-works-list">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Works <span className="font-normal text-slate-500">({items.length}/{MAX_WORKS})</span>
          </p>
          <button
            type="button"
            className={BUTTON}
            data-testid="expert-work-add"
            disabled={items.length >= MAX_WORKS}
            onClick={() => {
              if (items.length >= MAX_WORKS) return;
              set("items", [...items, createEmptyWork()]);
            }}
          >
            Add Work
          </button>
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="space-y-2 rounded-lg border border-slate-200 p-3"
            data-testid="expert-work-item"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={INPUT}
                placeholder="Title"
                value={item.title}
                onChange={(event) => updateItem(item.id, { ...item, title: event.target.value })}
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
                placeholder="Category"
                value={item.category}
                onChange={(event) =>
                  updateItem(item.id, { ...item, category: event.target.value })
                }
              />
              <input
                className={INPUT}
                placeholder="Year"
                value={item.year}
                onChange={(event) => updateItem(item.id, { ...item, year: event.target.value })}
              />
              <input
                className={`${INPUT} sm:col-span-2`}
                placeholder="Link URL"
                value={item.linkUrl}
                onChange={(event) => updateItem(item.id, { ...item, linkUrl: event.target.value })}
              />
              <input
                className={`${INPUT} sm:col-span-2`}
                placeholder="Cover image URL"
                value={item.coverImageUrl}
                onChange={(event) =>
                  updateItem(item.id, { ...item, coverImageUrl: event.target.value })
                }
              />
            </div>
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Short description"
              value={item.shortDescription}
              onChange={(event) =>
                updateItem(item.id, { ...item, shortDescription: event.target.value })
              }
            />
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Challenge"
              value={item.challenge}
              onChange={(event) =>
                updateItem(item.id, { ...item, challenge: event.target.value })
              }
            />
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Result"
              value={item.result}
              onChange={(event) => updateItem(item.id, { ...item, result: event.target.value })}
            />
            <MetricsEditor
              metrics={item.metrics}
              onChange={(metrics) => updateItem(item.id, { ...item, metrics })}
            />
            <SwitchToggle
              label="Visible"
              checked={item.visible}
              onChange={(value) => updateItem(item.id, { ...item, visible: value })}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className={BUTTON}
                disabled={index === 0}
                onClick={() => set("items", moveItem(items, index, -1))}
              >
                Move up
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={index === items.length - 1}
                onClick={() => set("items", moveItem(items, index, 1))}
              >
                Move down
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsEditor({
  metrics,
  onChange,
}: {
  metrics: string[];
  onChange: (metrics: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addMetric() {
    const value = draft.trim();
    if (!value) return;
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    onChange([...metrics, ...parts].slice(0, 4));
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Metrics</p>
      <div className="flex flex-wrap gap-1.5">
        {metrics.map((metric, index) => (
          <button
            key={`${metric}-${index}`}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
            onClick={() => onChange(metrics.filter((_, i) => i !== index))}
            title="Remove metric"
          >
            {metric}
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={INPUT}
          placeholder="Add metric (comma-separated ok)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addMetric();
            }
          }}
        />
        <button type="button" className={BUTTON} onClick={addMetric} disabled={metrics.length >= 4}>
          Add
        </button>
      </div>
    </div>
  );
}

function createEmptyTestimonial(): ExpertTestimonialItem {
  return {
    id: newExpertEntityId("testimonial"),
    name: "Client",
    role: "",
    quote: "Add a testimonial quote…",
    rating: 5,
    date: "",
    avatarInitials: "C",
    visible: true,
  };
}

function TestimonialsEditor({ content, updateExpert }: EditorProps) {
  const section = content.testimonials;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      testimonials: { ...current.testimonials, [key]: value },
    }));
  const items = section.items;

  function updateItem(id: string, next: ExpertTestimonialItem) {
    set(
      "items",
      items.map((entry) => (entry.id === id ? next : entry)),
    );
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this testimonial?")) return;
    set(
      "items",
      items.filter((entry) => entry.id !== id),
    );
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-testimonials-title"
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
          max={12}
          value={section.maxCount}
          onChange={(event) =>
            set("maxCount", Math.min(12, Math.max(1, Number(event.target.value) || 1)))
          }
        />
      </Field>
      <Toggle
        label="Show rating"
        checked={section.showRating}
        onChange={(value) => set("showRating", value)}
      />
      {section.source !== "approved" ? (
        <div className="space-y-2" data-testid="expert-testimonials-list">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Manual testimonials{" "}
              <span className="font-normal text-slate-500">
                ({items.length}/{MAX_TESTIMONIALS})
              </span>
            </p>
            <button
              type="button"
              className={BUTTON}
              data-testid="expert-testimonial-add"
              disabled={items.length >= MAX_TESTIMONIALS}
              onClick={() => {
                if (items.length >= MAX_TESTIMONIALS) return;
                set("items", [...items, createEmptyTestimonial()]);
              }}
            >
              Add testimonial
            </button>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
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
                      rating: Math.min(5, Math.max(1, Number(event.target.value) || 1)),
                    })
                  }
                />
                <input
                  className={INPUT}
                  placeholder="Date"
                  value={item.date}
                  onChange={(event) =>
                    updateItem(item.id, { ...item, date: event.target.value })
                  }
                />
                <input
                  className={INPUT}
                  placeholder="Avatar initials"
                  value={item.avatarInitials}
                  onChange={(event) =>
                    updateItem(item.id, { ...item, avatarInitials: event.target.value })
                  }
                />
              </div>
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
                onChange={(value) => updateItem(item.id, { ...item, visible: value })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={BUTTON}
                  disabled={index === 0}
                  onClick={() => set("items", moveItem(items, index, -1))}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  disabled={index === items.length - 1}
                  onClick={() => set("items", moveItem(items, index, 1))}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FaqEditor({ content, updateExpert }: EditorProps) {
  const section = content.faq;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({ ...current, faq: { ...current.faq, [key]: value } }));

  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        value={section.title}
        onChange={(value) => set("title", value)}
        testId="expert-editor-faq-title"
      />
      <TextArea
        label="Subtitle"
        value={section.subtitle}
        onChange={(value) => set("subtitle", value)}
      />
      <EditableRows
        items={section.items}
        label="Questions"
        addLabel="Add question"
        onChange={(items) => set("items", items)}
        create={() => ({ id: newExpertEntityId("faq"), question: "", answer: "" })}
        render={(item, change) => (
          <div className="grid gap-2">
            <input
              className={INPUT}
              placeholder="Question"
              value={item.question}
              onChange={(event) => change({ ...item, question: event.target.value })}
            />
            <textarea
              className={INPUT}
              placeholder="Answer"
              rows={2}
              value={item.answer}
              onChange={(event) => change({ ...item, answer: event.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}

function ContactEditor({ content, updateExpert }: EditorProps) {
  const section = content.contactCta;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      contactCta: { ...current.contactCta, [key]: value },
    }));

  return (
    <div className="space-y-3">
      <TextField
        label="Headline"
        value={section.headline}
        onChange={(value) => set("headline", value)}
        testId="expert-editor-contact-headline"
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
      <div className="grid gap-2 sm:grid-cols-2">
        {(["showPhone", "showEmail", "showLocation"] as const).map((key) => (
          <Toggle
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
            set("backgroundStyle", event.target.value as typeof section.backgroundStyle)
          }
        >
          <option value="dark">Dark</option>
          <option value="primary">Primary</option>
          <option value="soft">Soft</option>
        </select>
      </Field>
    </div>
  );
}

function FooterEditor({
  content,
  updateExpert,
  draft,
  setDraft,
}: EditorProps & {
  draft: MiniSiteConfig;
  setDraft: React.Dispatch<React.SetStateAction<MiniSiteConfig | null>>;
}) {
  const section = content.footer;
  const set = <K extends keyof typeof section>(key: K, value: (typeof section)[K]) =>
    updateExpert((current) => ({
      ...current,
      footer: { ...current.footer, [key]: value },
    }));
  const setSocial = (key: "website" | "instagram", value: string) =>
    setDraft((current) =>
      current ? { ...current, socialLinks: { ...current.socialLinks, [key]: value } } : current,
    );

  return (
    <div className="space-y-3">
      <TextArea
        label="Description"
        value={section.description}
        onChange={(value) => set("description", value)}
        testId="expert-editor-footer-description"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          ["showQuickLinks", "showServicesLinks", "showSocialLinks", "showContactInfo"] as const
        ).map((key) => (
          <Toggle
            key={key}
            label={key.replace(/show([A-Z])/, "Show $1")}
            checked={section[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
      <TextField
        label="Copyright text"
        value={section.copyrightText}
        onChange={(value) => set("copyrightText", value)}
      />
      <TextField
        label="Website"
        value={draft.socialLinks.website ?? ""}
        onChange={(value) => setSocial("website", value)}
      />
      <TextField
        label="Instagram"
        value={draft.socialLinks.instagram ?? ""}
        onChange={(value) => setSocial("instagram", value)}
      />
    </div>
  );
}

function ColorOverrideField({
  label,
  value,
  fallback,
  testId,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  testId: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = hexColorForPicker(value || fallback, fallback);
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-1"
          data-testid={`${testId}-picker`}
          aria-label={`${label} color picker`}
        />
        <input
          className={INPUT}
          value={value}
          placeholder="Theme default"
          onChange={(event) => onChange(event.target.value)}
          data-testid={testId}
        />
      </div>
    </div>
  );
}

function SettingsEditor({
  content,
  draft,
  setDraft,
  businessId,
  updateExpert,
}: EditorProps & {
  draft: MiniSiteConfig;
  setDraft: React.Dispatch<React.SetStateAction<MiniSiteConfig | null>>;
  businessId: string;
}) {
  const setTheme = <K extends keyof MiniSiteConfig["theme"]>(
    key: K,
    value: MiniSiteConfig["theme"][K],
  ) =>
    setDraft((current) =>
      current ? { ...current, theme: { ...current.theme, [key]: value } } : current,
    );
  const typography = content.typography;
  const showCustomFont =
    typography.headingFontPreset === "custom" ||
    typography.bodyFontPreset === "custom" ||
    typography.buttonFontPreset === "custom";

  const setTypography = <K extends keyof ExpertTypographySettings>(
    key: K,
    value: ExpertTypographySettings[K],
  ) =>
    updateExpert((current) => ({
      ...current,
      typography: { ...current.typography, [key]: value },
    }));

  const setFontPreset = (
    key: "headingFontPreset" | "bodyFontPreset" | "buttonFontPreset",
    value: string,
  ) => {
    const preset = EXPERT_FONT_PRESET_OPTIONS.some((entry) => entry.id === value)
      ? (value as ServiceFontPresetId)
      : "system_sans";
    setTypography(key, preset);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2" data-testid="expert-editor-theme-preset">
        <p className="text-sm font-medium text-slate-700">Theme preset</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(EXPERT_THEME_PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm ${
                content.themePreset === preset.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
              data-testid={`expert-editor-theme-preset-${preset.id}`}
              onClick={() =>
                setDraft((current) =>
                  current ? applyExpertThemePreset(current, preset.id) : current,
                )
              }
            >
              <span className="flex shrink-0 gap-0.5" aria-hidden="true">
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
              <span className="min-w-0 font-medium">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Primary color"
          value={draft.theme.primaryColor}
          onChange={(value) => setTheme("primaryColor", value)}
        />
        <TextField
          label="Accent color"
          value={draft.theme.accentColor}
          onChange={(value) => setTheme("accentColor", value)}
        />
        <TextField
          label="Background color"
          value={draft.theme.backgroundColor}
          onChange={(value) => setTheme("backgroundColor", value)}
        />
        <div className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Background style</span>
          <select
            className={INPUT}
            value={draft.theme.backgroundStyle}
            onChange={(event) =>
              setTheme(
                "backgroundStyle",
                event.target.value as MiniSiteConfig["theme"]["backgroundStyle"],
              )
            }
            data-testid="expert-editor-background-style"
          >
            {MINI_SITE_BACKGROUND_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
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
            data-testid="expert-editor-button-style"
          >
            {MINI_SITE_BUTTON_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div
        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        data-testid="expert-editor-typography"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Typography</p>
            <p className="text-xs text-slate-500">
              Safe font stacks and text colors. Empty colors use theme defaults.
            </p>
          </div>
          <button
            type="button"
            className={BUTTON}
            data-testid="expert-editor-typography-reset"
            onClick={() =>
              updateExpert((current) => ({
                ...current,
                typography: createDefaultExpertTypography(),
              }))
            }
          >
            Reset typography
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading font">
            <select
              className={INPUT}
              value={typography.headingFontPreset}
              onChange={(event) => setFontPreset("headingFontPreset", event.target.value)}
              data-testid="expert-editor-heading-font"
            >
              {EXPERT_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body font">
            <select
              className={INPUT}
              value={typography.bodyFontPreset}
              onChange={(event) => setFontPreset("bodyFontPreset", event.target.value)}
              data-testid="expert-editor-body-font"
            >
              {EXPERT_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Button font">
            <select
              className={INPUT}
              value={typography.buttonFontPreset}
              onChange={(event) => setFontPreset("buttonFontPreset", event.target.value)}
              data-testid="expert-editor-button-font"
            >
              {EXPERT_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          {showCustomFont ? (
            <Field label="Custom font family">
              <input
                className={INPUT}
                value={typography.customFontFamily}
                placeholder="e.g. Avenir, Helvetica, sans-serif"
                onChange={(event) =>
                  setTypography("customFontFamily", sanitizeCustomFontFamily(event.target.value))
                }
                data-testid="expert-editor-custom-font"
              />
            </Field>
          ) : null}
          <Field label="Heading weight">
            <select
              className={INPUT}
              value={typography.headingWeight}
              onChange={(event) =>
                setTypography(
                  "headingWeight",
                  Number(event.target.value) as ExpertTypographySettings["headingWeight"],
                )
              }
              data-testid="expert-editor-heading-weight"
            >
              {[600, 700, 800, 900].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body weight">
            <select
              className={INPUT}
              value={typography.bodyWeight}
              onChange={(event) =>
                setTypography(
                  "bodyWeight",
                  Number(event.target.value) as ExpertTypographySettings["bodyWeight"],
                )
              }
              data-testid="expert-editor-body-weight"
            >
              {[400, 500].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Button weight">
            <select
              className={INPUT}
              value={typography.buttonWeight}
              onChange={(event) =>
                setTypography(
                  "buttonWeight",
                  Number(event.target.value) as ExpertTypographySettings["buttonWeight"],
                )
              }
              data-testid="expert-editor-button-weight"
            >
              {[600, 700].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" data-testid="expert-editor-typography-colors">
          <ColorOverrideField
            label="Heading color"
            value={typography.headingColor}
            fallback={draft.theme.primaryColor}
            testId="expert-editor-heading-color"
            onChange={(value) => setTypography("headingColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Body text color"
            value={typography.bodyColor}
            fallback="#0f172a"
            testId="expert-editor-body-color"
            onChange={(value) => setTypography("bodyColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Muted text color"
            value={typography.mutedColor}
            fallback="#64748b"
            testId="expert-editor-muted-color"
            onChange={(value) => setTypography("mutedColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Hero heading color"
            value={typography.heroHeadingColor}
            fallback="#ffffff"
            testId="expert-editor-hero-heading-color"
            onChange={(value) =>
              setTypography("heroHeadingColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Hero body color"
            value={typography.heroBodyColor}
            fallback="#e2e8f0"
            testId="expert-editor-hero-body-color"
            onChange={(value) =>
              setTypography("heroBodyColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Accent text color"
            value={typography.accentTextColor}
            fallback={draft.theme.accentColor}
            testId="expert-editor-accent-text-color"
            onChange={(value) =>
              setTypography("accentTextColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Button text color"
            value={typography.buttonTextColor}
            fallback="#ffffff"
            testId="expert-editor-button-text-color"
            onChange={(value) =>
              setTypography("buttonTextColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Card text color"
            value={typography.cardTextColor}
            fallback="#0f172a"
            testId="expert-editor-card-text-color"
            onChange={(value) =>
              setTypography("cardTextColor", coerceTypographyColorInput(value))
            }
          />
        </div>
      </div>

      <MiniSiteTemplateMediaSection
        businessId={businessId}
        template="expert"
        templateMedia={draft.templateMedia}
        onTemplateMediaChange={(templateMedia) =>
          setDraft((current) => (current ? { ...current, templateMedia } : current))
        }
      />
    </div>
  );
}

function StringListEditor({
  label,
  addLabel,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  addLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [bulk, setBulk] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <button
          type="button"
          className={BUTTON}
          onClick={() => onChange([...items, ""])}
        >
          {addLabel}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`badge-${index}`} className="flex gap-2">
          <input
            className={INPUT}
            placeholder={placeholder}
            value={item}
            onChange={(event) => {
              const next = [...items];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className={BUTTON}
            disabled={index === 0}
            onClick={() => onChange(moveItem(items, index, -1))}
          >
            ↑
          </button>
          <button
            type="button"
            className={BUTTON}
            disabled={index === items.length - 1}
            onClick={() => onChange(moveItem(items, index, 1))}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={INPUT}
          placeholder="Or paste comma-separated badges"
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const parts = bulk
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean);
              if (parts.length) {
                onChange([...items, ...parts]);
                setBulk("");
              }
            }
          }}
        />
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            const parts = bulk
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean);
            if (parts.length) {
              onChange([...items, ...parts]);
              setBulk("");
            }
          }}
        >
          Add from list
        </button>
      </div>
    </div>
  );
}

function EditableRows<T extends { id: string }>({
  items,
  label,
  addLabel,
  onChange,
  create,
  render,
}: {
  items: T[];
  label: string;
  addLabel: string;
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, change: (item: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <button type="button" className={BUTTON} onClick={() => onChange([...items, create()])}>
          {addLabel}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
          {render(item, (next) =>
            onChange(items.map((entry) => (entry.id === item.id ? next : entry))),
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={index === 0}
              onClick={() => onChange(moveItem(items, index, -1))}
            >
              Move up
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, 1))}
            >
              Move down
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
              onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
