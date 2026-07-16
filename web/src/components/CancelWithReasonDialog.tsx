import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export type CancelWithReasonDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function CancelWithReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep",
  reasonLabel = "Reason for cancellation (optional)",
  reasonPlaceholder = "Optional note for the business",
  isLoading = false,
  onConfirm,
  onCancel,
}: CancelWithReasonDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setReason("");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isLoading, onCancel]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" data-testid="cancel-reason-dialog-layer">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog backdrop"
        data-testid="cancel-reason-dialog-backdrop"
        disabled={isLoading}
        onClick={() => {
          if (!isLoading) {
            onCancel();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="absolute inset-x-0 bottom-0 z-[61] rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5"
        data-testid="cancel-reason-dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          {description}
        </p>
        <label htmlFor={reasonId} className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">{reasonLabel}</span>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            disabled={isLoading}
            className="min-h-[5.5rem] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
            data-testid="cancel-reason-dialog-input"
          />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:min-h-0 sm:w-auto"
            data-testid="cancel-reason-dialog-cancel"
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:min-h-0 sm:w-auto"
            data-testid="cancel-reason-dialog-confirm"
            disabled={isLoading}
            onClick={() => onConfirm(reason.trim())}
          >
            {isLoading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
