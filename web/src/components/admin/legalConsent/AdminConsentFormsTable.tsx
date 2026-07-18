import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  consentRateLabel,
  formatConsentDate,
  type DerivedConsentForm,
} from "@/components/admin/legalConsent/legalConsentHelpers";

type AdminConsentFormsTableProps = {
  forms: DerivedConsentForm[];
  totalConsents: number;
  selectedFormId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (formId: string) => void;
  onPreview: (form: DerivedConsentForm) => void;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};

export function AdminConsentFormsTable({
  forms,
  totalConsents,
  selectedFormId,
  search,
  onSearchChange,
  onSelect,
  onPreview,
}: AdminConsentFormsTableProps) {
  const [menuFormId, setMenuFormId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRootRef.current) return;
      if (!menuRootRef.current.contains(event.target as Node)) {
        setMenuFormId(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useLayoutEffect(() => {
    if (!menuFormId) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = menuButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menuPanelRef.current?.offsetHeight || 88;
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
  }, [menuFormId]);

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-consent-forms-table"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search consent forms</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search forms…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          />
        </label>
      </div>

      {forms.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-800">No consent forms match your search</p>
          <p className="mt-1 text-xs text-gray-500">
            Platform consent forms appear here from recorded acceptances.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Form name
                </th>
                <th scope="col" className="px-4 py-3">
                  Version
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Required
                </th>
                <th scope="col" className="px-4 py-3">
                  Last updated
                </th>
                <th scope="col" className="px-4 py-3">
                  Consents
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((form) => {
                const selected = form.id === selectedFormId;
                const menuOpen = menuFormId === form.id;
                return (
                  <tr
                    key={form.id}
                    className={selected ? "bg-emerald-50/40" : "bg-white hover:bg-gray-50/80"}
                    data-testid="admin-consent-form-row"
                    data-form-id={form.id}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSelect(form.id)}
                        className="text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      >
                        <p className="font-semibold text-gray-900">{form.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{form.helper}</p>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                      {form.version}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={form.status === "published" ? "Published" : "Draft"}
                        tone={form.status === "published" ? "emerald" : "slate"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={form.required ? "Required" : "Optional"}
                        tone={form.required ? "emerald" : "gray"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatConsentDate(form.lastAcceptedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                      {consentRateLabel(form.consentCount, totalConsents)}
                    </td>
                    <td className="overflow-visible px-4 py-3">
                      <div
                        className="relative flex items-center justify-end gap-1.5"
                        ref={menuOpen ? menuRootRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(form.id)}
                          className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                          data-testid="admin-consent-form-view"
                        >
                          View
                        </button>
                        <div className="relative shrink-0">
                          <button
                            ref={menuOpen ? menuButtonRef : undefined}
                            type="button"
                            onClick={() => setMenuFormId(menuOpen ? null : form.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                            aria-label={`More actions for ${form.name}`}
                            aria-expanded={menuOpen}
                            data-testid="admin-consent-form-actions-menu"
                          >
                            ⋮
                          </button>
                          {menuOpen ? (
                            <div
                              ref={menuPanelRef}
                              className={
                                menuPosition
                                  ? "fixed z-40 min-w-[10rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                                  : "absolute right-0 top-full z-40 mt-1 min-w-[10rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
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
                              data-testid="admin-consent-form-actions-menu-panel"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuFormId(null);
                                  onPreview(form);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                data-testid="admin-consent-form-preview"
                              >
                                Preview
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "slate" | "gray";
}) {
  const classes =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : tone === "slate"
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-gray-100 text-gray-600 ring-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${classes}`}
    >
      {label}
    </span>
  );
}
