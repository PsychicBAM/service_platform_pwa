import type { ReactNode } from "react";
import {
  DAY_SHORT,
  HOUR_END,
  HOUR_START,
  PX_PER_HOUR,
  eventTone,
  formatHourLabel,
  toDayKey,
  type ScheduleEvent,
  type ScheduleEventKind,
} from "@/components/admin/schedule/scheduleHelpers";

type AdminScheduleCalendarGridProps = {
  weekDays: Date[];
  events: ScheduleEvent[];
  now?: Date;
  visibleKinds: Set<ScheduleEventKind>;
  onSelectEvent?: (event: ScheduleEvent) => void;
  /** Compact week navigation rendered inside the calendar card. */
  toolbar?: ReactNode;
};

const LEGEND: Array<{ kind: ScheduleEventKind; label: string; dot: string }> = [
  { kind: "available", label: "Available", dot: "bg-emerald-500" },
  { kind: "booked", label: "Booked", dot: "bg-sky-500" },
  { kind: "service", label: "Service", dot: "bg-violet-500" },
  { kind: "blocked", label: "Blocked", dot: "bg-slate-400" },
  { kind: "exception", label: "Exception", dot: "bg-amber-500" },
];

/** Shared by header + body so day columns always match. */
const SCHEDULE_COLS = "56px repeat(7, minmax(0, 1fr))" as const;

export function AdminScheduleCalendarGrid({
  weekDays,
  events,
  now = new Date(),
  visibleKinds,
  onSelectEvent,
  toolbar,
}: AdminScheduleCalendarGridProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index);
  const gridHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;
  const todayKey = toDayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow =
    nowMinutes >= HOUR_START * 60 &&
    nowMinutes <= HOUR_END * 60 &&
    weekDays.some((day) => toDayKey(day) === todayKey);

  const usedKinds = new Set(events.map((event) => event.kind));
  const legendItems = LEGEND.filter(
    (item) => usedKinds.has(item.kind) || visibleKinds.has(item.kind),
  );

  const filteredEvents = events.filter((event) => visibleKinds.has(event.kind));

  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-schedule-calendar"
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4">
          {toolbar}
        </div>
      ) : null}

      {/* One scroll wrapper; header + body share the same column template and min-width. */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="grid"
            style={{ gridTemplateColumns: SCHEDULE_COLS }}
          >
            <div className="border-b border-r border-gray-100 bg-white px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              All-day
            </div>
            {weekDays.map((day) => {
              const key = toDayKey(day);
              const isToday = key === todayKey;
              return (
                <div
                  key={`head-${key}`}
                  className={`border-b border-r border-gray-100 bg-white px-2 py-3 text-center last:border-r-0 ${
                    isToday ? "bg-emerald-50/80" : ""
                  }`}
                  data-testid="admin-schedule-day-column"
                  data-day={key}
                >
                  <p
                    className={`text-xs font-semibold ${
                      isToday ? "text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {DAY_SHORT[day.getDay()]}{" "}
                    {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{ gridTemplateColumns: SCHEDULE_COLS, height: gridHeight }}
          >
            <div className="relative border-r border-gray-100">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-0 left-0 border-b border-gray-50 pr-2 text-right text-[11px] text-gray-400"
                  style={{ top: (hour - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
                  data-testid="admin-schedule-time-row"
                  data-hour={hour}
                >
                  <span className="-translate-y-1/2 inline-block">{formatHourLabel(hour)}</span>
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const key = toDayKey(day);
              const isToday = key === todayKey;
              const dayEvents = filteredEvents.filter((event) => event.dayKey === key);

              return (
                <div
                  key={`body-${key}`}
                  className={`relative border-r border-gray-100 last:border-r-0 ${
                    isToday ? "bg-emerald-50/20" : ""
                  }`}
                >
                  {hours.map((hour) => (
                    <div
                      key={`${key}-${hour}`}
                      className="absolute inset-x-0 border-b border-gray-50"
                      style={{ top: (hour - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
                    />
                  ))}

                  {dayEvents.map((event) => {
                    const top = ((event.startMinutes - HOUR_START * 60) / 60) * PX_PER_HOUR;
                    const height = Math.max(
                      22,
                      ((event.endMinutes - event.startMinutes) / 60) * PX_PER_HOUR - 4,
                    );
                    if (
                      event.endMinutes <= HOUR_START * 60 ||
                      event.startMinutes >= HOUR_END * 60
                    ) {
                      return null;
                    }
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent?.(event)}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${eventTone(event.kind)}`}
                        style={{ top: Math.max(0, top) + 2, height }}
                        data-testid="admin-schedule-event"
                        data-event-kind={event.kind}
                        title={`${event.title} · ${event.subtitle ?? ""}`}
                      >
                        <span className="block truncate text-[11px] font-semibold leading-tight">
                          {event.title}
                        </span>
                        {event.subtitle ? (
                          <span className="mt-0.5 block truncate text-[10px] opacity-80">
                            {event.subtitle}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {showNow ? (
              <div
                className="pointer-events-none absolute right-0 left-[56px] z-10"
                style={{ top: ((nowMinutes - HOUR_START * 60) / 60) * PX_PER_HOUR }}
                aria-hidden="true"
              >
                <div className="relative border-t-2 border-rose-500">
                  <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-rose-500" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div
          className="border-t border-gray-100 px-4 py-8 text-center"
          data-testid="admin-schedule-empty-state"
        >
          <p className="text-sm font-medium text-gray-800">No schedule items this week</p>
          <p className="mt-1 text-xs text-gray-500">
            Add availability, breaks, or blocked times, or wait for bookings to appear.
          </p>
        </div>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-3"
        data-testid="admin-schedule-legend"
      >
        {legendItems.map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
