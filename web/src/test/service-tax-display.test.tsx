import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceLabel } from "@/components/PriceLabel";
import { PublicServiceTaxProvider } from "@/components/PublicServiceTaxProvider";
import {
  buildServiceTaxNote,
  buildTaxPricePreview,
} from "@/lib/serviceTaxDisplay";
import { mockBookingService } from "@/test/mock-fixtures";

describe("service tax display", () => {
  it("builds settings preview for each tax mode", () => {
    expect(
      buildTaxPricePreview({
        taxMode: "none",
        taxRatePercent: 0,
        showTaxNote: true,
      }),
    ).toBe("Example: $50.00");

    expect(
      buildTaxPricePreview({
        taxMode: "inclusive",
        taxRatePercent: 10,
        showTaxNote: true,
      }),
    ).toBe("Example: $50.00 · includes 10% tax");

    expect(
      buildTaxPricePreview({
        taxMode: "exclusive",
        taxRatePercent: 10,
        showTaxNote: true,
      }),
    ).toBe("Example: $50.00 + 10% tax · total $55.00");
  });

  it("builds public tax notes without changing base price", () => {
    expect(
      buildServiceTaxNote(mockBookingService, {
        taxMode: "none",
        taxRatePercent: 10,
        showTaxNote: true,
      }),
    ).toBeNull();

    expect(
      buildServiceTaxNote(mockBookingService, {
        taxMode: "inclusive",
        taxRatePercent: 10,
        showTaxNote: true,
      }),
    ).toBe("Includes 10% tax");

    expect(
      buildServiceTaxNote(mockBookingService, {
        taxMode: "exclusive",
        taxRatePercent: 10,
        showTaxNote: true,
      }),
    ).toMatch(/\+ 10% tax · total \$55\.00/);
  });

  it("renders PriceLabel tax note from context", () => {
    render(
      <PublicServiceTaxProvider
        tax={{ taxMode: "inclusive", taxRatePercent: 12, showTaxNote: true }}
      >
        <PriceLabel service={mockBookingService} />
      </PublicServiceTaxProvider>,
    );

    expect(screen.getByTestId("price-label")).toHaveTextContent("$50.00");
    expect(screen.getByTestId("price-label-tax-note")).toHaveTextContent("Includes 12% tax");
  });

  it("hides tax note when showTaxNote is false", () => {
    render(
      <PublicServiceTaxProvider
        tax={{ taxMode: "exclusive", taxRatePercent: 10, showTaxNote: false }}
      >
        <PriceLabel service={mockBookingService} />
      </PublicServiceTaxProvider>,
    );

    expect(screen.getByTestId("price-label")).toHaveTextContent("$50.00");
    expect(screen.queryByTestId("price-label-tax-note")).not.toBeInTheDocument();
  });
});
