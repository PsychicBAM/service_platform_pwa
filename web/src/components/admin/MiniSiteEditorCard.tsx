import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMiniSiteConfig, updateMiniSiteConfig } from "@/api/miniSiteApi";
import { MiniSiteLivePreview } from "@/components/admin/MiniSiteLivePreview";
import { MiniSiteTemplateMediaSection } from "@/components/admin/MiniSiteTemplateMediaSection";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import {
  DEFAULT_MINI_SITE_BACKGROUND_COLOR,
  DEFAULT_MINI_SITE_CONFIG,
  normalizeMiniSiteConfig,
} from "@/lib/miniSiteConfig";
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

const REORDERABLE_SECTION_TYPES = ["about", "services", "trust", "faq", "contact"] as const;
type ReorderableSectionType = (typeof REORDERABLE_SECTION_TYPES)[number];

const SECTION_METADATA: Record<
  ReorderableSectionType,
  {
    title: string;
    description: string;
    icon: string;
    toggleId: string;
    toggleTestId: string;
    moveUpTestId: string;
    moveDownTestId: string;
  }
> = {
  about: {
    title: "About",
    description: "Introduce your business and what makes it special.",
    icon: "◉",
    toggleId: "mini-site-section-toggle-about",
    toggleTestId: "mini-site-toggle-about",
    moveUpTestId: "mini-site-move-up-about",
    moveDownTestId: "mini-site-move-down-about",
  },
  services: {
    title: "Services",
    description: "Show the services visitors can book or request.",
    icon: "▦",
    toggleId: "mini-site-section-toggle-services",
    toggleTestId: "mini-site-toggle-services",
    moveUpTestId: "mini-site-move-up-services",
    moveDownTestId: "mini-site-move-down-services",
  },
  trust: {
    title: "Benefits & trust",
    description: "Build confidence with your key differentiators.",
    icon: "★",
    toggleId: "mini-site-section-toggle-benefits-trust",
    toggleTestId: "mini-site-toggle-benefits-trust",
    moveUpTestId: "mini-site-move-up-trust",
    moveDownTestId: "mini-site-move-down-trust",
  },
  faq: {
    title: "FAQ",
    description: "Answer the questions customers ask most.",
    icon: "?",
    toggleId: "mini-site-section-toggle-faq",
    toggleTestId: "mini-site-toggle-faq",
    moveUpTestId: "mini-site-move-up-faq",
    moveDownTestId: "mini-site-move-down-faq",
  },
  contact: {
    title: "Contact",
    description: "Help visitors find the best way to reach you.",
    icon: "⌁",
    toggleId: "mini-site-section-toggle-contact",
    toggleTestId: "mini-site-toggle-contact",
    moveUpTestId: "mini-site-move-up-contact",
    moveDownTestId: "mini-site-move-down-contact",
  },
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
          className="pointer-events-none absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500 peer-disabled:bg-slate-100 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2"
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

function AppearanceSectionCard({
  type,
  title,
  description,
  icon,
  enabled = true,
  alwaysOn = false,
  expanded,
  disabled,
  highlight,
  onToggle,
  onMove,
  canMoveUp,
  canMoveDown,
  onCollapse,
  children,
}: {
  type: string;
  title: string;
  description: string;
  icon: string;
  enabled?: boolean;
  alwaysOn?: boolean;
  expanded: boolean;
  disabled: boolean;
  highlight: boolean;
  onToggle?: (enabled: boolean) => void;
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onCollapse: () => void;
  children: ReactNode;
}) {
  const metadata =
    type === "hero" || type === "social"
      ? undefined
      : SECTION_METADATA[type as ReorderableSectionType];
  const isEnabled = alwaysOn || enabled;

  return (
    <section
      data-testid={`admin-appearance-section-${type}`}
      data-section-card="admin-appearance-section-card"
      className={`rounded-xl border bg-white transition-colors ${
        isEnabled ? "border-slate-200" : "border-slate-200 bg-slate-50/80 opacity-75"
      } ${highlight ? "border-emerald-400 ring-2 ring-emerald-100" : ""}`}
    >
      <div
        className="flex min-w-0 flex-wrap items-center gap-2 p-3 sm:p-4"
        data-testid="admin-appearance-section-header"
        data-section-header={type}
      >
        <span aria-hidden="true" className="cursor-grab text-slate-400">
          ⠿
        </span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600"
        >
          {icon}
        </span>
        <button type="button" onClick={onCollapse} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold text-slate-800">{title}</span>
          <span className="block truncate text-xs text-slate-500">{description}</span>
        </button>
        {!isEnabled ? (
          <span
            className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
            data-testid="admin-appearance-section-disabled"
          >
            Hidden
          </span>
        ) : null}
        {onToggle && !alwaysOn ? (
          <div data-testid="admin-appearance-section-toggle">
            <SectionVisibilitySwitch
              id={metadata?.toggleId ?? `mini-site-section-toggle-${type}`}
              label="Enabled"
              checked={isEnabled}
              disabled={disabled}
              onChange={onToggle}
              testId={metadata?.toggleTestId ?? `mini-site-toggle-${type}`}
            />
          </div>
        ) : null}
        {onMove && isEnabled ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <div data-testid="admin-appearance-section-move-up">
              <SectionMoveButton
                direction="up"
                disabled={disabled || !canMoveUp}
                onClick={() => onMove(-1)}
                ariaLabel={`Move ${title} up`}
                testId={metadata!.moveUpTestId}
              />
            </div>
            <div data-testid="admin-appearance-section-move-down">
              <SectionMoveButton
                direction="down"
                disabled={disabled || !canMoveDown}
                onClick={() => onMove(1)}
                ariaLabel={`Move ${title} down`}
                testId={metadata!.moveDownTestId}
              />
            </div>
          </div>
        ) : null}
        <button type="button" onClick={onCollapse} aria-label={`Toggle ${title} settings`} data-testid="admin-appearance-section-collapse" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
          <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
        </button>
      </div>
      {expanded ? <div className="border-t border-slate-100 p-3 sm:p-4">{children}</div> : null}
    </section>
  );
}

type MiniSiteEditorCardProps = {
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  /** When set, only these templates are selectable in the editor. */
  allowedTemplates?: MiniSiteTemplate[];
  /** Disable editing controls (Free/Starter locked shell). */
  readOnly?: boolean;
  /** Notify parent when save status changes (builder status strip). */
  onSaveStatusChange?: (status: "idle" | "saved" | "error") => void;
  /** Notify parent of the active draft template. */
  onTemplateChange?: (template: MiniSiteTemplate) => void;
  /** Imperative template selection from the template library. */
  requestedTemplate?: MiniSiteTemplate | null;
  /**
   * full — Settings → Appearance and legacy embeds (all sections).
   * section — Mini-site Builder single-section mode (only activeSectionId).
   */
  mode?: "full" | "section";
  /** Template-builder focus target from the section nav. */
  focusSection?:
    | "settings"
    | "media"
    | "hero"
    | "about"
    | "services"
    | "trust"
    | "faq"
    | "contact"
    | "social"
    | null;
  /** Preferred alias for section mode; falls back to focusSection. */
  activeSectionId?:
    | "settings"
    | "media"
    | "hero"
    | "about"
    | "services"
    | "trust"
    | "faq"
    | "contact"
    | "social"
    | null;
  /** Optional preview framing label from the template builder registry. */
  previewBadge?: string;
  /** Optional tone line shown above the form for template-specific builders. */
  builderTone?: string;
};

export function MiniSiteEditorCard({
  businessId,
  businessName,
  businessSlug,
  allowedTemplates,
  readOnly = false,
  onSaveStatusChange,
  onTemplateChange,
  requestedTemplate,
  mode = "full",
  focusSection = null,
  activeSectionId = null,
  previewBadge,
  builderTone,
}: MiniSiteEditorCardProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MiniSiteConfig | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: true, about: true, services: true, trust: true, faq: false, contact: true, social: true,
  });
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["mini-site-config", businessId],
    queryFn: () => getMiniSiteConfig(businessId),
    enabled: Boolean(businessId),
  });

  function applyAllowedTemplate(config: MiniSiteConfig): MiniSiteConfig {
    if (allowedTemplates === undefined) {
      return config;
    }
    if (allowedTemplates.length === 0) {
      return config;
    }
    const current = config.theme.template;
    if (allowedTemplates.includes(current)) {
      return config;
    }
    return {
      ...config,
      theme: {
        ...config.theme,
        template: allowedTemplates[0],
      },
    };
  }

  useEffect(() => {
    if (configQuery.data) {
      const normalized = normalizeMiniSiteConfig(configQuery.data);
      setDraft(applyAllowedTemplate(normalized));
    }
  }, [configQuery.data, allowedTemplates]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    onTemplateChange?.(draft.theme.template);
  }, [draft?.theme.template, onTemplateChange]);

  useEffect(() => {
    if (!requestedTemplate) {
      return;
    }
    setDraft((current) => {
      if (!current || current.theme.template === requestedTemplate) {
        return current;
      }
      if (allowedTemplates && !allowedTemplates.includes(requestedTemplate)) {
        return current;
      }
      return {
        ...current,
        theme: { ...current.theme, template: requestedTemplate },
      };
    });
  }, [requestedTemplate, allowedTemplates]);

  useEffect(() => {
    const target = activeSectionId ?? focusSection;
    if (!target) {
      return;
    }
    if (target === "settings" || target === "media") {
      setHighlightedSection(target);
      return;
    }
    setExpandedSections((current) => ({ ...current, [target]: true }));
    setHighlightedSection(target);
  }, [focusSection, activeSectionId]);

  const saveMutation = useMutation({
    mutationFn: (config: MiniSiteConfig) => updateMiniSiteConfig(businessId, config),
    onSuccess: async (data) => {
      setDraft(applyAllowedTemplate(normalizeMiniSiteConfig(data)));
      await queryClient.invalidateQueries({ queryKey: ["mini-site-config", businessId] });
      onSaveStatusChange?.("saved");
    },
    onError: () => {
      onSaveStatusChange?.("error");
    },
  });

  const saving = saveMutation.isPending || readOnly;
  const templateAllowed =
    allowedTemplates === undefined
      ? true
      : Boolean(draft && allowedTemplates.includes(draft.theme.template));
  const canSave =
    Boolean(draft) &&
    !configQuery.isLoading &&
    !saveMutation.isPending &&
    !readOnly &&
    templateAllowed;
  const templateOptions =
    allowedTemplates === undefined
      ? [...MINI_SITE_TEMPLATES]
      : allowedTemplates.length > 0
        ? [...allowedTemplates]
        : [];

  async function handleSave() {
    if (!draft || readOnly) {
      return;
    }
    setSaveSuccess(false);
    setSaveError(null);
    onSaveStatusChange?.("idle");
    const normalized = applyAllowedTemplate(normalizeMiniSiteConfig(draft));
    if (allowedTemplates && !allowedTemplates.includes(normalized.theme.template)) {
      setSaveError("This template is not available on your current plan.");
      onSaveStatusChange?.("error");
      return;
    }
    setDraft(normalized);
    try {
      await saveMutation.mutateAsync(normalized);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(
        getAdminSettingsErrorMessage(error, "Could not save mini-site profile."),
      );
      onSaveStatusChange?.("error");
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

  const config = draft;

  function getSectionOrder(current: MiniSiteConfig, type: ReorderableSectionType): number {
    return current.sections.find((section) => section.type === type)?.order ?? 0;
  }

  function moveSectionAmongActive(type: ReorderableSectionType, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const sorted = REORDERABLE_SECTION_TYPES.filter((sectionType) =>
        current.sections.some((section) => section.type === sectionType && section.enabled),
      ).sort(
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
    setHighlightedSection(type);
    window.setTimeout(() => setHighlightedSection((current) => (current === type ? null : current)), 700);
  }

  function setSectionEnabled(type: ReorderableSectionType, enabled: boolean) {
    setDraft((current) => {
      if (!current) return current;
      if (type === "trust") {
        return {
          ...current,
          sections: current.sections.map((section) => {
            if (section.type === "trust") return { ...section, enabled };
            if (section.type === "benefits" && !enabled) return { ...section, enabled: false };
            return section;
          }),
        };
      }
      return updateSectionEnabled(current, type, enabled);
    });
    setExpandedSections((current) => ({ ...current, [type]: enabled }));
  }

  const activeSections = REORDERABLE_SECTION_TYPES.filter((type) =>
    config.sections.some((section) => section.type === type && section.enabled),
  ).sort(
    (a, b) => getSectionOrder(config, a) - getSectionOrder(config, b),
  );
  const disabledSections = REORDERABLE_SECTION_TYPES.filter((type) => !activeSections.includes(type));

  const sectionMode = mode === "section";
  const activeFocus = activeSectionId ?? focusSection;
  const showBrand = !sectionMode || activeFocus === "settings";
  const showMedia = !sectionMode || activeFocus === "settings" || activeFocus === "media";
  const showHero = !sectionMode || activeFocus === "hero";
  const showSocial = !sectionMode || activeFocus === "social";
  const showFullSectionLists = !sectionMode;
  const showFocusedSection = (type: ReorderableSectionType) =>
    sectionMode && activeFocus === type;

  function renderReorderableFields(type: ReorderableSectionType) {
    if (type === "about") {
      return (
        <>
          <div>
            <FieldLabel htmlFor="mini-site-about-title">About title</FieldLabel>
            <TextInput
              id="mini-site-about-title"
              value={getSectionField(config, "about", "title")}
              disabled={saving}
              onChange={(value) => setDraft(updateSectionField(config, "about", "title", value))}
            />
          </div>
          <label htmlFor="mini-site-about-body" className="block text-sm">
            <span className="font-medium text-slate-700">About body</span>
            <textarea
              id="mini-site-about-body"
              rows={3}
              value={getSectionField(config, "about", "body")}
              disabled={saving}
              onChange={(event) =>
                setDraft(updateSectionField(config, "about", "body", event.target.value))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
              data-testid="mini-site-about-body"
            />
          </label>
        </>
      );
    }
    if (type === "services") {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mini-site-services-section-title">Services title</FieldLabel>
              <TextInput
                id="mini-site-services-section-title"
                value={config.copy.servicesSectionTitle}
                disabled={saving}
                onChange={(value) => setDraft(updateCopyField(config, "servicesSectionTitle", value))}
              />
            </div>
            <div>
              <FieldLabel htmlFor="mini-site-services-section-badge">Services badge</FieldLabel>
              <TextInput
                id="mini-site-services-section-badge"
                value={config.copy.servicesSectionBadgeText}
                disabled={saving}
                onChange={(value) =>
                  setDraft(updateCopyField(config, "servicesSectionBadgeText", value))
                }
              />
            </div>
          </div>
          {sectionMode ? (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              data-testid="mini-site-services-managed-note"
            >
              Service cards are pulled from{" "}
              <Link to="/admin/services" className="font-medium text-emerald-700 hover:underline">
                Admin → Services
              </Link>
              . Edit titles here; manage offers there.
            </div>
          ) : null}
        </div>
      );
    }
    if (type === "trust") {
      return (
        <div className="space-y-3">
          {([0, 1, 2] as const).map((index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <TextInput
                id={`mini-site-trust-card-${index}-title`}
                value={config.copy.trustCards[index].title}
                disabled={saving}
                onChange={(value) => setDraft(updateTrustCard(config, index, "title", value))}
              />
              <TextInput
                id={`mini-site-trust-card-${index}-subtitle`}
                value={config.copy.trustCards[index].subtitle}
                disabled={saving}
                onChange={(value) => setDraft(updateTrustCard(config, index, "subtitle", value))}
              />
            </div>
          ))}
          <div>
            <FieldLabel htmlFor="mini-site-benefits-section-title">Benefits title</FieldLabel>
            <TextInput
              id="mini-site-benefits-section-title"
              value={config.copy.benefitsSectionTitle}
              disabled={saving}
              onChange={(value) => setDraft(updateCopyField(config, "benefitsSectionTitle", value))}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([0, 1, 2] as const).map((index) => (
              <TextInput
                key={index}
                id={`mini-site-benefit-item-${index}`}
                value={config.copy.benefitsItems[index]}
                disabled={saving}
                onChange={(value) => setDraft(updateBenefitItem(config, index, value))}
              />
            ))}
          </div>
        </div>
      );
    }
    if (type === "faq") {
      return (
        <div className="space-y-2">
          <TextInput
            id="mini-site-faq-section-title"
            value={config.copy.faqSectionTitle}
            disabled={saving}
            onChange={(value) => setDraft(updateCopyField(config, "faqSectionTitle", value))}
          />
          {([0, 1, 2] as const).map((index) => (
            <div key={index} className="space-y-2">
              <TextInput
                id={`mini-site-faq-item-${index}-question`}
                value={config.copy.faqItems[index].question}
                disabled={saving}
                onChange={(value) => setDraft(updateFaqItem(config, index, "question", value))}
              />
              <textarea
                id={`mini-site-faq-item-${index}-answer`}
                rows={2}
                value={config.copy.faqItems[index].answer}
                disabled={saving}
                onChange={(event) =>
                  setDraft(updateFaqItem(config, index, "answer", event.target.value))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                data-testid={`mini-site-faq-item-${index}-answer`}
              />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div>
        <FieldLabel htmlFor="mini-site-contact-section-title">Contact title</FieldLabel>
        <TextInput
          id="mini-site-contact-section-title"
          value={config.copy.contactSectionTitle}
          disabled={saving}
          onChange={(value) => setDraft(updateCopyField(config, "contactSectionTitle", value))}
        />
      </div>
    );
  }

  return (
    <div
      className="min-w-0 space-y-4 overflow-x-hidden"
      data-testid="mini-site-editor"
      data-mode={mode}
      data-focus={activeFocus ?? undefined}
      data-active-section={activeFocus ?? undefined}
    >
      {builderTone ? (
        <p className="text-xs font-medium text-slate-500" data-testid="mini-site-editor-builder-tone">
          {builderTone}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start" data-testid="admin-appearance-settings-page">
        <div
          className="mini-site-editor-form min-w-0 space-y-4"
          data-testid="admin-appearance-editor-column"
        >
          <div className="space-y-4" data-testid="mini-site-editor-form">
          {showBrand ? (
          <EditorSection title="Brand & style" description="Set the visual direction for your public page">
            <div data-testid="admin-appearance-brand-card" className="space-y-3">
            <label htmlFor="mini-site-template" className="block text-sm">
              <span className="font-medium text-slate-700">Template</span>
              <select
                id="mini-site-template"
                value={config.theme.template}
                disabled={saving || readOnly || templateOptions.length <= 1}
                onChange={(event) => {
                  const next = event.target.value as MiniSiteTemplate;
                  if (allowedTemplates && !allowedTemplates.includes(next)) {
                    return;
                  }
                  setDraft({
                    ...config,
                    theme: {
                      ...config.theme,
                      template: next,
                    },
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid="mini-site-template"
              >
                {templateOptions.map((template) => (
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
                value={config.theme.primaryColor}
                fallback="#2563eb"
                disabled={saving}
                onChange={(value) =>
                  setDraft({
                    ...config,
                    theme: { ...config.theme, primaryColor: value },
                  })
                }
              />
              <ColorField
                id="mini-site-accent-color"
                label="Accent color"
                value={config.theme.accentColor}
                fallback="#7c3aed"
                disabled={saving}
                onChange={(value) =>
                  setDraft({
                    ...config,
                    theme: { ...config.theme, accentColor: value },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <label htmlFor="mini-site-background-style" className="block text-sm">
                <span className="font-medium text-slate-700">Background style</span>
                <select
                  id="mini-site-background-style"
                value={config.theme.backgroundStyle}
                  disabled={saving}
                  onChange={(event) =>
                    setDraft({
                    ...config,
                      theme: {
                      ...config.theme,
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

              <label htmlFor="mini-site-button-style" className="block text-sm" data-testid="admin-appearance-corner-radius">
                <span className="font-medium text-slate-700">Corner radius</span>
                <select
                  id="mini-site-button-style"
                value={config.theme.buttonStyle}
                  disabled={saving}
                  onChange={(event) =>
                    setDraft({
                    ...config,
                      theme: {
                      ...config.theme,
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
                value={config.theme.backgroundColor}
              fallback={DEFAULT_MINI_SITE_BACKGROUND_COLOR}
              disabled={saving}
              onChange={(value) =>
                setDraft({
                  ...config,
                  theme: {
                    ...config.theme,
                    backgroundColor: normalizeHexColorInput(value, config.theme.backgroundColor),
                  },
                })
              }
            />
            <p className="text-xs text-slate-500" data-testid="admin-appearance-font-family">Typography uses the selected template's optimized font pairing.</p>
            </div>
          </EditorSection>
          ) : null}

          {showMedia ? (
          <EditorSection title="Media" description="Template-specific images for the selected mini-site layout">
            <MiniSiteTemplateMediaSection
              businessId={businessId}
              template={config.theme.template}
              templateMedia={config.templateMedia}
              disabled={saving}
              onTemplateMediaChange={(templateMedia) => setDraft({ ...config, templateMedia })}
            />
          </EditorSection>
          ) : null}

          {showHero ? (
          <AppearanceSectionCard type="hero" title="Hero" description="Set the first impression for visitors." icon="✦" alwaysOn expanded={expandedSections.hero} disabled={saving} highlight={false} onCollapse={() => setExpandedSections((current) => ({ ...current, hero: !current.hero }))}>
            <div>
              <FieldLabel htmlFor="mini-site-hero-badge-text">Hero badge</FieldLabel>
              <TextInput
                id="mini-site-hero-badge-text"
                value={config.copy.heroBadgeText}
                disabled={saving}
                onChange={(value) => setDraft(updateCopyField(config, "heroBadgeText", value))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-hero-title">Hero title</FieldLabel>
                <TextInput
                  id="mini-site-hero-title"
                value={getSectionField(config, "hero", "title")}
                  disabled={saving}
                  onChange={(value) =>
                    setDraft(updateSectionField(config, "hero", "title", value))
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-hero-subtitle">Hero subtitle</FieldLabel>
                <TextInput
                  id="mini-site-hero-subtitle"
                value={getSectionField(config, "hero", "subtitle")}
                  disabled={saving}
                  onChange={(value) =>
                    setDraft(updateSectionField(config, "hero", "subtitle", value))
                  }
                />
              </div>
            </div>
            <label htmlFor="mini-site-hero-body" className="block text-sm">
              <span className="font-medium text-slate-700">Hero body</span>
              <textarea
                id="mini-site-hero-body"
                rows={2}
                value={getSectionField(config, "hero", "body")}
                disabled={saving}
                onChange={(event) =>
                  setDraft(updateSectionField(config, "hero", "body", event.target.value))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                data-testid="mini-site-hero-body"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-primary-cta-label">Primary CTA</FieldLabel>
                <TextInput
                  id="mini-site-primary-cta-label"
                  value={config.copy.primaryCtaLabel}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(config, "primaryCtaLabel", value))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-secondary-cta-label">Secondary CTA</FieldLabel>
                <TextInput
                  id="mini-site-secondary-cta-label"
                  value={config.copy.secondaryCtaLabel}
                  disabled={saving}
                  onChange={(value) => setDraft(updateCopyField(config, "secondaryCtaLabel", value))}
                />
              </div>
            </div>
          </AppearanceSectionCard>
          ) : null}

          {showFullSectionLists ? (
          <>
          <div className="space-y-3" data-testid="admin-appearance-section-active-list">
            {activeSections.map((type, index) => {
              const metadata = SECTION_METADATA[type];
              return <AppearanceSectionCard key={type} type={type} title={metadata.title} description={metadata.description} icon={metadata.icon} expanded={expandedSections[type]} enabled disabled={saving} highlight={highlightedSection === type} onToggle={(enabled) => setSectionEnabled(type, enabled)} onMove={(direction) => moveSectionAmongActive(type, direction)} canMoveUp={index > 0} canMoveDown={index < activeSections.length - 1} onCollapse={() => setExpandedSections((current) => ({ ...current, [type]: !current[type] }))}>
                {renderReorderableFields(type)}
              </AppearanceSectionCard>;
            })}
          </div>

          {disabledSections.length > 0 ? (
          <div className="space-y-3" data-testid="admin-appearance-section-disabled-list">
            {disabledSections.map((type) => {
              const metadata = SECTION_METADATA[type];
              return <AppearanceSectionCard key={type} type={type} title={metadata.title} description={metadata.description} icon={metadata.icon} expanded={expandedSections[type]} enabled={false} disabled={saving} highlight={false} onToggle={(enabled) => setSectionEnabled(type, enabled)} onCollapse={() => setExpandedSections((current) => ({ ...current, [type]: !current[type] }))}><p className="text-sm text-slate-500">Enable this section to edit its content and show it in the preview.</p></AppearanceSectionCard>;
            })}
          </div>
          ) : null}
          </>
          ) : null}

          {REORDERABLE_SECTION_TYPES.map((type) => {
            if (!showFocusedSection(type)) {
              return null;
            }
            const metadata = SECTION_METADATA[type];
            const enabled = config.sections.some(
              (section) => section.type === type && section.enabled,
            );
            return (
              <AppearanceSectionCard
                key={`focused-${type}`}
                type={type}
                title={metadata.title}
                description={metadata.description}
                icon={metadata.icon}
                expanded
                enabled={enabled}
                disabled={saving}
                highlight={false}
                onToggle={(nextEnabled) => setSectionEnabled(type, nextEnabled)}
                onCollapse={() => undefined}
              >
                {enabled ? (
                  renderReorderableFields(type)
                ) : (
                  <p className="text-sm text-slate-500">
                    Enable this section to edit its content and show it in the preview.
                  </p>
                )}
              </AppearanceSectionCard>
            );
          })}

          {showSocial ? (
          <AppearanceSectionCard type="social" title="Social" description="Links shown alongside your contact details." icon="↗" expanded={expandedSections.social} disabled={saving} highlight={false} onCollapse={() => setExpandedSections((current) => ({ ...current, social: !current.social }))}>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="mini-site-website">Website</FieldLabel>
                <TextInput
                  id="mini-site-website"
                  value={config.socialLinks.website ?? ""}
                  disabled={saving}
                  placeholder="https://example.com"
                  onChange={(value) =>
                    setDraft({
                    ...config,
                    socialLinks: { ...config.socialLinks, website: value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="mini-site-instagram">Instagram</FieldLabel>
                <TextInput
                  id="mini-site-instagram"
                  value={config.socialLinks.instagram ?? ""}
                  disabled={saving}
                  placeholder="https://instagram.com/your-handle"
                  onChange={(value) =>
                    setDraft({
                    ...config,
                    socialLinks: { ...config.socialLinks, instagram: value || undefined },
                    })
                  }
                />
              </div>
            </div>
          </AppearanceSectionCard>
          ) : null}
          </div>
        </div>

        <aside
          className="min-w-0 lg:sticky lg:top-20 lg:self-start"
          data-testid="admin-appearance-preview-column"
        >
          <div className="flex min-h-[360px] flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 p-3 shadow-sm sm:p-4" data-testid="admin-appearance-live-preview">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">Live preview</p>
                <p
                  className="text-xs text-slate-500"
                  data-testid="mini-site-editor-preview-badge"
                >
                  {previewBadge ?? "Your mini-site on mobile"}
                </p>
              </div>
              {businessSlug ? (
                <a
                  href={`/b/${businessSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  data-testid="admin-appearance-open-preview"
                >
                  Open in new tab
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </div>
            <div data-testid="mini-site-editor-preview-panel" className="min-h-0 flex-1">
              <MiniSiteLivePreview config={config} businessName={businessName} />
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-400">
              Preview may not reflect all spacing and typography on the final site.
            </p>
          </div>
        </aside>
      </div>

      {saveSuccess ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          data-testid="mini-site-editor-save-success"
        >
          <span data-testid="admin-appearance-success">Changes saved.</span>
        </p>
      ) : null}

      {saveError ? (
        <div data-testid="mini-site-editor-save-error">
          <ErrorState title="Could not save mini-site profile" message={saveError} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => setDraft(normalizeMiniSiteConfig(DEFAULT_MINI_SITE_CONFIG))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60" data-testid="admin-appearance-reset">Reset to defaults</button>
        <button type="button" disabled={!canSave} onClick={handleSave} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60" data-testid="public-profile-save-button">
          <span data-testid="admin-appearance-save">{saving ? "Saving…" : "Save changes"}</span>
        </button>
      </div>
    </div>
  );
}
