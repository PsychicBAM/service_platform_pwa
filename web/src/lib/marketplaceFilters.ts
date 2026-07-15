export type MarketplaceSidebarFilters = {
  bookable: boolean;
  requests: boolean;
  reviews: boolean;
  cover: boolean;
};

export const EMPTY_MARKETPLACE_SIDEBAR_FILTERS: MarketplaceSidebarFilters = {
  bookable: false,
  requests: false,
  reviews: false,
  cover: false,
};

export function parseMarketplaceSidebarFilters(
  searchParams: URLSearchParams,
): MarketplaceSidebarFilters {
  return {
    bookable: searchParams.get("bookable") === "true",
    requests: searchParams.get("requests") === "true",
    reviews: searchParams.get("reviews") === "true",
    cover: searchParams.get("cover") === "true",
  };
}

export function hasActiveMarketplaceSidebarFilters(filters: MarketplaceSidebarFilters): boolean {
  return filters.bookable || filters.requests || filters.reviews || filters.cover;
}

export type MarketplaceSidebarFilterKey = keyof MarketplaceSidebarFilters;

export function setMarketplaceSidebarFilterParam(
  params: URLSearchParams,
  key: MarketplaceSidebarFilterKey,
  enabled: boolean,
): void {
  if (enabled) {
    params.set(key, "true");
  } else {
    params.delete(key);
  }
}

export function clearMarketplaceSidebarFilterParams(params: URLSearchParams): void {
  params.delete("bookable");
  params.delete("requests");
  params.delete("reviews");
  params.delete("cover");
}
