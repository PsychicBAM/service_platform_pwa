import { Link } from "react-router-dom";
import { getAllMiniSiteTemplateEditorDefinitions } from "@/lib/miniSiteTemplateEditorRegistry";
import {
  MINI_SITE_DEFAULT_SELECTION,
  MINI_SITE_UPGRADE_HREF,
  canSelectLibraryOption,
  canUseTemplate,
  getMiniSitePlanId,
  type MiniSiteLibrarySelection,
} from "@/lib/miniSitePlanAccess";
import type { MiniSiteTemplate } from "@/types/miniSite";

type MiniSiteTemplateLibraryProps = {
  plan?: string | null;
  currentSelection?: MiniSiteLibrarySelection | null;
  onSelect?: (selection: MiniSiteLibrarySelection) => void;
};

const DEFAULT_CARD = {
  id: MINI_SITE_DEFAULT_SELECTION,
  label: "Default business profile",
  description: "The original public page layout for bookings, requests, reviews, and location.",
} as const;

export function MiniSiteTemplateLibrary({
  plan,
  currentSelection = null,
  onSelect,
}: MiniSiteTemplateLibraryProps) {
  const definitions = getAllMiniSiteTemplateEditorDefinitions();
  const tier = getMiniSitePlanId(plan);

  return (
    <section
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="admin-mini-site-template-library"
      data-plan={tier}
    >
      <div>
        <h3 className="text-base font-semibold text-slate-900">Template library</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose your public page layout. Default business profile is available on every plan.
          Mini-site templates may require Business or Pro.
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <LibraryCard
          selection={DEFAULT_CARD.id}
          label={DEFAULT_CARD.label}
          description={DEFAULT_CARD.description}
          locked={!canSelectLibraryOption(plan, DEFAULT_CARD.id)}
          isCurrent={currentSelection === DEFAULT_CARD.id}
          testId="admin-mini-site-template-default"
          onSelect={onSelect}
        />
        {definitions.map((definition) => {
          const locked = !canUseTemplate(plan, definition.template);
          const isCurrent = currentSelection === definition.template;
          return (
            <LibraryCard
              key={definition.template}
              selection={definition.template}
              label={definition.label}
              description={definition.description}
              locked={locked}
              isCurrent={isCurrent}
              testId={
                definition.template === "clean" ? "admin-mini-site-template-clean" : undefined
              }
              anchorId={
                definition.template === "clean"
                  ? "admin-mini-site-template-clean-anchor"
                  : undefined
              }
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </section>
  );
}

type LibraryCardProps = {
  selection: MiniSiteLibrarySelection;
  label: string;
  description: string;
  locked: boolean;
  isCurrent: boolean;
  testId?: string;
  anchorId?: string;
  onSelect?: (selection: MiniSiteLibrarySelection) => void;
};

function LibraryCard({
  selection,
  label,
  description,
  locked,
  isCurrent,
  testId,
  anchorId,
  onSelect,
}: LibraryCardProps) {
  return (
    <div
      id={anchorId}
      className={`relative w-40 shrink-0 overflow-hidden rounded-xl border ${
        isCurrent ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
      } ${locked ? "bg-slate-50" : "bg-white"}`}
      data-testid="admin-mini-site-template-card"
      data-template={selection}
      data-locked={locked ? "true" : "false"}
    >
      {testId ? (
        <span className="sr-only" data-testid={testId}>
          {label}
        </span>
      ) : null}
      <div
        className={`flex h-24 items-end bg-gradient-to-br p-3 ${
          locked
            ? "from-slate-200 to-slate-300"
            : selection === MINI_SITE_DEFAULT_SELECTION
              ? "from-slate-100 via-white to-emerald-50"
              : "from-violet-100 via-white to-emerald-50"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
          {isCurrent ? (
            <span
              className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
              data-testid="admin-mini-site-template-current"
            >
              Current
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[11px] text-slate-500">{description}</p>
        {locked ? (
          <Link
            to={MINI_SITE_UPGRADE_HREF}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            data-testid="admin-mini-site-template-locked"
            onClick={(event) => event.stopPropagation()}
          >
            <span aria-hidden="true">🔒</span>
            Upgrade to Pro
          </Link>
        ) : (
          <button
            type="button"
            disabled={isCurrent}
            onClick={() => onSelect?.(selection)}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:bg-emerald-50 disabled:text-emerald-800"
            data-testid={
              selection === MINI_SITE_DEFAULT_SELECTION
                ? "admin-mini-site-select-default"
                : undefined
            }
          >
            {isCurrent ? "Selected" : selection === MINI_SITE_DEFAULT_SELECTION ? "Use default" : "Use template"}
          </button>
        )}
      </div>
      {locked ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-end bg-slate-900/10 p-2"
          aria-hidden="true"
        >
          <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 shadow-sm">
            Locked
          </span>
        </div>
      ) : null}
    </div>
  );
}

// Keep MiniSiteTemplate import used for typing in selection union consumers.
export type { MiniSiteTemplate };
