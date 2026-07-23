import type { TemplateBuilderSection } from "@/lib/miniSiteTemplateBuilders";

type TemplateSectionNavProps = {
  sections: TemplateBuilderSection[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
  templateLabel: string;
};

export function TemplateSectionNav({
  sections,
  selectedSectionId,
  onSelectSection,
  templateLabel,
}: TemplateSectionNavProps) {
  return (
    <nav
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3"
      data-testid="admin-mini-site-template-section-nav"
      aria-label={`${templateLabel} sections`}
    >
      <p
        className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
        data-testid="admin-mini-site-section-nav"
      >
        {templateLabel} sections
      </p>
      <ul className="space-y-1 overflow-y-auto">
        {sections.map((section) => {
          const selected = section.id === selectedSectionId;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                  selected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
                data-testid="admin-mini-site-builder-section"
                data-section={section.id}
                data-mode={section.mode}
                data-selected={selected ? "true" : "false"}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[11px] text-slate-500">
                    {section.helperText}
                  </span>
                </span>
                {section.mode === "coming_soon" ? (
                  <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Soon
                  </span>
                ) : null}
                {section.mode === "managed_elsewhere" ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    Elsewhere
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
