import type { FormEvent } from "react";
import {
  DAY_NAMES,
  type ScheduleEntryType,
} from "@/components/admin/schedule/scheduleHelpers";

export type SchedulePanelForm = {
  type: ScheduleEntryType;
  date: string;
  startTime: string;
  endTime: string;
  breakRepeat: "weekday" | "everyday";
  notes: string;
};

type AdminSchedulePanelProps = {
  mode: "create" | "edit";
  form: SchedulePanelForm;
  submitting: boolean;
  error?: string | null;
  /** Optional title override (e.g. “Add working hours”). */
  title?: string;
  /** Extra status line shown above the type helper (e.g. closed weekday hint). */
  statusHint?: string | null;
  /** True when editing a weekly available / working-hours block. */
  editingAvailable?: boolean;
  /** True when editing a break or blocked entry that can be deleted. */
  canDeleteOverride?: boolean;
  onChange: (next: SchedulePanelForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onDeleteOverride?: () => void;
  onCloseWeekday?: () => void;
};

const TYPE_OPTIONS: Array<{
  value: ScheduleEntryType;
  label: string;
  testId: string;
}> = [
  { value: "available", label: "Available", testId: "admin-schedule-type-available" },
  { value: "blocked", label: "Blocked", testId: "admin-schedule-type-blocked" },
  { value: "break", label: "Break", testId: "admin-schedule-type-break" },
  { value: "closed", label: "Closed day", testId: "admin-schedule-type-closed" },
];

function helperText(type: ScheduleEntryType, weekdayLabel: string): string {
  switch (type) {
    case "available":
      return `Updates weekly working hours for this weekday (${weekdayLabel}).`;
    case "break":
      return "Creates a break inside working hours.";
    case "blocked":
      return "Blocks this date/time from booking.";
    case "closed":
      return "This will remove working hours for this weekday.";
  }
}

export function AdminSchedulePanel({
  mode,
  form,
  submitting,
  error,
  title,
  statusHint = null,
  editingAvailable = false,
  canDeleteOverride = false,
  onChange,
  onCancel,
  onSubmit,
  onDeleteOverride,
  onCloseWeekday,
}: AdminSchedulePanelProps) {
  const weekday = form.date ? new Date(`${form.date}T12:00:00`).getDay() : null;
  const weekdayLabel = weekday != null ? DAY_NAMES[weekday] : "selected weekday";
  const isClosed = form.type === "closed";
  const heading =
    title ?? (mode === "create" ? "Add schedule" : "Edit schedule");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <aside
      className="h-fit rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-schedule-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{heading}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Manage availability, breaks, blocked times, or close a weekday.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-sm text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 px-4 py-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Date</span>
          <input
            type="date"
            required
            value={form.date}
            disabled={submitting}
            onChange={(event) => onChange({ ...form, date: event.target.value })}
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
            data-testid="admin-schedule-date-input"
          />
        </label>

        {!isClosed ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Start time</span>
              <input
                type="time"
                required
                value={form.startTime}
                disabled={submitting}
                onChange={(event) => onChange({ ...form, startTime: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
                data-testid="admin-schedule-start-time"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">End time</span>
              <input
                type="time"
                required
                value={form.endTime}
                disabled={submitting}
                onChange={(event) => onChange({ ...form, endTime: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
                data-testid="admin-schedule-end-time"
              />
            </label>
          </div>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">Type</legend>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(({ value, label, testId }) => {
              const active = form.type === value;
              return (
                <label
                  key={value}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    active
                      ? value === "closed"
                        ? "border-slate-700 bg-slate-100 text-slate-800"
                        : "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule-type"
                    value={value}
                    checked={active}
                    disabled={submitting}
                    onChange={() => onChange({ ...form, type: value })}
                    className="accent-emerald-600"
                    data-testid={testId}
                  />
                  {label}
                </label>
              );
            })}
          </div>
          {statusHint ? (
            <p
              className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"
              data-testid="admin-schedule-status-hint"
            >
              {statusHint}
            </p>
          ) : null}
          <p
            className={`rounded-xl px-3 py-2 text-xs ${
              isClosed
                ? "bg-slate-100 text-slate-700"
                : form.type === "available"
                  ? "bg-emerald-50 text-emerald-800"
                  : form.type === "break"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-slate-50 text-slate-600"
            }`}
            data-testid="admin-schedule-type-helper"
          >
            {helperText(form.type, weekdayLabel)}
          </p>
        </fieldset>

        {form.type === "break" ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Repeat</span>
            <select
              value={form.breakRepeat}
              disabled={submitting}
              onChange={(event) =>
                onChange({
                  ...form,
                  breakRepeat: event.target.value as SchedulePanelForm["breakRepeat"],
                })
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
              data-testid="admin-schedule-repeat"
            >
              <option value="weekday">Weekly on {weekdayLabel}</option>
              <option value="everyday">Every day</option>
            </select>
          </label>
        ) : null}

        {!isClosed ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Notes (optional)</span>
            <textarea
              value={form.notes}
              disabled={submitting}
              rows={3}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
              data-testid="admin-schedule-notes"
              placeholder={
                form.type === "break"
                  ? "Break label"
                  : form.type === "blocked"
                    ? "Reason for block"
                    : "Optional note"
              }
            />
          </label>
        ) : null}

        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {canDeleteOverride && onDeleteOverride ? (
            <button
              type="button"
              onClick={onDeleteOverride}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:opacity-60"
              data-testid="admin-schedule-delete-override"
            >
              Delete
            </button>
          ) : null}
          {editingAvailable && onCloseWeekday ? (
            <button
              type="button"
              onClick={onCloseWeekday}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
              data-testid="admin-schedule-close-weekday"
            >
              Close this weekday
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="ml-auto inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
            data-testid="admin-schedule-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60"
            data-testid="admin-schedule-create"
          >
            {submitting
              ? "Saving…"
              : isClosed
                ? "Close weekday"
                : mode === "create"
                  ? "Create schedule"
                  : "Save changes"}
          </button>
        </div>
      </form>
    </aside>
  );
}
