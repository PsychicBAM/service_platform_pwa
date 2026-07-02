import type { ReactNode } from "react";

type LegalPlaceholderShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalPlaceholderShell({ title, children }: LegalPlaceholderShellProps) {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="note"
      >
        <p className="font-medium">Draft placeholder — not legal advice.</p>
        <p>Must be reviewed before public launch.</p>
        <p>Do not rely on this as final legal text.</p>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="space-y-4 text-sm leading-relaxed text-slate-700">{children}</div>
    </article>
  );
}
