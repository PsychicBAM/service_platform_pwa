import type { TemplateBuilderSection } from "@/lib/miniSiteTemplateBuilders";
import type { ServiceSectionId } from "@/types/serviceTemplate";
import { SERVICE_SECTION_IDS } from "@/types/serviceTemplate";

type TemplateSectionNavProps = {
  sections: TemplateBuilderSection[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
  templateLabel: string;
  /** When provided, show real visibility switches for Service sections. */
  sectionVisibility?: Partial<Record<string, boolean>>;
  onToggleSectionVisibility?: (sectionId: string, visible: boolean) => void;
};

function isToggleableServiceSection(sectionId: string): sectionId is ServiceSectionId {
  return (SERVICE_SECTION_IDS as readonly string[]).includes(sectionId);
}

function SectionVisibilitySwitch({
  sectionId,
  label,
  visible,
  onToggle,
}: {
  sectionId: string;
  label: string;
  visible: boolean;
  onToggle: (visible: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label={`${label} visible on public page`}
      title={visible ? "Hide section" : "Show section"}
      data-testid={`service-section-visibility-${sectionId}`}
      data-state={visible ? "on" : "off"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(!visible);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        visible ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
          visible ? "translate-x-[1.125rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function TemplateSectionNav({
  sections,
  selectedSectionId,
  onSelectSection,
  templateLabel,
  sectionVisibility,
  onToggleSectionVisibility,
}: TemplateSectionNavProps) {
  const showVisibility = Boolean(sectionVisibility && onToggleSectionVisibility);

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
          const toggleable = showVisibility && isToggleableServiceSection(section.id);
          const visible = toggleable
            ? sectionVisibility?.[section.id] !== false
            : true;

          return (
            <li key={section.id}>
              <div
                className={`flex items-center gap-1.5 rounded-lg transition ${
                  selected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                } ${toggleable && !visible ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  className="min-w-0 flex-1 px-2.5 py-2 text-left"
                  data-testid="admin-mini-site-builder-section"
                  data-section={section.id}
                  data-mode={section.mode}
                  data-selected={selected ? "true" : "false"}
                  data-visible={visible ? "true" : "false"}
                >
                  <span className="block text-sm font-medium leading-tight">{section.label}</span>
                  <span className="mt-0.5 block line-clamp-1 text-[11px] text-slate-500">
                    {toggleable && !visible ? "Hidden on public page" : section.helperText}
                  </span>
                </button>
                {toggleable ? (
                  <div className="flex shrink-0 items-center pr-2">
                    <SectionVisibilitySwitch
                      sectionId={section.id}
                      label={section.label}
                      visible={visible}
                      onToggle={(next) => onToggleSectionVisibility?.(section.id, next)}
                    />
                  </div>
                ) : null}
                {section.mode === "coming_soon" ? (
                  <span className="mr-2 shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Soon
                  </span>
                ) : null}
                {section.mode === "managed_elsewhere" ? (
                  <span className="mr-2 shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    Elsewhere
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
