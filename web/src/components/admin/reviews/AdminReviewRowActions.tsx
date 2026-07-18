import { useLayoutEffect, useRef, useState } from "react";
import type { ReviewRead, ReviewStatus } from "@/types/api";

type AdminReviewRowActionsProps = {
  review: ReviewRead;
  acting: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onView: () => void;
  onRequestStatusChange: (status: ReviewStatus) => void;
};

const actionBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60";

const menuItemBtn =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};

export function AdminReviewRowActions({
  review,
  acting,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onView,
  onRequestStatusChange,
}: AdminReviewRowActionsProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = menuButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 88;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      const right = Math.max(8, window.innerWidth - rect.right);
      if (openUpward) {
        setMenuPosition({
          right,
          bottom: Math.max(8, window.innerHeight - rect.top + gap),
        });
      } else {
        setMenuPosition({
          right,
          top: Math.min(window.innerHeight - menuHeight - 8, rect.bottom + gap),
        });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  return (
    <div className="relative ml-auto flex max-w-full items-center justify-end gap-1.5">
      <button
        type="button"
        className={`${actionBtn} border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50`}
        data-testid="admin-review-view"
        onClick={onView}
      >
        View
      </button>

      <div className="relative shrink-0">
        <button
          ref={menuButtonRef}
          type="button"
          className={`${actionBtn} w-9 border border-gray-200 bg-white px-0 text-gray-600 hover:bg-gray-50`}
          aria-label="More actions"
          aria-expanded={menuOpen}
          data-testid="admin-review-actions-menu"
          onClick={onToggleMenu}
        >
          ▾
        </button>
        {menuOpen ? (
          <div
            ref={menuRef}
            className={
              menuPosition
                ? "fixed z-40 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                : "absolute right-0 top-full z-40 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
            }
            style={
              menuPosition
                ? {
                    top: menuPosition.top,
                    bottom: menuPosition.bottom,
                    right: menuPosition.right,
                  }
                : undefined
            }
            data-testid="admin-review-actions-menu-panel"
          >
            {review.status === "published" ? (
              <button
                type="button"
                className={`${menuItemBtn} text-rose-700 hover:bg-rose-50`}
                data-testid={`admin-review-hide-${review.id}`}
                disabled={acting}
                onClick={() => {
                  onCloseMenu();
                  onRequestStatusChange("hidden");
                }}
              >
                <span data-testid="admin-review-hide">Hide Review</span>
              </button>
            ) : (
              <button
                type="button"
                className={`${menuItemBtn} text-emerald-700 hover:bg-emerald-50`}
                data-testid={`admin-review-publish-${review.id}`}
                disabled={acting}
                onClick={() => {
                  onCloseMenu();
                  onRequestStatusChange("published");
                }}
              >
                <span data-testid="admin-review-publish">Publish Review</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
