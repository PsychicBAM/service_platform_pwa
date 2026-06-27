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
