import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceLabel } from "@/components/PriceLabel";
import { PublicServiceTaxFromBusiness } from "@/components/PublicServiceTaxProvider";
import { formatServiceMoneyCents } from "@/lib/serviceCurrency";
import { buildTaxPricePreview } from "@/lib/serviceTaxDisplay";
import { formatServiceMoney } from "@/components/admin/services/serviceHelpers";
import { mockBookingService } from "@/test/mock-fixtures";

describe("service currency formatting", () => {
  it("formats RUB with the ruble sign", () => {
    expect(formatServiceMoneyCents(5000, "RUB")).toBe("₽50.00");
    expect(formatServiceMoney(5000, "RUB")).toBe("₽50");
    expect(formatServiceMoneyCents(5000, "USD")).toBe("$50.00");
  });

  it("shows RUB on PriceLabel when business service_currency is RUB", () => {
    render(
      <PublicServiceTaxFromBusiness
        business={{
          service_currency: "RUB",
          tax_mode: "none",
          tax_rate_percent: 0,
          show_tax_note_to_customers: false,
        }}
      >
        <PriceLabel service={{ ...mockBookingService, currency: "USD" }} />
      </PublicServiceTaxFromBusiness>,
    );
    expect(screen.getByTestId("price-label")).toHaveTextContent("₽50.00");
    expect(screen.getByTestId("price-label")).not.toHaveTextContent("$50.00");
  });

  it("formats exclusive tax totals with selected currency", () => {
    expect(
      buildTaxPricePreview({
        taxMode: "exclusive",
        taxRatePercent: 10,
        showTaxNote: true,
        exampleCents: 5000,
        currency: "RUB",
      }),
    ).toBe("Example: ₽50.00 + 10% tax · total ₽55.00");
  });
});
