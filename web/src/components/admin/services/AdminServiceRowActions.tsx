import { useLayoutEffect, useRef, useState } from "react";
import type { AdminServiceRead } from "@/types/api";

type AdminServiceRowActionsProps = {
  service: AdminServiceRead;
  submitting: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onView: () => void;
  onEdit: () => void;
  onViewWaitlist: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

const actionBtn =
  "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60";

const menuItemBtn =
  "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};

export function AdminServiceRowActions({
  service,
  submitting,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onView,
  onEdit,
  onViewWaitlist,
  onToggleActive,
  onDelete,
}: AdminServiceRowActionsProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const showWaitlist = service.type === "booking" && Boolean(service.waitlist_enabled);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = menuButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 180;
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
        className={`${actionBtn} border border-gray-200 bg-white text-emerald-700 hover:bg-emerald-50`}
        onClick={onView}
        disabled={submitting}
      >
        View
      </button>
      <button
        ref={menuButtonRef}
        type="button"
        className={`${actionBtn} w-8 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
        aria-label="Service actions"
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
        disabled={submitting}
      >
        ⋮
      </button>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          aria-label="Close menu"
          onClick={onCloseMenu}
        />
      ) : null}
      <div
        ref={menuRef}
        className={`fixed z-50 min-w-[11rem] rounded-xl border border-gray-200 bg-white p-1 shadow-lg ${
          menuOpen && menuPosition ? "" : "hidden"
        }`}
        style={
          menuOpen && menuPosition
            ? {
                top: menuPosition.top,
                bottom: menuPosition.bottom,
                right: menuPosition.right,
              }
            : undefined
        }
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className={menuItemBtn}
          onClick={() => {
            onEdit();
            onCloseMenu();
          }}
          disabled={submitting}
          data-testid={`admin-service-edit-${service.id}`}
        >
          Edit
        </button>
        {showWaitlist ? (
          <button
            type="button"
            role="menuitem"
            className={menuItemBtn}
            onClick={() => {
              onViewWaitlist();
              onCloseMenu();
            }}
            disabled={submitting}
            data-testid={`admin-service-view-waitlist-${service.id}`}
          >
            View waitlist
          </button>
        ) : null}
        <button
          type="button"
          role="menuitem"
          className={menuItemBtn}
          onClick={() => {
            onToggleActive();
            onCloseMenu();
          }}
          disabled={submitting}
          data-testid={`admin-service-toggle-${service.id}`}
        >
          {service.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${menuItemBtn} text-red-700`}
          onClick={() => {
            onDelete();
            onCloseMenu();
          }}
          disabled={submitting}
          data-testid={`admin-service-delete-${service.id}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
