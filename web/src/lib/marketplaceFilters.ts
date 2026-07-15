import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_RATING_OPTIONS,
  MARKETPLACE_SORT_OPTIONS,
  type MarketplaceCategoryId,
  type MarketplaceSort,
} from "@/data/marketplaceCategories";

export type MarketplaceSidebarFilters = {
  bookable: boolean;
  requests: boolean;
  reviews: boolean;
  cover: boolean;
};

export type MarketplaceFilterContext = {
  q: string;
  location: string;
  category: MarketplaceCategoryId;
  ratingMin: string;
  sidebarFilters: MarketplaceSidebarFilters;
  sort: MarketplaceSort;
};

export type MarketplaceActiveFilterChip = {
  key: string;
  label: string;
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

export function hasActiveMarketplaceFilters(context: MarketplaceFilterContext): boolean {
  return (
    context.q.trim().length > 0 ||
    context.location.trim().length > 0 ||
    context.category !== "all" ||
    context.ratingMin.length > 0 ||
    hasActiveMarketplaceSidebarFilters(context.sidebarFilters) ||
    context.sort !== "popular"
  );
}

export function getMarketplaceActiveFilterChips(
  context: MarketplaceFilterContext,
): MarketplaceActiveFilterChip[] {
  const chips: MarketplaceActiveFilterChip[] = [];

  const trimmedQuery = context.q.trim();
  if (trimmedQuery) {
    chips.push({ key: "q", label: `Search: ${trimmedQuery}` });
  }

  const trimmedLocation = context.location.trim();
  if (trimmedLocation) {
    chips.push({ key: "location", label: `Location: ${trimmedLocation}` });
  }

  if (context.category !== "all") {
    const categoryLabel =
      MARKETPLACE_CATEGORIES.find((item) => item.id === context.category)?.label ??
      context.category;
    chips.push({ key: "category", label: `Category: ${categoryLabel}` });
  }

  if (context.ratingMin) {
    const ratingLabel =
      MARKETPLACE_RATING_OPTIONS.find((option) => option.value === context.ratingMin)?.label ??
      context.ratingMin;
    chips.push({ key: "rating", label: `Rating: ${ratingLabel}` });
  }

  if (context.sidebarFilters.bookable) {
    chips.push({ key: "bookable", label: "Bookable online" });
  }
  if (context.sidebarFilters.requests) {
    chips.push({ key: "requests", label: "Accepts requests" });
  }
  if (context.sidebarFilters.reviews) {
    chips.push({ key: "reviews", label: "Has reviews" });
  }
  if (context.sidebarFilters.cover) {
    chips.push({ key: "cover", label: "Has cover photo" });
  }

  if (context.sort !== "popular") {
    const sortLabel =
      MARKETPLACE_SORT_OPTIONS.find((option) => option.value === context.sort)?.label ??
      context.sort;
    chips.push({ key: "sort", label: `Sort: ${sortLabel}` });
  }

  return chips;
}

export function clearAllMarketplaceFilterParams(params: URLSearchParams): void {
  params.delete("q");
  params.delete("location");
  params.delete("category");
  params.delete("rating_min");
  clearMarketplaceSidebarFilterParams(params);
  params.delete("sort");
  params.delete("page");
}
