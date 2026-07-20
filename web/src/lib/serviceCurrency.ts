/** Shared formatter for business service prices (not SaaS plan prices). */

const CURRENCY_PREFIX: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  RUB: "₽",
  CAD: "C$",
  AUD: "A$",
  SAR: "SAR ",
  AED: "AED ",
};

export function normalizeServiceCurrency(value: unknown): string {
  if (typeof value !== "string") {
    return "USD";
  }
  const code = value.trim().toUpperCase();
  return code.length === 3 ? code : "USD";
}

export function formatServiceMoneyCents(
  cents: number,
  currency: string,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  const code = normalizeServiceCurrency(currency);
  const amount = cents / 100;
  const maxFrac =
    options?.maximumFractionDigits ?? (Number.isInteger(amount) ? 2 : 2);
  const minFrac = options?.minimumFractionDigits ?? maxFrac;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(amount);

  const prefix = CURRENCY_PREFIX[code];
  if (prefix) {
    return `${prefix}${formattedAmount}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    }).format(amount);
  } catch {
    return `${code} ${formattedAmount}`;
  }
}
