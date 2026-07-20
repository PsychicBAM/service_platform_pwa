import { createContext, useContext, type ReactNode } from "react";
import { normalizeServiceCurrency } from "@/lib/serviceCurrency";
import {
  taxDisplayFromBusiness,
  type ServiceTaxDisplay,
} from "@/lib/serviceTaxDisplay";

type PublicServicePricingContextValue = {
  tax: ServiceTaxDisplay | null;
  displayCurrency: string | null;
};

const PublicServicePricingContext = createContext<PublicServicePricingContextValue>({
  tax: null,
  displayCurrency: null,
});

export function PublicServiceTaxProvider({
  tax,
  displayCurrency = null,
  children,
}: {
  tax: ServiceTaxDisplay | null;
  displayCurrency?: string | null;
  children: ReactNode;
}) {
  return (
    <PublicServicePricingContext.Provider
      value={{
        tax,
        displayCurrency: displayCurrency
          ? normalizeServiceCurrency(displayCurrency)
          : null,
      }}
    >
      {children}
    </PublicServicePricingContext.Provider>
  );
}

export function PublicServiceTaxFromBusiness({
  business,
  children,
}: {
  business:
    | {
        service_currency?: string | null;
        tax_mode?: string | null;
        tax_rate_percent?: number | null;
        show_tax_note_to_customers?: boolean | null;
      }
    | null
    | undefined;
  children: ReactNode;
}) {
  return (
    <PublicServiceTaxProvider
      tax={taxDisplayFromBusiness(business)}
      displayCurrency={business?.service_currency ?? null}
    >
      {children}
    </PublicServiceTaxProvider>
  );
}

export function usePublicServiceTax(): ServiceTaxDisplay | null {
  return useContext(PublicServicePricingContext).tax;
}

export function usePublicServiceDisplayCurrency(): string | null {
  return useContext(PublicServicePricingContext).displayCurrency;
}
