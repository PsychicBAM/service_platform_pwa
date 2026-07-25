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
  applyServiceThemePreset,
  createDefaultServiceTypography,
  getServiceTemplateContent,
  newServiceEntityId,
  SERVICE_FONT_PRESET_OPTIONS,
  SERVICE_STEP_ICON_OPTIONS,
  SERVICE_THEME_PRESETS,
  sanitizeCustomFontFamily,
  setServiceTemplateContent,
  coerceTypographyColorInput,
} from "@/lib/serviceTemplateConfig";
import { hexColorForPicker } from "@/lib/miniSiteTemplatePresentation";
import type { TemplateBuilderSection } from "@/lib/miniSiteTemplateBuilders";
import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  type MiniSiteConfig,
  type MiniSiteTemplate,
} from "@/types/miniSite";
import type {
  ServiceFontPresetId,
  ServiceSectionId,
  ServiceTemplateContent,
  ServiceTypographySettings,
} from "@/types/serviceTemplate";
import { SERVICE_SECTION_IDS } from "@/types/serviceTemplate";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

export type ServiceTemplateEditorProps = {
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

const INPUT = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const BUTTON = "rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function TextField({ label, value, onChange, testId }: { label: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return <Field label={label}><input className={INPUT} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} /></Field>;
}

function TextArea({ label, value, onChange, testId }: { label: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return <Field label={label}><textarea className={INPUT} rows={2} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} /></Field>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function ServiceTemplateEditor({
  businessId,
  businessName,
  allowedTemplates,
  requestedTemplate,
  onTemplateChange,
  onSaveStatusChange,
  activeSectionId,
  onSelectSection,
  sections,
  templateLabel = "Service",
  previewBadge,
}: ServiceTemplateEditorProps) {
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
    queryKey: ["admin-services", businessId, "service-editor"],
    queryFn: () => listAdminServices(businessId, { limit: 100, include_inactive: true }),
    enabled: Boolean(businessId),
  });

  function prepare(config: MiniSiteConfig): MiniSiteConfig {
    const normalized = normalizeMiniSiteConfig(config);
    if (allowedTemplates === undefined || allowedTemplates.includes("service")) {
      return { ...normalized, theme: { ...normalized.theme, template: "service" } };
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
    // Dedicated Service editor must stay on service — ignore stale requestedTemplate from other templates.
    if (!requestedTemplate || requestedTemplate !== "service") return;
    setDraft((current) => {
      if (!current || current.theme.template === "service") return current;
      if (allowedTemplates && !allowedTemplates.includes("service")) return current;
      return { ...current, theme: { ...current.theme, template: "service" } };
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

  function updateService(updater: (content: ServiceTemplateContent) => ServiceTemplateContent) {
    setDraft((current) => current ? setServiceTemplateContent(current, updater(getServiceTemplateContent(current))) : current);
  }

  async function save() {
    if (!draft) return;
    setSaveSuccess(false);
    setSaveError(null);
    onSaveStatusChange?.("idle");
    try {
      await saveMutation.mutateAsync(draft);
    } catch (error) {
      setSaveError(getAdminSettingsErrorMessage(error, "Could not save service mini-site."));
      onSaveStatusChange?.("error");
    }
  }

  if (configQuery.isLoading || !draft) return <LoadingState message="Loading service mini-site…" />;
  if (configQuery.isError) return <ErrorState title="Could not load service mini-site" message="Try refreshing the page." />;

  const content = getServiceTemplateContent(draft);
  const update = <K extends keyof ServiceTemplateContent>(key: K, value: ServiceTemplateContent[K]) =>
    updateService((current) => ({ ...current, [key]: value }));
  const sectionProps = { content, updateService, update };
  const isToggleable =
    (SERVICE_SECTION_IDS as readonly string[]).includes(activeSectionId);
  const sectionHidden =
    isToggleable && content.sectionVisibility[activeSectionId as ServiceSectionId] === false;

  return (
    <div className="space-y-4" data-testid="service-editor" data-section={activeSectionId}>
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(420px,1fr)_minmax(340px,360px)]">
        <TemplateSectionNav
          sections={sections}
          selectedSectionId={activeSectionId}
          onSelectSection={onSelectSection}
          templateLabel={templateLabel}
          sectionVisibility={content.sectionVisibility}
          onToggleSectionVisibility={(sectionId, visible) => {
            if (!(SERVICE_SECTION_IDS as readonly string[]).includes(sectionId)) return;
            updateService((current) => ({
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
              data-testid="service-section-hidden-banner"
            >
              Hidden on public page — you can still edit this section. Turn the switch back on to show it.
            </div>
          ) : null}
          {activeSectionId === "hero" && <HeroEditor {...sectionProps} />}
          {activeSectionId === "services" && (
            <ServicesEditor
              {...sectionProps}
              services={servicesQuery.data?.data ?? []}
              loading={servicesQuery.isLoading}
            />
          )}
          {activeSectionId === "how-it-works" && <HowItWorksEditor {...sectionProps} />}
          {activeSectionId === "why-choose-us" && <WhyEditor {...sectionProps} />}
          {activeSectionId === "pricing" && <PricingEditor {...sectionProps} />}
          {activeSectionId === "reviews" && <ReviewsEditor {...sectionProps} />}
          {activeSectionId === "faq" && <FaqEditor {...sectionProps} />}
          {activeSectionId === "contact" && <ContactEditor {...sectionProps} />}
          {activeSectionId === "footer" && <FooterEditor {...sectionProps} draft={draft} setDraft={setDraft} />}
          {activeSectionId === "settings" && (
            <SettingsEditor {...sectionProps} draft={draft} setDraft={setDraft} businessId={businessId} />
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
      {saveError && <ErrorState title="Could not save service mini-site" message={saveError} />}
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => configQuery.data && setDraft(prepare(configQuery.data))}
          data-testid="service-editor-reset"
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={saveMutation.isPending}
          onClick={() => void save()}
          data-testid="service-editor-save"
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

type EditorProps = {
  content: ServiceTemplateContent;
  updateService: (updater: (content: ServiceTemplateContent) => ServiceTemplateContent) => void;
  update: <K extends keyof ServiceTemplateContent>(key: K, value: ServiceTemplateContent[K]) => void;
};

function HeroEditor({ content, updateService }: EditorProps) {
  const hero = content.hero;
  const set = <K extends keyof typeof hero>(key: K, value: typeof hero[K]) => updateService((current) => ({ ...current, hero: { ...current.hero, [key]: value } }));
  return <div className="space-y-3">
    <TextField label="Eyebrow" value={hero.eyebrow} onChange={(value) => set("eyebrow", value)} />
    <TextField label="Headline" value={hero.headline} onChange={(value) => set("headline", value)} testId="service-editor-hero-headline" />
    <TextField label="Headline highlight" value={hero.headlineHighlight} onChange={(value) => set("headlineHighlight", value)} />
    <TextArea label="Subtitle" value={hero.subtitle} onChange={(value) => set("subtitle", value)} />
    <TextField label="Primary CTA label" value={hero.primaryCtaLabel} onChange={(value) => set("primaryCtaLabel", value)} />
    <TextField label="Secondary CTA label" value={hero.secondaryCtaLabel} onChange={(value) => set("secondaryCtaLabel", value)} />
    <div className="flex flex-wrap gap-4"><Toggle label="Show call button" checked={hero.showCallButton} onChange={(value) => set("showCallButton", value)} /><Toggle label="Show WhatsApp button" checked={hero.showWhatsappButton} onChange={(value) => set("showWhatsappButton", value)} /></div>
    <TextField label="Rating line" value={hero.ratingLine} onChange={(value) => set("ratingLine", value)} />
    <Field label="Layout"><select className={INPUT} value={hero.layoutStyle} onChange={(event) => set("layoutStyle", event.target.value as typeof hero.layoutStyle)}><option value="split">Split</option><option value="overlay">Overlay</option><option value="centered">Centered</option></select></Field>
    <EditableRows items={hero.trustBadges} label="Trust badges" addLabel="Add badge" onChange={(items) => set("trustBadges", items)} create={() => ({ id: newServiceEntityId("badge"), label: "" })} render={(item, change) => <input className={INPUT} value={item.label} onChange={(event) => change({ ...item, label: event.target.value })} />} />
    <EditableRows items={hero.stats} label="Stats" addLabel="Add stat" onChange={(items) => set("stats", items)} create={() => ({ id: newServiceEntityId("stat"), value: "", label: "" })} render={(item, change) => <div className="grid gap-2 sm:grid-cols-2"><input className={INPUT} placeholder="Value" value={item.value} onChange={(event) => change({ ...item, value: event.target.value })} /><input className={INPUT} placeholder="Label" value={item.label} onChange={(event) => change({ ...item, label: event.target.value })} /></div>} />
  </div>;
}

function ServicesEditor({ content, updateService, services, loading }: EditorProps & { services: { id: string; name: string; is_active: boolean }[]; loading: boolean }) {
  const section = content.servicesCatalog;
  const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, servicesCatalog: { ...current.servicesCatalog, [key]: value } }));
  const selected = section.selectedServiceIds;
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><h4 className="font-semibold text-slate-900">Services</h4><Link to="/admin/services" className="text-sm font-medium text-emerald-700 hover:underline" data-testid="service-editor-managed-services-link">Manage services</Link></div>
    <TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-services-title" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} />
    <div className="space-y-2 rounded-lg border border-slate-200 p-3"><p className="text-sm font-medium text-slate-700">Services to show <span className="font-normal text-slate-500">(none selected shows all)</span></p>{loading ? <p className="text-sm text-slate-500">Loading services…</p> : services.map((service) => <div key={service.id} className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(service.id)} onChange={(event) => set("selectedServiceIds", event.target.checked ? [...selected, service.id] : selected.filter((id) => id !== service.id))} /><span className="flex-1 text-sm">{service.name}{!service.is_active ? " (inactive)" : ""}</span>{selected.includes(service.id) && <><button className={BUTTON} disabled={selected.indexOf(service.id) === 0} onClick={() => set("selectedServiceIds", moveItem(selected, selected.indexOf(service.id), -1))}>↑</button><button className={BUTTON} disabled={selected.indexOf(service.id) === selected.length - 1} onClick={() => set("selectedServiceIds", moveItem(selected, selected.indexOf(service.id), 1))}>↓</button></>}</div>)}</div>
    <div className="grid gap-2 sm:grid-cols-2">{(["showImage", "showPrice", "showDuration", "showDescription", "showCategory"] as const).map((key) => <Toggle key={key} label={key.replace("show", "Show ")} checked={section[key]} onChange={(value) => set(key, value)} />)}</div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Card style"><select className={INPUT} value={section.cardStyle} onChange={(event) => set("cardStyle", event.target.value as typeof section.cardStyle)}><option value="premium">Premium</option><option value="image_top">Image top</option><option value="compact">Compact</option></select></Field><Field label="Desktop columns"><select className={INPUT} value={section.desktopColumns} onChange={(event) => set("desktopColumns", Number(event.target.value) as 2 | 3 | 4)}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></Field><Field label="Mobile style"><select className={INPUT} value={section.mobileStyle} onChange={(event) => set("mobileStyle", event.target.value as typeof section.mobileStyle)}><option value="card_list">Card list</option><option value="compact_list">Compact list</option></select></Field><TextField label="Button label" value={section.buttonLabel} onChange={(value) => set("buttonLabel", value)} /></div>
  </div>;
}

function HowItWorksEditor({ content, updateService }: EditorProps) {
  const section = content.howItWorks; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, howItWorks: { ...current.howItWorks, [key]: value } }));
  return <div className="space-y-3"><TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-how-it-works-title" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><EditableRows items={section.steps} label="Steps" addLabel="Add step" onChange={(items) => set("steps", items)} create={() => ({ id: newServiceEntityId("step"), icon: "clipboard", title: "", description: "" })} render={(item, change) => <div className="grid gap-2"><select className={INPUT} value={item.icon} onChange={(event) => change({ ...item, icon: event.target.value })}>{SERVICE_STEP_ICON_OPTIONS.map((icon) => <option key={icon.id} value={icon.id}>{icon.label}</option>)}</select><input className={INPUT} placeholder="Title" value={item.title} onChange={(event) => change({ ...item, title: event.target.value })} /><textarea className={INPUT} placeholder="Description" value={item.description} onChange={(event) => change({ ...item, description: event.target.value })} /></div>} /><Toggle label="Show numbering" checked={section.showNumbering} onChange={(value) => set("showNumbering", value)} /><Field label="Background style"><select className={INPUT} value={section.backgroundStyle} onChange={(event) => set("backgroundStyle", event.target.value as typeof section.backgroundStyle)}><option value="light">Light</option><option value="soft">Soft</option><option value="dark">Dark</option></select></Field></div>;
}

function WhyEditor({ content, updateService }: EditorProps) {
  const section = content.whyChooseUs; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, whyChooseUs: { ...current.whyChooseUs, [key]: value } }));
  return <div className="space-y-3"><TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-why-title" /><TextField label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><TextArea label="Description" value={section.description} onChange={(value) => set("description", value)} /><EditableRows items={section.benefits} label="Benefits" addLabel="Add benefit" onChange={(items) => set("benefits", items)} create={() => ({ id: newServiceEntityId("benefit"), text: "" })} render={(item, change) => <input className={INPUT} value={item.text} onChange={(event) => change({ ...item, text: event.target.value })} />} /><Field label="Layout"><select className={INPUT} value={section.layout} onChange={(event) => set("layout", event.target.value as typeof section.layout)}><option value="image_right">Image right</option><option value="image_left">Image left</option><option value="cards_grid">Cards grid</option></select></Field><Toggle label="Show CTA" checked={section.showCta} onChange={(value) => set("showCta", value)} />{section.showCta && <TextField label="CTA label" value={section.ctaLabel} onChange={(value) => set("ctaLabel", value)} />}</div>;
}

function PricingEditor({ content, updateService }: EditorProps) {
  const section = content.pricingPackages; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, pricingPackages: { ...current.pricingPackages, [key]: value } }));
  return <div className="space-y-3"><TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-pricing-title" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><EditableRows items={section.packages} label="Packages" addLabel="Add package" onChange={(items) => set("packages", items)} create={() => ({ id: newServiceEntityId("package"), name: "", price: "", billingLabel: "", description: "", includes: [], popular: false, ctaLabel: "Book now", ctaAction: "booking" as const })} render={(item, change) => <div className="grid gap-2 sm:grid-cols-2"><input className={INPUT} placeholder="Name" value={item.name} onChange={(event) => change({ ...item, name: event.target.value })} /><input className={INPUT} placeholder="Price" value={item.price} onChange={(event) => change({ ...item, price: event.target.value })} /><input className={INPUT} placeholder="Billing label" value={item.billingLabel} onChange={(event) => change({ ...item, billingLabel: event.target.value })} /><input className={INPUT} placeholder="CTA label" value={item.ctaLabel} onChange={(event) => change({ ...item, ctaLabel: event.target.value })} /><textarea className={INPUT} placeholder="Description" value={item.description} onChange={(event) => change({ ...item, description: event.target.value })} /><textarea className={INPUT} placeholder="Includes (one per line)" value={item.includes.join("\n")} onChange={(event) => change({ ...item, includes: event.target.value.split("\n").filter(Boolean) })} /><Toggle label="Popular" checked={item.popular} onChange={(value) => change({ ...item, popular: value })} /></div>} /><Toggle label="Show comparison" checked={section.showComparison} onChange={(value) => set("showComparison", value)} /></div>;
}

function ReviewsEditor({ content, updateService }: EditorProps) {
  const section = content.reviews; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, reviews: { ...current.reviews, [key]: value } }));
  return <div className="space-y-3"><TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-reviews-title" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><Field label="Source"><select className={INPUT} value={section.source} onChange={(event) => set("source", event.target.value as typeof section.source)}><option value="approved">Approved reviews</option><option value="custom">Custom testimonials</option><option value="both">Both</option></select></Field><Field label="Maximum count"><input className={INPUT} type="number" min={1} max={12} value={section.maxCount} onChange={(event) => set("maxCount", Math.min(12, Math.max(1, Number(event.target.value) || 1)))} /></Field><div className="flex gap-4"><Toggle label="Show rating" checked={section.showRating} onChange={(value) => set("showRating", value)} /><Toggle label="Show avatar" checked={section.showAvatar} onChange={(value) => set("showAvatar", value)} /></div>{section.source !== "approved" && <EditableRows items={section.customTestimonials} label="Custom testimonials" addLabel="Add testimonial" onChange={(items) => set("customTestimonials", items)} create={() => ({ id: newServiceEntityId("testimonial"), name: "", quote: "", rating: 5 })} render={(item, change) => <div className="grid gap-2"><input className={INPUT} placeholder="Name" value={item.name} onChange={(event) => change({ ...item, name: event.target.value })} /><textarea className={INPUT} placeholder="Quote" value={item.quote} onChange={(event) => change({ ...item, quote: event.target.value })} /><input className={INPUT} type="number" min={1} max={5} value={item.rating} onChange={(event) => change({ ...item, rating: Math.min(5, Math.max(1, Number(event.target.value) || 1)) })} /></div>} />}</div>;
}

function FaqEditor({ content, updateService }: EditorProps) {
  const section = content.faq; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, faq: { ...current.faq, [key]: value } }));
  return <div className="space-y-3"><TextField label="Title" value={section.title} onChange={(value) => set("title", value)} testId="service-editor-faq-title" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><EditableRows items={section.items} label="Questions" addLabel="Add question" onChange={(items) => set("items", items)} create={() => ({ id: newServiceEntityId("faq"), question: "", answer: "" })} render={(item, change) => <div className="grid gap-2"><input className={INPUT} placeholder="Question" value={item.question} onChange={(event) => change({ ...item, question: event.target.value })} /><textarea className={INPUT} placeholder="Answer" value={item.answer} onChange={(event) => change({ ...item, answer: event.target.value })} /></div>} /><Field label="Default open question"><select className={INPUT} value={section.defaultOpenId ?? ""} onChange={(event) => set("defaultOpenId", event.target.value || null)}><option value="">None</option>{section.items.map((item) => <option key={item.id} value={item.id}>{item.question || "Untitled question"}</option>)}</select></Field></div>;
}

function ContactEditor({ content, updateService }: EditorProps) {
  const section = content.contactCta; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, contactCta: { ...current.contactCta, [key]: value } }));
  return <div className="space-y-3"><TextField label="Headline" value={section.headline} onChange={(value) => set("headline", value)} testId="service-editor-contact-headline" /><TextArea label="Subtitle" value={section.subtitle} onChange={(value) => set("subtitle", value)} /><div className="grid gap-3 sm:grid-cols-2"><TextField label="Primary CTA label" value={section.primaryCtaLabel} onChange={(value) => set("primaryCtaLabel", value)} /><TextField label="Secondary CTA label" value={section.secondaryCtaLabel} onChange={(value) => set("secondaryCtaLabel", value)} /></div><div className="grid gap-2 sm:grid-cols-2">{(["showPhone", "showEmail", "showLocation", "showHours"] as const).map((key) => <Toggle key={key} label={key.replace("show", "Show ")} checked={section[key]} onChange={(value) => set(key, value)} />)}</div><Field label="Background style"><select className={INPUT} value={section.backgroundStyle} onChange={(event) => set("backgroundStyle", event.target.value as typeof section.backgroundStyle)}><option value="dark">Dark</option><option value="primary">Primary</option><option value="soft">Soft</option></select></Field></div>;
}

function FooterEditor({ content, updateService, draft, setDraft }: EditorProps & { draft: MiniSiteConfig; setDraft: React.Dispatch<React.SetStateAction<MiniSiteConfig | null>> }) {
  const section = content.footer; const set = <K extends keyof typeof section>(key: K, value: typeof section[K]) => updateService((current) => ({ ...current, footer: { ...current.footer, [key]: value } }));
  const setSocial = (key: "website" | "instagram", value: string) => setDraft((current) => current ? { ...current, socialLinks: { ...current.socialLinks, [key]: value } } : current);
  return <div className="space-y-3"><TextArea label="Description" value={section.description} onChange={(value) => set("description", value)} testId="service-editor-footer-description" /><div className="grid gap-2 sm:grid-cols-2">{(["showQuickLinks", "showServicesLinks", "showSocialLinks", "showContactInfo"] as const).map((key) => <Toggle key={key} label={key.replace(/show([A-Z])/,"Show $1")} checked={section[key]} onChange={(value) => set(key, value)} />)}</div><TextField label="Copyright text" value={section.copyrightText} onChange={(value) => set("copyrightText", value)} /><TextField label="Website" value={draft.socialLinks.website ?? ""} onChange={(value) => setSocial("website", value)} /><TextField label="Instagram" value={draft.socialLinks.instagram ?? ""} onChange={(value) => setSocial("instagram", value)} /></div>;
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

function SettingsEditor({ content, draft, setDraft, businessId, updateService }: EditorProps & { draft: MiniSiteConfig; setDraft: React.Dispatch<React.SetStateAction<MiniSiteConfig | null>>; businessId: string }) {
  const setTheme = <K extends keyof MiniSiteConfig["theme"]>(key: K, value: MiniSiteConfig["theme"][K]) => setDraft((current) => current ? { ...current, theme: { ...current.theme, [key]: value } } : current);
  const typography = content.typography;
  const showCustomFont =
    typography.headingFontPreset === "custom" ||
    typography.bodyFontPreset === "custom" ||
    typography.buttonFontPreset === "custom";

  const setTypography = <K extends keyof ServiceTypographySettings>(
    key: K,
    value: ServiceTypographySettings[K],
  ) =>
    updateService((current) => ({
      ...current,
      typography: { ...current.typography, [key]: value },
    }));

  const setFontPreset = (
    key: "headingFontPreset" | "bodyFontPreset" | "buttonFontPreset",
    value: string,
  ) => {
    const preset = SERVICE_FONT_PRESET_OPTIONS.some((entry) => entry.id === value)
      ? (value as ServiceFontPresetId)
      : "system_sans";
    setTypography(key, preset);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2" data-testid="service-editor-theme-preset">
        <p className="text-sm font-medium text-slate-700">Theme preset</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(SERVICE_THEME_PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm ${
                content.themePreset === preset.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
              data-testid={`service-editor-theme-preset-${preset.id}`}
              onClick={() =>
                setDraft((current) =>
                  current ? applyServiceThemePreset(current, preset.id) : current,
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
          <div className="relative flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-700">Background style</span>
            <button
              type="button"
              className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              data-testid="service-editor-background-style-help"
              aria-label="Background style help"
            >
              ?
              <span
                role="tooltip"
                data-testid="service-editor-background-style-tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-[11px] font-normal leading-relaxed text-slate-600 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="block font-semibold text-slate-800">Light</span>
                Clean white sections and minimal surfaces.
                <span className="mt-2 block font-semibold text-slate-800">Soft</span>
                Tinted section blocks and softer cards.
                <span className="mt-2 block font-semibold text-slate-800">Dark</span>
                Premium dark surfaces and stronger contrast.
              </span>
            </button>
          </div>
          <select
            className={INPUT}
            value={draft.theme.backgroundStyle}
            onChange={(event) =>
              setTheme(
                "backgroundStyle",
                event.target.value as MiniSiteConfig["theme"]["backgroundStyle"],
              )
            }
            data-testid="service-editor-background-style"
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
        data-testid="service-editor-typography"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800">Typography</p>
              <button
                type="button"
                className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                data-testid="service-editor-typography-font-help"
                aria-label="Font presets help"
              >
                ?
                <span
                  role="tooltip"
                  data-testid="service-editor-typography-font-tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-[11px] font-normal leading-relaxed text-slate-600 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  These are safe font stacks. Custom fonts work only if available on the visitor’s
                  device or loaded by your site.
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Safe font stacks and text colors. Empty colors use theme defaults.
            </p>
          </div>
          <button
            type="button"
            className={BUTTON}
            data-testid="service-editor-typography-reset"
            onClick={() =>
              updateService((current) => ({
                ...current,
                typography: createDefaultServiceTypography(),
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
              data-testid="service-editor-heading-font"
            >
              {SERVICE_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p
              className="mt-1 truncate text-xs text-slate-500"
              style={{
                fontFamily:
                  typography.headingFontPreset === "custom"
                    ? typography.customFontFamily || undefined
                    : SERVICE_FONT_PRESET_OPTIONS.find((o) => o.id === typography.headingFontPreset)
                        ?.stack || undefined,
              }}
              data-testid="service-editor-heading-font-sample"
            >
              Professional services
            </p>
          </Field>
          <Field label="Body font">
            <select
              className={INPUT}
              value={typography.bodyFontPreset}
              onChange={(event) => setFontPreset("bodyFontPreset", event.target.value)}
              data-testid="service-editor-body-font"
            >
              {SERVICE_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p
              className="mt-1 truncate text-xs text-slate-500"
              style={{
                fontFamily:
                  typography.bodyFontPreset === "custom"
                    ? typography.customFontFamily || undefined
                    : SERVICE_FONT_PRESET_OPTIONS.find((o) => o.id === typography.bodyFontPreset)
                        ?.stack || undefined,
              }}
              data-testid="service-editor-body-font-sample"
            >
              Professional services
            </p>
          </Field>
          <Field label="Button font">
            <select
              className={INPUT}
              value={typography.buttonFontPreset}
              onChange={(event) => setFontPreset("buttonFontPreset", event.target.value)}
              data-testid="service-editor-button-font"
            >
              {SERVICE_FONT_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p
              className="mt-1 truncate text-xs text-slate-500"
              style={{
                fontFamily:
                  typography.buttonFontPreset === "custom"
                    ? typography.customFontFamily || undefined
                    : SERVICE_FONT_PRESET_OPTIONS.find((o) => o.id === typography.buttonFontPreset)
                        ?.stack || undefined,
              }}
              data-testid="service-editor-button-font-sample"
            >
              Professional services
            </p>
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
                data-testid="service-editor-custom-font"
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
                  Number(event.target.value) as ServiceTypographySettings["headingWeight"],
                )
              }
              data-testid="service-editor-heading-weight"
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
                  Number(event.target.value) as ServiceTypographySettings["bodyWeight"],
                )
              }
              data-testid="service-editor-body-weight"
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
                  Number(event.target.value) as ServiceTypographySettings["buttonWeight"],
                )
              }
              data-testid="service-editor-button-weight"
            >
              {[600, 700].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" data-testid="service-editor-typography-colors">
          <ColorOverrideField
            label="Heading color"
            value={typography.headingColor}
            fallback={draft.theme.primaryColor}
            testId="service-editor-heading-color"
            onChange={(value) => setTypography("headingColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Body text color"
            value={typography.bodyColor}
            fallback="#0f172a"
            testId="service-editor-body-color"
            onChange={(value) => setTypography("bodyColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Muted text color"
            value={typography.mutedColor}
            fallback="#64748b"
            testId="service-editor-muted-color"
            onChange={(value) => setTypography("mutedColor", coerceTypographyColorInput(value))}
          />
          <ColorOverrideField
            label="Hero heading color"
            value={typography.heroHeadingColor}
            fallback="#ffffff"
            testId="service-editor-hero-heading-color"
            onChange={(value) =>
              setTypography("heroHeadingColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Hero body color"
            value={typography.heroBodyColor}
            fallback="#e2e8f0"
            testId="service-editor-hero-body-color"
            onChange={(value) =>
              setTypography("heroBodyColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Accent text color"
            value={typography.accentTextColor}
            fallback={draft.theme.accentColor}
            testId="service-editor-accent-text-color"
            onChange={(value) =>
              setTypography("accentTextColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Button text color"
            value={typography.buttonTextColor}
            fallback="#ffffff"
            testId="service-editor-button-text-color"
            onChange={(value) =>
              setTypography("buttonTextColor", coerceTypographyColorInput(value))
            }
          />
          <ColorOverrideField
            label="Card text color"
            value={typography.cardTextColor}
            fallback="#0f172a"
            testId="service-editor-card-text-color"
            onChange={(value) =>
              setTypography("cardTextColor", coerceTypographyColorInput(value))
            }
          />
        </div>
      </div>

      <MiniSiteTemplateMediaSection
        businessId={businessId}
        template="service"
        templateMedia={draft.templateMedia}
        onTemplateMediaChange={(templateMedia) =>
          setDraft((current) => (current ? { ...current, templateMedia } : current))
        }
      />
    </div>
  );
}

function EditableRows<T extends { id: string }>({ items, label, addLabel, onChange, create, render }: { items: T[]; label: string; addLabel: string; onChange: (items: T[]) => void; create: () => T; render: (item: T, change: (item: T) => void) => React.ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-700">{label}</p><button type="button" className={BUTTON} onClick={() => onChange([...items, create()])}>{addLabel}</button></div>{items.map((item, index) => <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">{render(item, (next) => onChange(items.map((entry) => entry.id === item.id ? next : entry)))}<div className="flex gap-2"><button type="button" className={BUTTON} disabled={index === 0} onClick={() => onChange(moveItem(items, index, -1))}>Move up</button><button type="button" className={BUTTON} disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))}>Move down</button><button type="button" className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}>Remove</button></div></div>)}</div>;
}
