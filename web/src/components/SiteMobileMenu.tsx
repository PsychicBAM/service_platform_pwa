import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type SiteMobileMenuButtonProps = {
  menuOpen: boolean;
  menuId: string;
  onOpen: () => void;
  testId?: string;
};

export function SiteMobileMenuButton({
  menuOpen,
  menuId,
  onOpen,
  testId = "site-mobile-menu-button",
}: SiteMobileMenuButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:hidden"
      aria-label="Open menu"
      aria-expanded={menuOpen}
      aria-controls={menuId}
      data-testid={testId}
      onClick={onOpen}
    >
      <span className="flex flex-col gap-1.5" aria-hidden="true">
        <span className="block h-0.5 w-5 rounded bg-slate-700" />
        <span className="block h-0.5 w-5 rounded bg-slate-700" />
        <span className="block h-0.5 w-5 rounded bg-slate-700" />
      </span>
    </button>
  );
}

type SiteMobileMenuDrawerProps = {
  open: boolean;
  menuId: string;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  testIdPrefix?: string;
};

/**
 * Fixed right-side mobile drawer with backdrop, Escape, and body scroll lock.
 */
export function SiteMobileMenuDrawer({
  open,
  menuId,
  onClose,
  children,
  title = "Menu",
  testIdPrefix = "site-mobile-menu",
}: SiteMobileMenuDrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="md:hidden" data-testid={`${testIdPrefix}-layer`}>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-slate-900/40"
        aria-label="Close menu backdrop"
        data-testid={`${testIdPrefix}-backdrop`}
        onClick={onClose}
      />
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="fixed inset-y-0 right-0 z-[70] flex w-[min(80vw,360px)] max-w-full flex-col bg-white shadow-xl"
        data-testid={testIdPrefix}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-xl leading-none text-slate-700 hover:bg-slate-50"
            aria-label="Close menu"
            data-testid={`${testIdPrefix}-close`}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <nav
          aria-label="Mobile"
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm font-medium text-slate-700"
        >
          {children}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

export const siteMobileMenuLinkClass =
  "inline-flex min-h-11 items-center rounded-lg px-3 py-2.5 hover:bg-slate-50";
