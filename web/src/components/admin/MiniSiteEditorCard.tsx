import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMiniSiteConfig, updateMiniSiteConfig } from "@/api/miniSiteApi";
import { MiniSiteLivePreview } from "@/components/admin/MiniSiteLivePreview";
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

function DisabledMediaField({
  id,
  label,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="text"
        disabled
        readOnly
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 disabled:cursor-not-allowed"
        data-testid={id}
      />
      <p className="mt-1 text-xs text-slate-500" data-testid={`${id}-hint`}>
        {hint}
      </p>
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

  return (
    <div className="space-y-4" data-testid="mini-site-editor">
      <div className="grid gap-5 lg:grid-cols-[minmax(380px,460px)_minmax(320px,1fr)] xl:gap-8 lg:items-start">
        <div
          className="mini-site-editor-form space-y-3 min-w-0 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]"
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
                    {template}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid gap-2 sm:grid-cols-3">
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
            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid gap-3 sm:grid-cols-2">
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

          <EditorSection title="Page content" description="Hero and about section copy">
            <div className="grid gap-3 sm:grid-cols-2">
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

          <EditorSection title="Social & media">
            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <DisabledMediaField
                id="mini-site-logo-upload"
                label="Logo"
                placeholder="Coming soon"
                hint="Logo upload coming soon."
              />
              <DisabledMediaField
                id="mini-site-cover-upload"
                label="Cover image"
                placeholder="Coming soon"
                hint="Cover upload coming soon."
              />
            </div>
            <p className="text-xs text-slate-500" data-testid="public-profile-media-placeholder">
              Gallery and media uploads are coming soon.
            </p>
          </EditorSection>
        </div>

        <aside
          className="min-w-0 lg:sticky lg:top-4 lg:self-start"
          data-testid="mini-site-editor-preview-panel"
        >
          <div className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 p-3 shadow-sm sm:p-4 lg:min-h-[calc(100vh-9rem)]">
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
