import type { PublicService } from "@/types/api";
import { formatServiceMoneyCents, normalizeServiceCurrency } from "@/lib/serviceCurrency";
import { formatPrice } from "@/utils/format";

export type ServiceTaxMode = "none" | "inclusive" | "exclusive";

export type ServiceTaxDisplay = {
  taxMode: ServiceTaxMode;
  taxRatePercent: number;
  showTaxNote: boolean;
};

export function normalizeServiceTaxMode(value: unknown): ServiceTaxMode {
  if (value === "inclusive" || value === "exclusive" || value === "none") {
    return value;
  }
  return "none";
}

export function taxDisplayFromBusiness(business: {
  tax_mode?: string | null;
  tax_rate_percent?: number | null;
  show_tax_note_to_customers?: boolean | null;
} | null | undefined): ServiceTaxDisplay {
  return {
    taxMode: normalizeServiceTaxMode(business?.tax_mode),
    taxRatePercent: Number(business?.tax_rate_percent ?? 0) || 0,
    showTaxNote: business?.show_tax_note_to_customers !== false,
  };
}

export function formatMoneyCents(cents: number, currency: string): string {
  return formatServiceMoneyCents(cents, normalizeServiceCurrency(currency), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTaxPercentLabel(rate: number): string {
  if (Number.isInteger(rate)) {
    return String(rate);
  }
  return String(Math.round(rate * 100) / 100);
}

/** Example preview line for Settings → Services tax editor. */
export function buildTaxPricePreview(input: {
  taxMode: ServiceTaxMode;
  taxRatePercent: number;
  showTaxNote: boolean;
  exampleCents?: number;
  currency?: string;
}): string {
  const exampleCents = input.exampleCents ?? 5000;
  const currency = input.currency || "USD";
  const base = formatMoneyCents(exampleCents, currency);
  const rate = Number.isFinite(input.taxRatePercent) ? input.taxRatePercent : 0;
  const rateLabel = formatTaxPercentLabel(rate);

  if (input.taxMode === "none" || rate <= 0) {
    return `Example: ${base}`;
  }

  if (input.taxMode === "inclusive") {
    if (!input.showTaxNote) {
      return `Example: ${base}`;
    }
    return `Example: ${base} · includes ${rateLabel}% tax`;
  }

  const totalCents = Math.round(exampleCents * (1 + rate / 100));
  const total = formatMoneyCents(totalCents, currency);
  if (!input.showTaxNote) {
    return `Example: ${base}`;
  }
  return `Example: ${base} + ${rateLabel}% tax · total ${total}`;
}

export function buildServiceTaxNote(
  service: Pick<PublicService, "price_type" | "price_cents" | "currency">,
  tax: ServiceTaxDisplay | null | undefined,
): string | null {
  if (!tax || tax.taxMode === "none" || !tax.showTaxNote) {
    return null;
  }
  if (service.price_type !== "fixed" || service.price_cents == null) {
    return null;
  }
  const rate = tax.taxRatePercent;
  if (!(rate > 0)) {
    return null;
  }
  const rateLabel = formatTaxPercentLabel(rate);
  if (tax.taxMode === "inclusive") {
    return `Includes ${rateLabel}% tax`;
  }
  const total = formatMoneyCents(
    Math.round(service.price_cents * (1 + rate / 100)),
    service.currency || "USD",
  );
  return `+ ${rateLabel}% tax · total ${total} (tax added at checkout)`;
}

export function formatServicePricePrimary(
  service: Pick<PublicService, "price_type" | "price_cents" | "currency">,
): string {
  return formatPrice(service);
}
