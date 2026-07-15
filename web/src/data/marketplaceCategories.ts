export type MarketplaceCategoryId =
  | "all"
  | "health-wellness"
  | "home-services"
  | "tutors-classes"
  | "coaching-courses"
  | "beauty-salon"
  | "events-photography"
  | "design-creative"
  | "automotive";

export type MarketplaceCategory = {
  id: MarketplaceCategoryId;
  label: string;
  icon: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { id: "all", label: "All Services", icon: "◆" },
  { id: "health-wellness", label: "Health & Wellness", icon: "♡" },
  { id: "home-services", label: "Home Services", icon: "⌂" },
  { id: "tutors-classes", label: "Tutors & Classes", icon: "✎" },
  { id: "coaching-courses", label: "Coaching & Courses", icon: "◎" },
  { id: "beauty-salon", label: "Beauty & Salon", icon: "✿" },
  { id: "events-photography", label: "Events & Photography", icon: "📷" },
  { id: "design-creative", label: "Design & Creative", icon: "◈" },
  { id: "automotive", label: "Automotive", icon: "⚙" },
];

export const MARKETPLACE_SORT_OPTIONS = [
  { value: "popular", label: "Popular" },
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "newest", label: "Newest" },
  { value: "bookable", label: "Bookable first" },
  { value: "name", label: "Name A-Z" },
] as const;

export type MarketplaceSort = (typeof MARKETPLACE_SORT_OPTIONS)[number]["value"];

export const MARKETPLACE_RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
] as const;
