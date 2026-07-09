import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMiniSiteConfig, updateMiniSiteConfig } from "@/api/miniSiteApi";
import { MiniSiteLivePreview } from "@/components/admin/MiniSiteLivePreview";
import { MiniSiteTemplateMediaSection } from "@/components/admin/MiniSiteTemplateMediaSection";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { DEFAULT_MINI_SITE_BACKGROUND_COLOR, normalizeMiniSiteConfig } from "@/lib/miniSiteConfig";
import {
  hexColorForPicker,
  normalizeHexColorInput,
} from "@/lib/miniSiteTemplatePresentation";
import {
  MINI_SITE_BACKGROUND_STYLES,
  MINI_SITE_BUTTON_STYLES,
  MINI_SITE_TEMPLATES,
  type MiniSiteBackgroundStyle,
  type MiniSiteButtonStyle,
  type MiniSiteConfig,
  type MiniSiteCopy,
  type MiniSiteFaqItem,
  type MiniSiteSectionType,
  type MiniSiteTemplate,
  type MiniSiteTrustCard,
} from "@/types/miniSite";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type MiniSiteEditorCardProps = {
  businessId: string;
  businessName?: string;
};

function getSectionField(
  config: MiniSiteConfig,
  type: MiniSiteSectionType,
  field: "title" | "subtitle" | "body",
): string {
  const section = config.sections.find((entry) => entry.type === type);
  return section?.[field] ?? "";
}

function updateSectionField(
  config: MiniSiteConfig,
  type: MiniSiteSectionType,
  field: "title" | "subtitle" | "body",
  value: string,
): MiniSiteConfig {
  return {
    ...config,
    sections: config.sections.map((section) =>
      section.type === type ? { ...section, [field]: value || undefined } : section,
    ),
  };
}

function updateSectionEnabled(
  config: MiniSiteConfig,
  type: MiniSiteSectionType,
  enabled: boolean,
): MiniSiteConfig {
  return {
    ...config,
    sections: config.sections.map((section) =>
      section.type === type ? { ...section, enabled } : section,
    ),
  };
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
      data-testid={id}
    />
  );
}

function ColorField({
  id,
  label,
  value,
  fallback,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const pickerValue = hexColorForPicker(value, fallback);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid={`${id}-picker`}
          aria-label={`${label} color picker`}
        />
        <TextInput
          id={id}
          value={value}
          disabled={disabled}
          placeholder={fallback}
          onChange={(nextValue) => onChange(nextValue)}
        />
      </div>
    </div>
  );
}

function updateCopyField<K extends keyof MiniSiteCopy>(
  config: MiniSiteConfig,
  field: K,
  value: MiniSiteCopy[K],
): MiniSiteConfig {
  return {
    ...config,
    copy: {
      ...config.copy,
      [field]: value,
    },
  };
}

function updateTrustCard(
  config: MiniSiteConfig,
  index: 0 | 1 | 2,
  field: keyof MiniSiteTrustCard,
  value: string,
): MiniSiteConfig {
  const trustCards = [...config.copy.trustCards] as MiniSiteCopy["trustCards"];
  trustCards[index] = { ...trustCards[index], [field]: value };
  return updateCopyField(config, "trustCards", trustCards);
}

function updateBenefitItem(
  config: MiniSiteConfig,
  index: 0 | 1 | 2,
  value: string,
): MiniSiteConfig {
  const benefitsItems = [...config.copy.benefitsItems] as MiniSiteCopy["benefitsItems"];
  benefitsItems[index] = value;
  return updateCopyField(config, "benefitsItems", benefitsItems);
}

function updateFaqItem(
  config: MiniSiteConfig,
  index: 0 | 1 | 2,
  field: keyof MiniSiteFaqItem,
  value: string,
): MiniSiteConfig {
  const faqItems = [...config.copy.faqItems] as MiniSiteCopy["faqItems"];
  faqItems[index] = { ...faqItems[index], [field]: value };
  return updateCopyField(config, "faqItems", faqItems);
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-3 space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SectionVisibilitySwitch({
  id,
  label,
  checked,
  disabled,
  onChange,
  testId,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  testId: string;
}) {
  const labelId = `${id}-label`;

  return (
    <label
      htmlFor={id}
      className={`flex min-w-0 flex-1 items-center gap-2.5 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="relative inline-flex h-5 w-9 shrink-0 align-middle">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-labelledby={labelId}
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          data-testid={testId}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-disabled:bg-slate-100 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4 peer-disabled:bg-slate-100"
        />
      </span>
      <span
        id={labelId}
        className={`min-w-0 truncate text-sm font-medium ${
          disabled ? "text-slate-400" : "text-slate-700"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

function SectionMoveButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
  testId,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid={testId}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base leading-none text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-slate-300 disabled:shadow-none disabled:hover:bg-transparent"
    >
      <span aria-hidden="true">{direction === "up" ? "↑" : "↓"}</span>
    </button>
  );
}

function SectionControlRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1.5 sm:px-2.5 sm:py-2">
      {children}
    </div>
  );
}

export function MiniSiteEditorCard({ businessId, businessName }: MiniSiteEditorCardProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MiniSiteConfig | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["mini-site-config", businessId],
    queryFn: () => getMiniSiteConfig(businessId),
    enabled: Boolean(businessId),
  });

  useEffect(() => {
    if (configQuery.data) {
      setDraft(normalizeMiniSiteConfig(configQuery.data));
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (config: MiniSiteConfig) => updateMiniSiteConfig(businessId, config),
    onSuccess: async (data) => {
      setDraft(normalizeMiniSiteConfig(data));
      await queryClient.invalidateQueries({ queryKey: ["mini-site-config", businessId] });
    },
  });

  const saving = saveMutation.isPending;
  const canSave = Boolean(draft) && !configQuery.isLoading && !saving;

  async function handleSave() {
    if (!draft) {
      return;
    }
    setSaveSuccess(false);
    setSaveError(null);
    const normalized = normalizeMiniSiteConfig(draft);
    try {
      await saveMutation.mutateAsync(normalized);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(
        getAdminSettingsErrorMessage(error, "Could not save mini-site profile."),
      );
    }
  }

  if (configQuery.isLoading) {
    return (
      <div data-testid="mini-site-editor-loading">
        <LoadingState message="Loading mini-site profile…" />
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <ErrorState
        title="Could not load mini-site profile"
        message={getAdminSettingsErrorMessage(
          configQuery.error,
          "Unable to load mini-site profile.",
        )}
      />
    );
  }

  if (!draft) {
    return (
      <div data-testid="mini-site-editor-loading">
        <LoadingState message="Preparing editor…" />
      </div>
    );
  }

  const reorderableSectionTypes = ["about", "services", "trust", "faq", "contact"] as const;
  type ReorderableSectionType = (typeof reorderableSectionTypes)[number];

  function getSectionOrder(config: MiniSiteConfig, type: ReorderableSectionType): number {
    return config.sections.find((section) => section.type === type)?.order ?? 0;
  }

  function moveSection(type: ReorderableSectionType, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const sorted = [...reorderableSectionTypes].sort(
        (a, b) => getSectionOrder(current, a) - getSectionOrder(current, b),
      );
      const index = sorted.indexOf(type);
      const neighbor = sorted[index + direction];
      if (!neighbor) {
        return current;
      }

      const currentOrder = getSectionOrder(current, type);
      const neighborOrder = getSectionOrder(current, neighbor);

      return {
        ...current,
        sections: current.sections.map((section) => {
          if (section.type === type) return { ...section, order: neighborOrder };
          if (section.type === neighbor) return { ...section, order: currentOrder };
          return section;
        }),
      };
    });
  }

  const sortedReorderableSections = [...reorderableSectionTypes].sort(
    (a, b) => getSectionOrder(draft, a) - getSectionOrder(draft, b),
  );
  const aboutIndex = sortedReorderableSections.indexOf("about");
  const servicesIndex = sortedReorderableSections.indexOf("services");
  const trustIndex = sortedReorderableSections.indexOf("trust");
  const faqIndex = sortedReorderableSections.indexOf("faq");
  const contactIndex = sortedReorderableSections.indexOf("contact");

  const sectionControls: Array<{
    type: ReorderableSectionType;
    label: string;
    toggleId: string;
    toggleTestId: string;
    moveUpTestId: string;
    moveDownTestId: string;
    rowIndex: number;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
  }> = [
    {
      type: "about",
      label: "About",
      toggleId: "mini-site-section-toggle-about",
      toggleTestId: "mini-site-toggle-about",
      moveUpTestId: "mini-site-move-up-about",
      moveDownTestId: "mini-site-move-down-about",
      rowIndex: aboutIndex,
      isEnabled: draft.sections.some((section) => section.type === "about" && section.enabled),
      onToggle: (enabled) => setDraft(updateSectionEnabled(draft, "about", enabled)),
    },
    {
      type: "services",
      label: "Services",
      toggleId: "mini-site-section-toggle-services",
      toggleTestId: "mini-site-toggle-services",
      moveUpTestId: "mini-site-move-up-services",
      moveDownTestId: "mini-site-move-down-services",
      rowIndex: servicesIndex,
      isEnabled: draft.sections.some((section) => section.type === "services" && section.enabled),
      onToggle: (enabled) => setDraft(updateSectionEnabled(draft, "services", enabled)),
    },
    {
      type: "trust",
      label: "Benefits / trust",
      toggleId: "mini-site-section-toggle-benefits-trust",
      toggleTestId: "mini-site-toggle-benefits-trust",
      moveUpTestId: "mini-site-move-up-trust",
      moveDownTestId: "mini-site-move-down-trust",
      rowIndex: trustIndex,
      isEnabled: draft.sections.some((section) => section.type === "trust" && section.enabled),
      onToggle: (enabled) => {
        setDraft({
          ...draft,
          sections: draft.sections.map((section) => {
            if (section.type === "trust") return { ...section, enabled };
            if (section.type === "benefits") {
              return { ...section, enabled: enabled ? section.enabled : false };
            }
            return section;
          }),
        });
      },
    },
    {
      type: "faq",
      label: "FAQ",
      toggleId: "mini-site-section-toggle-faq",
      toggleTestId: "mini-site-toggle-faq",
      moveUpTestId: "mini-site-move-up-faq",
      moveDownTestId: "mini-site-move-down-faq",
      rowIndex: faqIndex,
      isEnabled: draft.sections.some((section) => section.type === "faq" && section.enabled),
      onToggle: (enabled) => setDraft(updateSectionEnabled(draft, "faq", enabled)),
    },
    {
      type: "contact",
      label: "Contact",
      toggleId: "mini-site-section-toggle-contact",
      toggleTestId: "mini-site-toggle-contact",
      moveUpTestId: "mini-site-move-up-contact",
      moveDownTestId: "mini-site-move-down-contact",
      rowIndex: contactIndex,
      isEnabled: draft.sections.some((section) => section.type === "contact" && section.enabled),
      onToggle: (enabled) => setDraft(updateSectionEnabled(draft, "contact", enabled)),
    },
  ];

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden" data-testid="mini-site-editor">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] md:items-start lg:grid-cols-1">
        <div
          className="mini-site-editor-form min-w-0 space-y-3 md:max-h-[calc(100vh-9rem)] md:overflow-y-auto md:pr-1 lg:max-h-none lg:overflow-visible [scrollbar-width:thin]"
          data-testid="mini-site-editor-form"
        >
          <EditorSection title="Appearance" description="Template, colors, and styling">
            <label htmlFor="mini-site-template" className="block text-sm">
              <span className="font-medium text-slate-700">Template</span>
              <select
                id="mini-site-template"
                value={draft.theme.template}
                disabled={saving}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    theme: {
                      ...draft.theme,
                      template: event.target.value as MiniSiteTemplate,
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid="mini-site-template"
              >
                {MINI_SITE_TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template.charAt(0).toUpperCase() + template.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <ColorField
                id="mini-site-primary-color"
                label="Primary color"
                value={draft.theme.primaryColor}
                fallback="#2563eb"
                disabled={saving}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, primaryColor: value },
                  })
                }
              />
              <ColorField
                id="mini-site-accent-color"
                label="Accent color"
                value={draft.theme.accentColor}
                fallback="#7c3aed"
                disabled={saving}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, accentColor: value },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <label htmlFor="mini-site-background-style" className="block text-sm">
                <span className="font-medium text-slate-700">Background style</span>
                <select
                  id="mini-site-background-style"
                  value={draft.theme.backgroundStyle}
                  disabled={saving}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      theme: {
                        ...draft.theme,
                        backgroundStyle: event.target.value as MiniSiteBackgroundStyle,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                  data-testid="mini-site-background-style"
                >
                  {MINI_SITE_BACKGROUND_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="mini-site-button-style" className="block text-sm">
                <span className="font-medium text-slate-700">Button style</span>
                <select
                  id="mini-site-button-style"
                  value={draft.theme.buttonStyle}
                  disabled={saving}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      theme: {
                        ...draft.theme,
                        buttonStyle: event.target.value as MiniSiteButtonStyle,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                  data-testid="mini-site-button-style"
                >
                  {MINI_SITE_BUTTON_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ColorField
              id="mini-site-background-color"
              label="Background color"
              value={draft.theme.backgroundColor}
              fallback={DEFAULT_MINI_SITE_BACKGROUND_COLOR}
              disabled={saving}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  theme: {
                    ...draft.theme,
                    backgroundColor: normalizeHexColorInput(value, draft.theme.backgroundColor),
                  },
                })
              }
            />
          </EditorSection>

          <EditorSection title="Media" description="Template-specific images for the selected mini-site layout">
            <MiniSiteTemplateMediaSection
              businessId={businessId}
              template={draft.theme.template}
              templateMedia={draft.templateMedia}
              disabled={saving}
              onTemplateMediaChange={(templateMedia) => setDraft({ ...draft, templateMedia })}
            />
          </EditorSection>

          <EditorSection title="Labels & CTAs" description="Marketing labels shown on the public mini-site">
            <div>
              <FieldLabel htmlFor="mini-site-hero-badge-text">Hero badge</FieldLabel>
              <TextInput
                id="mini-site-hero-badge-text"
                value={draft.copy.heroBadgeText}
                disabled={saving}
                onChange={(value) => setDraft(updateCopyField(draft, "heroBadgeText", value))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                  <p className="text-xs font-semibold text-slate-500">Trust {index + 1}</p>
                  <TextInput
                    id={`mini-site-trust-card-${index}-title`}
                    value={draft.copy.trustCards[index].title}
                    disabled={saving}
                    placeholder="Title"
                    onChange={(value) => setDraft(updateTrustCard(draft, index, "title", value))}
                  />
                  <TextInput
                    id={`mini-site-trust-card-${index}-subtitle`}
                    value={draft.copy.trustCards[index].subtitle}
                    disabled={saving}
                    placeholder="Subtitle"
                    onChange={(value) => setDraft(updateTrustCard(draft, index, "subtitle", value))}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-benefits-section-title">Benefits title</FieldLabel>
                <TextInput
                  id="mini-site-benefits-section-title"
                  value={draft.copy.benefitsSectionTitle}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(draft, "benefitsSectionTitle", value))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-contact-section-title">Contact title</FieldLabel>
                <TextInput
                  id="mini-site-contact-section-title"
                  value={draft.copy.contactSectionTitle}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(draft, "contactSectionTitle", value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([0, 1, 2] as const).map((index) => (
                <div key={index}>
                  <FieldLabel htmlFor={`mini-site-benefit-item-${index}`}>{`Benefit ${index + 1}`}</FieldLabel>
                  <TextInput
                    id={`mini-site-benefit-item-${index}`}
                    value={draft.copy.benefitsItems[index]}
                    disabled={saving}
                    onChange={(value) => setDraft(updateBenefitItem(draft, index, value))}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-services-section-title">Services title</FieldLabel>
                <TextInput
                  id="mini-site-services-section-title"
                  value={draft.copy.servicesSectionTitle}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(draft, "servicesSectionTitle", value))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-services-section-badge">Services badge</FieldLabel>
                <TextInput
                  id="mini-site-services-section-badge"
                  value={draft.copy.servicesSectionBadgeText}
                  disabled={saving}
                  placeholder="{count} available"
                  onChange={(value) => setDraft(updateCopyField(draft, "servicesSectionBadgeText", value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-primary-cta-label">Primary CTA</FieldLabel>
                <TextInput
                  id="mini-site-primary-cta-label"
                  value={draft.copy.primaryCtaLabel}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(draft, "primaryCtaLabel", value))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-secondary-cta-label">Secondary CTA</FieldLabel>
                <TextInput
                  id="mini-site-secondary-cta-label"
                  value={draft.copy.secondaryCtaLabel}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(draft, "secondaryCtaLabel", value))}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection title="Sections" description="Choose what appears on your Pro mini-site">
            <div className="space-y-1.5">
              {sectionControls.map((section) => (
                <SectionControlRow key={section.type}>
                  <SectionVisibilitySwitch
                    id={section.toggleId}
                    label={section.label}
                    checked={section.isEnabled}
                    disabled={saving}
                    onChange={section.onToggle}
                    testId={section.toggleTestId}
                  />
                  <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`${section.label} order`}>
                    <SectionMoveButton
                      direction="up"
                      disabled={section.rowIndex === 0 || saving}
                      onClick={() => moveSection(section.type, -1)}
                      ariaLabel={`Move ${section.label} up`}
                      testId={section.moveUpTestId}
                    />
                    <SectionMoveButton
                      direction="down"
                      disabled={section.rowIndex === sortedReorderableSections.length - 1 || saving}
                      onClick={() => moveSection(section.type, 1)}
                      ariaLabel={`Move ${section.label} down`}
                      testId={section.moveDownTestId}
                    />
                  </div>
                </SectionControlRow>
              ))}
            </div>
          </EditorSection>

          <EditorSection title="Page content" description="Hero and about section copy">
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-hero-title">Hero title</FieldLabel>
                <TextInput
                  id="mini-site-hero-title"
                  value={getSectionField(draft, "hero", "title")}
                  disabled={saving}
                  onChange={(value) =>
                    setDraft(updateSectionField(draft, "hero", "title", value))
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-hero-subtitle">Hero subtitle</FieldLabel>
                <TextInput
                  id="mini-site-hero-subtitle"
                  value={getSectionField(draft, "hero", "subtitle")}
                  disabled={saving}
                  onChange={(value) =>
                    setDraft(updateSectionField(draft, "hero", "subtitle", value))
                  }
                />
              </div>
            </div>
            <label htmlFor="mini-site-hero-body" className="block text-sm">
              <span className="font-medium text-slate-700">Hero body</span>
              <textarea
                id="mini-site-hero-body"
                rows={2}
                value={getSectionField(draft, "hero", "body")}
                disabled={saving}
                onChange={(event) =>
                  setDraft(updateSectionField(draft, "hero", "body", event.target.value))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid="mini-site-hero-body"
              />
            </label>
            <div>
              <FieldLabel htmlFor="mini-site-about-title">About title</FieldLabel>
              <TextInput
                id="mini-site-about-title"
                value={getSectionField(draft, "about", "title")}
                disabled={saving}
                onChange={(value) =>
                  setDraft(updateSectionField(draft, "about", "title", value))
                }
              />
            </div>
            <label htmlFor="mini-site-about-body" className="block text-sm">
              <span className="font-medium text-slate-700">About body</span>
              <textarea
                id="mini-site-about-body"
                rows={2}
                value={getSectionField(draft, "about", "body")}
                disabled={saving}
                onChange={(event) =>
                  setDraft(updateSectionField(draft, "about", "body", event.target.value))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid="mini-site-about-body"
              />
            </label>
          </EditorSection>

          <EditorSection
            title="FAQ content"
            description="Questions and answers for the FAQ section. Empty rows are hidden on the live page."
          >
            <div>
              <FieldLabel htmlFor="mini-site-faq-section-title">FAQ section title</FieldLabel>
              <TextInput
                id="mini-site-faq-section-title"
                value={draft.copy.faqSectionTitle}
                disabled={saving}
                onChange={(value) => setDraft(updateCopyField(draft, "faqSectionTitle", value))}
              />
            </div>
            <div className="space-y-2">
              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                  <p className="text-xs font-semibold text-slate-500">FAQ {index + 1}</p>
                  <TextInput
                    id={`mini-site-faq-item-${index}-question`}
                    value={draft.copy.faqItems[index].question}
                    disabled={saving}
                    placeholder="Question"
                    onChange={(value) => setDraft(updateFaqItem(draft, index, "question", value))}
                  />
                  <label htmlFor={`mini-site-faq-item-${index}-answer`} className="block text-sm">
                    <span className="sr-only">FAQ {index + 1} answer</span>
                    <textarea
                      id={`mini-site-faq-item-${index}-answer`}
                      rows={2}
                      value={draft.copy.faqItems[index].answer}
                      disabled={saving}
                      placeholder="Answer"
                      onChange={(event) =>
                        setDraft(updateFaqItem(draft, index, "answer", event.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                      data-testid={`mini-site-faq-item-${index}-answer`}
                    />
                  </label>
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection title="Social links" description="Links shown on your public mini-site contact section">
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-website">Website</FieldLabel>
                <TextInput
                  id="mini-site-website"
                  value={draft.socialLinks.website ?? ""}
                  disabled={saving}
                  placeholder="https://example.com"
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      socialLinks: { ...draft.socialLinks, website: value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-instagram">Instagram</FieldLabel>
                <TextInput
                  id="mini-site-instagram"
                  value={draft.socialLinks.instagram ?? ""}
                  disabled={saving}
                  placeholder="https://instagram.com/your-handle"
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      socialLinks: { ...draft.socialLinks, instagram: value || undefined },
                    })
                  }
                />
              </div>
            </div>
          </EditorSection>
        </div>

        <aside
          className="min-w-0 md:sticky md:top-4 md:self-start lg:static"
          data-testid="mini-site-editor-preview-panel"
        >
          <div className="flex min-h-[360px] flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 p-3 shadow-sm sm:p-4 md:min-h-[420px] lg:min-h-[480px]">
            <MiniSiteLivePreview config={draft} businessName={businessName} />
          </div>
        </aside>
      </div>

      {saveSuccess ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          data-testid="mini-site-editor-save-success"
        >
          Mini-site profile saved.
        </p>
      ) : null}

      {saveError ? (
        <div data-testid="mini-site-editor-save-error">
          <ErrorState title="Could not save mini-site profile" message={saveError} />
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="public-profile-save-button"
      >
        {saving ? "Saving…" : "Save mini-site profile"}
      </button>
    </div>
  );
}
