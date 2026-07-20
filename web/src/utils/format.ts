import type { PublicService } from "@/types/api";
import { formatServiceMoneyCents, normalizeServiceCurrency } from "@/lib/serviceCurrency";

export function formatPrice(
  service: Pick<PublicService, "price_type" | "price_cents" | "currency">,
  displayCurrency?: string | null,
): string {
  if (service.price_type === "free") {
    return "Free";
  }
  if (service.price_type === "quote") {
    return "Quote";
  }
  if (service.price_cents == null) {
    return "Quote";
  }
  const currency = normalizeServiceCurrency(displayCurrency || service.currency || "USD");
  return formatServiceMoneyCents(service.price_cents, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainder} min`;
}

export function serviceTypeIcon(type: PublicService["type"]): string {
  return type === "booking" ? "📅" : "📝";
}

export function serviceActionLabel(type: PublicService["type"]): string {
  return type === "booking" ? "View & book" : "View & request";
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(date: Date, dayOffset = 0): string {
  if (dayOffset === 0) {
    return "Today";
  }
  if (dayOffset === 1) {
    return "Tomorrow";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${datePart} at ${formatTimeLabel(iso)}`;
}

export function generateBookingDates(count = 14): Array<{
  date: string;
  label: string;
  dayOffset: number;
}> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dates: Array<{ date: string; label: string; dayOffset: number }> = [];

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    dates.push({
      date: toLocalDateString(date),
      label: formatDateLabel(date, offset),
      dayOffset: offset,
    });
  }

  return dates;
}

export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 5);
}

export function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.toISOString();
}

/** Convert a wall-clock date/time in a business IANA timezone to UTC ISO. */
export function businessLocalDateTimeToIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let candidate = Date.UTC(year, month - 1, day, hour, minute, 0);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    let actualHour = Number(parts.hour);
    if (actualHour === 24) {
      actualHour = 0;
    }
    const actual = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      actualHour,
      Number(parts.minute),
    );
    const diff = desired - actual;
    if (diff === 0) {
      break;
    }
    candidate += diff;
  }

  return new Date(candidate).toISOString();
}

export function formatSlotOverrideListLabel(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
  return `${datePart}, ${timePart}`;
}
