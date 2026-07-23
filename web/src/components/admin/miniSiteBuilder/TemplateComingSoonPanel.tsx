type TemplateComingSoonPanelProps = {
  title: string;
  body: string;
  templateLabel: string;
  sectionLabel: string;
};

export function TemplateComingSoonPanel({
  title,
  body,
  templateLabel,
  sectionLabel,
}: TemplateComingSoonPanelProps) {
  return (
    <div
      className="flex min-h-[280px] flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-6 sm:p-8"
      data-testid="admin-mini-site-coming-soon-panel"
      data-section={sectionLabel}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {templateLabel} · {sectionLabel}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{body}</p>
      <p className="mt-4 text-xs text-slate-500">
        No temporary or fake controls are shown for unsupported sections.
      </p>
    </div>
  );
}
