import type {
  AdminBookingListItem,
  AdminServiceRead,
  ScheduleRead,
  WorkingHourRead,
} from "@/types/api";
import { formatDuration, toTimeInputValue } from "@/utils/format";

export type ScheduleViewTab = "week" | "month" | "list" | "exceptions";
export type ScheduleEntryType = "available" | "blocked" | "break" | "closed";
export type ScheduleEventKind = "available" | "booked" | "service" | "blocked" | "exception";

export type ScheduleEvent = {
  id: string;
  kind: ScheduleEventKind;
  title: string;
  subtitle?: string;
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
  startsAt: Date;
  endsAt: Date;
  serviceName?: string | null;
  metaId?: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const HOUR_START = 8;
export const HOUR_END = 18;
export const PX_PER_HOUR = 56;

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const endFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt.format(weekStart)} – ${endFmt.format(weekEnd)}`;
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
}

export function formatEventTimeRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function parseScheduleTime(value: string | null | undefined, day: Date): Date | null {
  if (!value) return null;
  const hhmm = toTimeInputValue(value);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const next = new Date(day);
  next.setHours(h, m, 0, 0);
  return next;
}

function workingHourForDay(
  workingHours: WorkingHourRead[],
  dayOfWeek: number,
): WorkingHourRead | undefined {
  return workingHours.find((row) => row.day_of_week === dayOfWeek);
}

export function buildWeekEvents(args: {
  weekStart: Date;
  schedule: ScheduleRead;
  bookings: AdminBookingListItem[];
  selectedServiceNames: Set<string> | null;
}): ScheduleEvent[] {
  const { weekStart, schedule, bookings, selectedServiceNames } = args;
  const days = weekDays(weekStart);
  const events: ScheduleEvent[] = [];

  for (const day of days) {
    const dayKey = toDayKey(day);
    const hour = workingHourForDay(schedule.working_hours, day.getDay());
    if (hour?.is_open) {
      const start = parseScheduleTime(hour.opens_at as unknown as string, day);
      const end = parseScheduleTime(hour.closes_at as unknown as string, day);
      if (start && end && start < end) {
        events.push({
          id: `available-${dayKey}`,
          kind: "available",
          title: "Available",
          subtitle: formatEventTimeRange(start, end),
          dayKey,
          startMinutes: minutesFromMidnight(start),
          endMinutes: minutesFromMidnight(end),
          startsAt: start,
          endsAt: end,
          metaId: hour.id,
        });
      }
    }

    for (const item of schedule.breaks) {
      if (item.day_of_week != null && item.day_of_week !== day.getDay()) {
        continue;
      }
      const start = parseScheduleTime(item.starts_at as unknown as string, day);
      const end = parseScheduleTime(item.ends_at as unknown as string, day);
      if (!start || !end || start >= end) continue;
      events.push({
        id: `break-${item.id}-${dayKey}`,
        kind: "exception",
        title: item.label?.trim() || "Break",
        subtitle: formatEventTimeRange(start, end),
        dayKey,
        startMinutes: minutesFromMidnight(start),
        endMinutes: minutesFromMidnight(end),
        startsAt: start,
        endsAt: end,
        metaId: item.id,
      });
    }
  }

  const weekEnd = addDays(weekStart, 7);
  for (const block of schedule.unavailable_times) {
    const start = new Date(block.starts_at);
    const end = new Date(block.ends_at);
    if (end <= weekStart || start >= weekEnd) continue;
    const clampedStart = start < weekStart ? weekStart : start;
    const day = new Date(clampedStart);
    day.setHours(0, 0, 0, 0);
    const dayKey = toDayKey(day);
    const dayEnd = addDays(day, 1);
    const visibleEnd = end > dayEnd ? dayEnd : end;
    const visibleStart = start < day ? day : start;
    if (visibleStart >= visibleEnd) continue;
    events.push({
      id: `blocked-${block.id}-${dayKey}`,
      kind: "blocked",
      title: block.reason?.trim() || "Blocked",
      subtitle: formatEventTimeRange(visibleStart, visibleEnd),
      dayKey,
      startMinutes: minutesFromMidnight(visibleStart),
      endMinutes: Math.min(24 * 60, minutesFromMidnight(visibleEnd) || 24 * 60),
      startsAt: visibleStart,
      endsAt: visibleEnd,
      metaId: block.id,
    });
  }

  for (const booking of bookings) {
    if (selectedServiceNames && !selectedServiceNames.has(booking.service_name)) {
      continue;
    }
    const start = new Date(booking.starts_at);
    const end = new Date(booking.ends_at);
    if (end <= weekStart || start >= weekEnd) continue;
    const dayKey = toDayKey(start);
    events.push({
      id: `booking-${booking.id}`,
      kind: "booked",
      title: booking.service_name || "Booking",
      subtitle: `${formatEventTimeRange(start, end)} · ${booking.client_name}`,
      dayKey,
      startMinutes: minutesFromMidnight(start),
      endMinutes: minutesFromMidnight(end),
      startsAt: start,
      endsAt: end,
      serviceName: booking.service_name,
      metaId: booking.id,
    });

    // Distinct “service” tint for booking-type service activity in the filtered view.
    if (selectedServiceNames && selectedServiceNames.size === 1) {
      events[events.length - 1] = {
        ...events[events.length - 1],
        kind: "service",
      };
    }
  }

  return events.sort((a, b) => a.startMinutes - b.startMinutes || a.title.localeCompare(b.title));
}

export function computeScheduleKpis(args: {
  weekStart: Date;
  events: ScheduleEvent[];
  previousEvents: ScheduleEvent[];
}) {
  const { events, previousEvents } = args;

  const sumHours = (list: ScheduleEvent[], kinds: ScheduleEventKind[]) =>
    list
      .filter((event) => kinds.includes(event.kind))
      .reduce((sum, event) => sum + Math.max(0, event.endMinutes - event.startMinutes) / 60, 0);

  const countSlots = (list: ScheduleEvent[], kinds: ScheduleEventKind[]) =>
    list.filter((event) => kinds.includes(event.kind)).length;

  const totalHours = sumHours(events, ["available"]);
  const blockedHours = sumHours(events, ["blocked", "exception"]);
  const availableSlots = countSlots(events, ["available"]);
  const bookedSlots = countSlots(events, ["booked", "service"]);
  const utilization =
    totalHours > 0 ? Math.round((sumHours(events, ["booked", "service"]) / totalHours) * 100) : 0;

  const prevTotal = sumHours(previousEvents, ["available"]);
  const prevBlocked = sumHours(previousEvents, ["blocked", "exception"]);
  const prevAvailable = countSlots(previousEvents, ["available"]);
  const prevBooked = countSlots(previousEvents, ["booked", "service"]);
  const prevUtil =
    prevTotal > 0
      ? Math.round((sumHours(previousEvents, ["booked", "service"]) / prevTotal) * 100)
      : 0;

  const hoursDelta = (current: number, previous: number) => {
    const delta = Math.round((current - previous) * 10) / 10;
    if (delta === 0) return "No change vs last 7 days";
    return `${delta > 0 ? "+" : ""}${delta}h vs last 7 days`;
  };
  const countDelta = (current: number, previous: number) => {
    const delta = current - previous;
    if (delta === 0) return "No change vs last 7 days";
    return `${delta > 0 ? "+" : ""}${delta} vs last 7 days`;
  };

  return {
    totalHours: `${Math.round(totalHours * 10) / 10}h`,
    availableSlots: String(availableSlots),
    bookedSlots: String(bookedSlots),
    utilization: `${utilization}%`,
    blockedHours: `${Math.round(blockedHours * 10) / 10}h`,
    trends: {
      totalHours: hoursDelta(totalHours, prevTotal),
      availableSlots: countDelta(availableSlots, prevAvailable),
      bookedSlots: countDelta(bookedSlots, prevBooked),
      utilization:
        utilization === prevUtil
          ? "No change vs last 7 days"
          : `${utilization - prevUtil > 0 ? "+" : ""}${utilization - prevUtil}% vs last 7 days`,
      blockedHours: hoursDelta(blockedHours, prevBlocked),
    },
  };
}

export function eventTone(kind: ScheduleEventKind): string {
  switch (kind) {
    case "available":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "booked":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "service":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "blocked":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "exception":
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

export function serviceDurationHelper(service: AdminServiceRead): string {
  if (service.type !== "booking") return "Request";
  return formatDuration(service.duration_minutes) ?? "Booking";
}

export function monthCells(monthAnchor: Date): Date[] {
  const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
