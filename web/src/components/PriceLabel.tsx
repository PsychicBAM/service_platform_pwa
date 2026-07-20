import type { PublicService } from "@/types/api";
import {
  usePublicServiceDisplayCurrency,
  usePublicServiceTax,
} from "@/components/PublicServiceTaxProvider";
import { normalizeServiceCurrency } from "@/lib/serviceCurrency";
import {
  buildServiceTaxNote,
  formatServicePricePrimary,
  type ServiceTaxDisplay,
} from "@/lib/serviceTaxDisplay";

type PriceLabelProps = {
  service: Pick<PublicService, "price_type" | "price_cents" | "currency">;
  className?: string;
  tax?: ServiceTaxDisplay | null;
  currency?: string | null;
};

export function PriceLabel({ service, className = "", tax, currency }: PriceLabelProps) {
  const contextTax = usePublicServiceTax();
  const contextCurrency = usePublicServiceDisplayCurrency();
  const effectiveTax = tax === undefined ? contextTax : tax;
  const displayCurrency = normalizeServiceCurrency(
    currency || contextCurrency || service.currency || "USD",
  );
  const pricedService = { ...service, currency: displayCurrency };
  const label = formatServicePricePrimary(pricedService);
  const isQuote =
    service.price_type === "quote" || (service.price_type === "fixed" && service.price_cents == null);
  const taxNote = buildServiceTaxNote(pricedService, effectiveTax);

  return (
    <span
      className={`inline-flex max-w-full flex-col gap-0.5 text-sm font-semibold ${
        service.price_type === "free"
          ? "text-emerald-700"
          : isQuote
            ? "text-amber-700"
            : "text-slate-900"
      } ${className}`}
      data-testid="price-label"
    >
      <span>{isQuote && label === "Quote" ? "Price on quote" : label}</span>
      {taxNote ? (
        <span
          className="text-xs font-medium leading-snug text-slate-500"
          data-testid="price-label-tax-note"
        >
          {taxNote}
        </span>
      ) : null}
    </span>
  );
}
