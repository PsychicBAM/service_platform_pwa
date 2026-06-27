import type { PublicService } from "@/types/api";

export function formatPrice(service: Pick<PublicService, "price_type" | "price_cents" | "currency">): string {
  if (service.price_type === "free") {
    return "Free";
  }
  if (service.price_type === "quote") {
    return "Quote";
  }
  if (service.price_cents == null) {
    return "Quote";
  }
  const currency = service.currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(service.price_cents / 100);
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
