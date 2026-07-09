import { getMiniSiteTemplateEditorDefinition } from "@/lib/miniSiteTemplateEditorRegistry";
import type { MiniSiteTemplate } from "@/types/miniSite";

type MiniSiteTemplateBlocksPanelProps = {
  template: MiniSiteTemplate;
};

export function MiniSiteTemplateBlocksPanel({ template }: MiniSiteTemplateBlocksPanelProps) {
  const definition = getMiniSiteTemplateEditorDefinition(template);

  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
      data-testid="mini-site-template-blocks-panel"
    >
      <div className="space-y-1">
        <h4
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          data-testid="mini-site-template-blocks-heading"
        >
          Template blocks
        </h4>
        <p className="text-xs text-slate-500">
          Only blocks for the selected template are shown here. Media and video slots are prepared for future editing.
        </p>
        <p className="text-xs font-medium text-slate-700" data-testid="mini-site-template-blocks-scope">
          Only blocks for {definition.label} are shown.
        </p>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-600">Blocks</p>
        <ul className="mt-2 space-y-2" data-testid="mini-site-template-blocks-list">
          {definition.blocks.map((block) => (
            <li
              key={block.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              data-testid={`mini-site-template-block-${block.id}`}
            >
              <p className="text-sm font-medium text-slate-800">{block.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{block.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {definition.futureMediaSlots.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600">Media slots coming soon</p>
          <ul className="mt-2 space-y-2" data-testid="mini-site-template-media-slots-list">
            {definition.futureMediaSlots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2"
                data-testid={`mini-site-template-media-slot-${slot.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{slot.label}</p>
                  <p className="text-xs capitalize text-slate-500">{slot.type}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Coming soon
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
