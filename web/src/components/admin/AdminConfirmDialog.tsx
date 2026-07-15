import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type AdminConfirmDialogVariant = "default" | "danger" | "success";

export type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: AdminConfirmDialogVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function confirmButtonClass(variant: AdminConfirmDialogVariant): string {
  if (variant === "danger") {
    return "bg-red-600 text-white hover:bg-red-700 disabled:opacity-60";
  }
  if (variant === "success") {
    return "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60";
  }
  return "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60";
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

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
    <div className="fixed inset-0 z-[60]" data-testid="admin-confirm-dialog-layer">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog backdrop"
        data-testid="admin-confirm-dialog-backdrop"
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
        data-testid="admin-confirm-dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:min-h-0 sm:w-auto"
            data-testid="admin-confirm-dialog-cancel"
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold sm:min-h-0 sm:w-auto ${confirmButtonClass(variant)}`}
            data-testid="admin-confirm-dialog-confirm"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
