import {
  MARKETPLACE_SORT_OPTIONS,
  type MarketplaceSort,
} from "@/data/marketplaceCategories";

const MARKETPLACE_SORT_VALUES = new Set(
  MARKETPLACE_SORT_OPTIONS.map((option) => option.value),
);

export function parseMarketplaceSort(value: string | null): MarketplaceSort {
  if (value && MARKETPLACE_SORT_VALUES.has(value as MarketplaceSort)) {
    return value as MarketplaceSort;
  }
  return "popular";
}

export function setMarketplaceSortParam(params: URLSearchParams, sort: MarketplaceSort): void {
  if (sort === "popular") {
    params.delete("sort");
  } else {
    params.set("sort", sort);
  }
}
