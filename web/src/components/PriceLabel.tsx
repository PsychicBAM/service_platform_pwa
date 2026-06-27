import type { PublicService } from "@/types/api";
import { formatPrice } from "@/utils/format";

type PriceLabelProps = {
  service: Pick<PublicService, "price_type" | "price_cents" | "currency">;
  className?: string;
};

export function PriceLabel({ service, className = "" }: PriceLabelProps) {
  const label = formatPrice(service);
  const isQuote = service.price_type === "quote" || (service.price_type === "fixed" && service.price_cents == null);

  return (
    <span
      className={`inline-block text-sm font-semibold ${
        service.price_type === "free"
          ? "text-emerald-700"
          : isQuote
            ? "text-amber-700"
            : "text-slate-900"
      } ${className}`}
    >
      {isQuote && label === "Quote" ? "Price on quote" : label}
    </span>
  );
}
