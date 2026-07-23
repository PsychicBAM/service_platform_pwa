import { Link } from "react-router-dom";

type TemplateManagedElsewherePanelProps = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  templateLabel: string;
  sectionLabel: string;
};

export function TemplateManagedElsewherePanel({
  title,
  body,
  href,
  linkLabel,
  templateLabel,
  sectionLabel,
}: TemplateManagedElsewherePanelProps) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-5"
      data-testid="admin-mini-site-managed-elsewhere"
      data-section={sectionLabel}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {templateLabel} · {sectionLabel}
      </p>
      <h4 className="mt-2 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      <Link
        to={href}
        className="mt-4 inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        data-testid="admin-mini-site-managed-elsewhere-link"
      >
        {linkLabel}
        <span aria-hidden="true" className="ml-1">
          →
        </span>
      </Link>
    </div>
  );
}
