import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBusiness, updatePublicPageVariant } from "@/api/adminApi";
import { getMiniSiteConfig } from "@/api/miniSiteApi";
import { MiniSiteStatusStrip } from "@/components/admin/miniSiteBuilder/MiniSiteStatusStrip";
import { MiniSiteTemplateLibrary } from "@/components/admin/miniSiteBuilder/MiniSiteTemplateLibrary";
import { MiniSiteUpgradeBanner } from "@/components/admin/miniSiteBuilder/MiniSiteUpgradeBanner";
import { TemplateSpecificBuilderPanel } from "@/components/admin/miniSiteBuilder/TemplateSpecificBuilderPanel";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import {
  MINI_SITE_DEFAULT_SELECTION,
  canSelectLibraryOption,
  canUseMiniSite,
  canUseTemplate,
  getAllowedMiniSiteTemplates,
  getMiniSitePlanLabel,
  isProPlan,
  librarySelectionFromVariant,
  type MiniSiteLibrarySelection,
} from "@/lib/miniSitePlanAccess";
import type { MiniSiteTemplate } from "@/types/miniSite";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

export function AdminMiniSitePage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [currentTemplate, setCurrentTemplate] = useState<MiniSiteTemplate | null>(null);
  const [requestedTemplate, setRequestedTemplate] = useState<MiniSiteTemplate | null>(null);
  const [selection, setSelection] = useState<MiniSiteLibrarySelection | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled: Boolean(businessId),
  });

  const configQuery = useQuery({
    queryKey: ["mini-site-config", businessId],
    queryFn: () => getMiniSiteConfig(businessId!),
    enabled: Boolean(businessId),
  });

  const plan = businessQuery.data?.subscription?.plan;
  const editorUnlocked = canUseMiniSite(plan);
  const allowedTemplates = getAllowedMiniSiteTemplates(plan);
  const storedTemplate = configQuery.data?.theme.template;
  const lockedTemplateWarning =
    selection !== MINI_SITE_DEFAULT_SELECTION &&
    storedTemplate &&
    !canUseTemplate(plan, storedTemplate)
      ? storedTemplate
      : null;

  useEffect(() => {
    if (!businessQuery.data) {
      return;
    }
    const next = librarySelectionFromVariant(
      businessQuery.data.public_page_variant,
      configQuery.data?.theme.template ?? currentTemplate,
      plan,
    );
    setSelection((current) => current ?? next);
  }, [businessQuery.data, configQuery.data?.theme.template, currentTemplate, plan]);

  const variantMutation = useMutation({
    mutationFn: (variant: "standard" | "mini_site") =>
      updatePublicPageVariant(businessId!, variant),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["mini-site-config", businessId] });
      setSelection(
        librarySelectionFromVariant(
          data.public_page_variant,
          currentTemplate ?? storedTemplate,
          plan,
        ),
      );
      setSaveStatus("saved");
    },
    onError: () => {
      setSaveStatus("error");
    },
  });

  const handleTemplateChange = useCallback((template: MiniSiteTemplate) => {
    setCurrentTemplate(template);
  }, []);

  const handleSelect = useCallback(
    (next: MiniSiteLibrarySelection) => {
      if (!canSelectLibraryOption(plan, next)) {
        return;
      }
      setSaveStatus("idle");
      setSelection(next);
      if (next === MINI_SITE_DEFAULT_SELECTION) {
        return;
      }
      setRequestedTemplate(next);
      setCurrentTemplate(next);
    },
    [plan],
  );

  async function handleSaveDefault() {
    setSaveStatus("idle");
    try {
      await variantMutation.mutateAsync("standard");
    } catch {
      // status handled in mutation
    }
  }

  function openPublicPage() {
    const slug = businessQuery.data?.slug;
    if (!slug) {
      return;
    }
    window.open(`/b/${slug}`, "_blank", "noopener,noreferrer");
  }

  async function handleShare() {
    const slug = businessQuery.data?.slug;
    if (!slug || typeof window === "undefined") {
      return;
    }
    const url = `${window.location.origin}/b/${slug}`;
    const title = businessQuery.data?.name?.trim() || "Public business page";
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Book services or send requests here.",
          url,
        });
        setShareFeedback("Share opened");
        return;
      } catch {
        // fall through to copy
      }
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Link copied");
        return;
      } catch {
        setShareFeedback("Share unavailable");
      }
    } else {
      setShareFeedback("Share unavailable");
    }
  }

  if (!businessId) {
    return <LoadingState message="Loading business…" />;
  }

  if (businessQuery.isLoading) {
    return <LoadingState message="Loading Mini-site Builder…" />;
  }

  if (businessQuery.isError || !businessQuery.data) {
    return (
      <ErrorState
        title="Could not load Mini-site Builder"
        message={getAdminSettingsErrorMessage(
          businessQuery.error,
          "Unable to load business profile.",
        )}
      />
    );
  }

  const business = businessQuery.data;
  const planLabel = getMiniSitePlanLabel(plan).toUpperCase();
  const activeSelection =
    selection ??
    librarySelectionFromVariant(
      business.public_page_variant,
      storedTemplate ?? currentTemplate,
      plan,
    );
  const showingDefault = activeSelection === MINI_SITE_DEFAULT_SELECTION;
  const showingMiniSiteEditor =
    !showingDefault && editorUnlocked && canUseTemplate(plan, activeSelection as MiniSiteTemplate);
  const showingBuilder = showingDefault || showingMiniSiteEditor;

  return (
    <section className="space-y-5" data-testid="admin-mini-site-page">
      <header
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        data-testid="admin-mini-site-header"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Mini-site Builder</h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                isProPlan(plan)
                  ? "border-violet-200 bg-violet-50 text-violet-800"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
              data-testid="admin-mini-site-plan-badge"
            >
              {planLabel}
            </span>
          </div>
          <p className="max-w-2xl text-sm text-gray-500">
            Choose the Default business profile or a mini-site template. Each template opens its own
            builder sections, helpers, and preview framing.
          </p>
        </div>
      </header>

      <MiniSiteStatusStrip
        plan={plan}
        pageVariant={showingDefault ? "standard" : "mini_site"}
        businessSlug={business.slug}
        businessName={business.name}
        saveStatus={saveStatus}
        onPreview={openPublicPage}
        onShare={() => void handleShare()}
      />
      {shareFeedback ? (
        <p className="text-xs text-slate-500" role="status">
          {shareFeedback}
        </p>
      ) : null}

      <MiniSiteUpgradeBanner plan={plan} />

      {lockedTemplateWarning ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="admin-mini-site-locked-template-warning"
          role="status"
        >
          Your saved template ({lockedTemplateWarning}) is not available on your current plan.
          {canUseTemplate(plan, "clean")
            ? " Switch to Clean to keep editing, or upgrade to Pro to unlock all templates."
            : " Use Default business profile, or upgrade to Pro to unlock Mini-site templates."}
        </div>
      ) : null}

      <div
        className="space-y-4"
        data-testid="admin-mini-site-builder-shell"
        data-editor={showingMiniSiteEditor ? "unlocked" : showingDefault ? "default" : "locked"}
      >
        {showingBuilder ? (
          <div data-testid={showingMiniSiteEditor ? "admin-mini-site-editor-panel" : undefined}>
            <TemplateSpecificBuilderPanel
              builderId={activeSelection}
              businessId={business.id}
              businessName={business.name}
              businessSlug={business.slug}
              allowedTemplates={allowedTemplates}
              requestedTemplate={requestedTemplate}
              saveStatus={saveStatus}
              savingDefault={variantMutation.isPending}
              onSaveDefault={() => void handleSaveDefault()}
              onTemplateChange={handleTemplateChange}
              onSaveStatusChange={setSaveStatus}
            />
          </div>
        ) : (
          <TemplateSpecificBuilderPanel
            builderId={MINI_SITE_DEFAULT_SELECTION}
            businessId={business.id}
            businessName={business.name}
            businessSlug={business.slug}
            saveStatus={saveStatus}
            savingDefault={variantMutation.isPending}
            onSaveDefault={() => void handleSaveDefault()}
          />
        )}
      </div>

      <MiniSiteTemplateLibrary
        plan={plan}
        currentSelection={activeSelection}
        onSelect={handleSelect}
      />
    </section>
  );
}
