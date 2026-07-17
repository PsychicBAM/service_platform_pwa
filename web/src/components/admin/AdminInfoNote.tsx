import type { ReactNode } from "react";

type AdminInfoNoteProps = {
  children: ReactNode;
  className?: string;
};

export function AdminInfoNote({ children, className = "" }: AdminInfoNoteProps) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-blue-100 border-l-4 border-l-blue-500 bg-blue-50/80 px-3.5 py-3 text-sm leading-relaxed text-blue-900 ${className}`}
      role="note"
    >
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
        aria-hidden="true"
      >
        i
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
